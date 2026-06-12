/* ==========================================================================
   Seating solver
   - Assigns students to tables for a given month
   - Respects:
       * pairwise "together" rules (must sit at same table)
       * pairwise "apart" rules (must NOT sit at same table)
       * tag-driven soft constraints (allergies cluster, access near door)
       * grade-mix preference (each table should have multiple grades)
       * memory: minimize repeats of past tablemates across months
   ========================================================================== */
(function () {
  const { ROOM } = window.Seatery;
  const { capacity: tableCapacity, distanceToDoor: distFromDoor } = window.TableGeom;

  // ------ utilities ------
  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // Remove the inline distanceToDoor — we use TableGeom.distanceToDoor now.
  function _unused_distance(){}

  // history shape: { 'sA|sB': numberOfMonthsSatTogether }
  function buildPastPairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  function pastPairs(history) {
    // history: array of months, each { tableId: [studentIds...] }
    const counts = {};
    history.forEach(month => {
      Object.values(month.assignments || {}).forEach(group => {
        for (let i = 0; i < group.length; i++) {
          for (let j = i+1; j < group.length; j++) {
            const k = buildPastPairKey(group[i], group[j]);
            counts[k] = (counts[k] || 0) + 1;
          }
        }
      });
    });
    return counts;
  }

  // Score a candidate (table, student) pair
  function score(student, table, currentSeats, students, rules, pastCounts, room, tagsIndex) {
    const seated = currentSeats[table.id] || [];
    let s = 0;

    // Hard checks — return -Infinity if violated
    for (const r of rules) {
      if (r.kind === "apart") {
        if ((r.a === student.id && seated.includes(r.b)) ||
            (r.b === student.id && seated.includes(r.a))) {
          return -Infinity;
        }
      }
    }
    // Capacity hard
    if (seated.length >= tableCapacity(table)) return -Infinity;

    // Together rules — big bonus if partner is here, big penalty if partner already at another table
    for (const r of rules) {
      if (r.kind !== "together") continue;
      let partner = null;
      if (r.a === student.id) partner = r.b;
      else if (r.b === student.id) partner = r.a;
      if (!partner) continue;
      if (seated.includes(partner)) s += 50;
      else {
        // partner seated elsewhere?
        for (const tid in currentSeats) {
          if (tid !== table.id && currentSeats[tid].includes(partner)) { s -= 80; break; }
        }
      }
    }

    // Group-mix preference: reward adding a new group, penalize duplicates beyond 3
    const groupCounts = {};
    seated.forEach(sid => {
      const peer = students.find(x => x.id === sid);
      if (peer) groupCounts[peer.group] = (groupCounts[peer.group] || 0) + 1;
    });
    const myCount = groupCounts[student.group] || 0;
    if (myCount === 0) s += 8;
    else if (myCount === 1) s += 2;
    else if (myCount >= 3) s -= 6 * (myCount - 2);

    // Tag preferences — driven by each tag's configured behavior.
    for (const tagId of (student.tags || [])) {
      const def = tagsIndex && tagsIndex[tagId];
      if (!def) continue;
      if (def.behavior === "cluster") {
        // group same-tag peers together — bonus per peer already seated
        const peers = seated.filter(sid => students.find(x=>x.id===sid)?.tags?.includes(tagId)).length;
        s += peers * 6;
      } else if (def.behavior === "spread") {
        // one per table when possible — penalty per same-tag peer here
        const peers = seated.filter(sid => students.find(x=>x.id===sid)?.tags?.includes(tagId)).length;
        s -= peers * 8;
      } else if (def.behavior === "door") {
        // closer to the door is better
        const d = distFromDoor(table, room);
        s += Math.max(0, 12 - d / 80);
      } else if (def.behavior === "front") {
        // closer to the front (top) of the room is better — lower table.y
        s += Math.max(0, 12 - table.y / 80);
      }
    }

    // History — minimize past tablemate repeats
    let repeatPenalty = 0;
    seated.forEach(sid => {
      const k = buildPastPairKey(student.id, sid);
      const count = pastCounts[k] || 0;
      if (count > 0) repeatPenalty += count * 5;
    });
    s -= repeatPenalty;

    // Slight randomness so equal-score tables shuffle
    return s;
  }

  function solve({ students, tables, rules, history = [], seed = Date.now(), tagsIndex, room }) {
    if (!students.length || !tables.length) return { assignments: {}, conflicts: [] };
    const rnd = window.Seatery.mulberry32(seed);
    room = room || ROOM;
    const tagIdx = tagsIndex || window.Seatery.TAGS_INDEX;
    const pastCounts = pastPairs(history);

    // Pre-seed: place together-pairs first so they can find a table early
    const togetherPairs = rules.filter(r => r.kind === "together");
    const order = [];
    const placedFlag = new Set();
    togetherPairs.forEach(r => {
      if (!placedFlag.has(r.a)) { order.push(r.a); placedFlag.add(r.a); }
      if (!placedFlag.has(r.b)) { order.push(r.b); placedFlag.add(r.b); }
    });
    // Then position-seeking needs (door / front) so they claim the best tables first
    const positionFirst = students.filter(s => !placedFlag.has(s.id) &&
      (s.tags || []).some(tg => tagIdx[tg]?.behavior === "door" || tagIdx[tg]?.behavior === "front"));
    positionFirst.forEach(s => { order.push(s.id); placedFlag.add(s.id); });
    // Then everyone else, lightly shuffled
    const rest = shuffle(students.filter(s => !placedFlag.has(s.id)), rnd);
    rest.forEach(s => order.push(s.id));

    // Assignment state
    const seats = {}; // tableId -> [studentId]
    tables.forEach(t => seats[t.id] = []);
    const placedOf = {}; // studentId -> tableId
    const conflicts = []; // list of {studentId, reason}

    for (const sid of order) {
      const student = students.find(x => x.id === sid);
      if (!student) continue;
      let best = null;
      let bestScore = -Infinity;
      // Add tiny random jitter to break ties
      tables.forEach(t => {
        const sc = score(student, t, seats, students, rules, pastCounts, room, tagIdx) + rnd() * 0.5;
        if (sc > bestScore) { bestScore = sc; best = t; }
      });
      if (!best || bestScore === -Infinity) {
        // Fallback: any table with capacity, ignore soft constraints
        const fallback = tables.find(t => (seats[t.id] || []).length < tableCapacity(t));
        if (fallback) {
          seats[fallback.id].push(student.id);
          placedOf[student.id] = fallback.id;
          conflicts.push({ studentId: student.id, reason: "forced placement (no clean seat)"});
        } else {
          conflicts.push({ studentId: student.id, reason: "no seat available — over capacity"});
        }
      } else {
        seats[best.id].push(student.id);
        placedOf[student.id] = best.id;
      }
    }

    return { assignments: seats, placement: placedOf, conflicts };
  }

  // Re-check current assignments for rule violations (used after manual moves)
  function audit({ assignments, students, rules, tables }) {
    const flags = [];
    const placementOf = {};
    Object.entries(assignments).forEach(([tid, ids]) => ids.forEach(id => placementOf[id] = tid));

    rules.forEach(r => {
      const ta = placementOf[r.a]; const tb = placementOf[r.b];
      if (!ta || !tb) return;
      if (r.kind === "apart" && ta === tb) {
        flags.push({ kind: "apart", a: r.a, b: r.b, tableId: ta, ruleId: r.id });
      }
      if (r.kind === "together" && ta !== tb) {
        flags.push({ kind: "together", a: r.a, b: r.b, tableA: ta, tableB: tb, ruleId: r.id });
      }
    });

    // Over-capacity
    tables.forEach(t => {
      if ((assignments[t.id] || []).length > tableCapacity(t)) {
        flags.push({ kind: "overcap", tableId: t.id, count: assignments[t.id].length, cap: tableCapacity(t) });
      }
    });

    return flags;
  }

  // Compute simple table stats
  function tableStats(tableId, assignments, students) {
    const ids = assignments[tableId] || [];
    const byGroup = {};
    const byTag = {};
    ids.forEach(sid => {
      const s = students.find(x => x.id === sid);
      if (!s) return;
      byGroup[s.group] = (byGroup[s.group] || 0) + 1;
      (s.tags || []).forEach(tg => { byTag[tg] = (byTag[tg] || 0) + 1; });
    });
    return {
      count: ids.length,
      byGroup,
      byTag,
      // Back-compat convenience counts for built-in tags
      monitors: byTag.monitor || 0,
      allergy: byTag.allergy || 0,
      access: byTag.access || 0,
    };
  }

  window.Solver = { solve, audit, tableStats, buildPastPairKey, pastPairs };
})();
