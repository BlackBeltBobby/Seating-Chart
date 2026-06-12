/* ==========================================================================
   Table geometry — single source of truth for shapes, seats, sizes, rotation
   ========================================================================== */
(function () {
  const DEG = Math.PI / 180;

  // Default tables (used when adding new)
  const DEFAULTS = {
    round: { shape: "round", diameter: 130, roundSeats: 8 },
    rect:  {
      shape: "rect",
      width: 200, height: 110,
      sides: { top: 3, right: 1, bottom: 3, left: 1 },
    },
    head: { // "head table" / theater-style — one long side only
      shape: "rect",
      width: 280, height: 90,
      sides: { top: 0, right: 0, bottom: 5, left: 0 },
    },
  };

  function defaultTable(kind, partial = {}) {
    const base = DEFAULTS[kind] || DEFAULTS.round;
    return {
      id: "t" + Math.random().toString(36).slice(2, 7),
      label: "?",
      x: 700, y: 540,
      rotation: 0,
      ...JSON.parse(JSON.stringify(base)),
      ...partial,
    };
  }

  function capacity(t) {
    if (t.shape === "round") return t.roundSeats || 0;
    const s = t.sides || {};
    return (s.top|0) + (s.right|0) + (s.bottom|0) + (s.left|0);
  }

  function size(t) {
    if (t.shape === "round") {
      const d = t.diameter || 130;
      return { w: d, h: d };
    }
    return { w: t.width || 180, h: t.height || 110 };
  }

  // Rotate (x,y) by angle (radians) around origin.
  function rot(x, y, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return { x: x * c - y * s, y: x * s + y * c };
  }

  /**
   * Seats in LOCAL table coords (table center at 0,0).
   * Each seat: { idx, x, y, faceAngle }
   *   - faceAngle in radians = direction the person is looking
   *     (toward the table center for round; perpendicular to side for rect).
   *   - 0 = +x (right), Math.PI/2 = +y (down), etc.
   */
  function seatsLocal(t) {
    const out = [];
    const offset = 24; // seat offset from table edge

    if (t.shape === "round") {
      const d = t.diameter || 130;
      const r = d / 2 + offset;
      const n = t.roundSeats || 0;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2; // start at top
        out.push({
          idx: i,
          x: Math.cos(a) * r,
          y: Math.sin(a) * r,
          faceAngle: a + Math.PI, // toward center
        });
      }
      return out;
    }

    // Rectangle — seats per side, evenly spaced. Sides default to 0 if missing.
    const w = t.width || 180;
    const h = t.height || 110;
    const sides = Object.assign({ top: 0, right: 0, bottom: 0, left: 0 }, t.sides || {});

    let idx = 0;
    // Top side — seats face DOWN (+y)
    for (let i = 0; i < sides.top; i++) {
      const step = w / (sides.top + 1);
      out.push({
        idx: idx++,
        x: -w/2 + step * (i + 1),
        y: -h/2 - offset,
        faceAngle: Math.PI / 2,
      });
    }
    // Right side — seats face LEFT (-x = π)
    for (let i = 0; i < sides.right; i++) {
      const step = h / (sides.right + 1);
      out.push({
        idx: idx++,
        x: w/2 + offset,
        y: -h/2 + step * (i + 1),
        faceAngle: Math.PI,
      });
    }
    // Bottom side — seats face UP (-y = -π/2). Walk right-to-left so seat order reads naturally.
    for (let i = 0; i < sides.bottom; i++) {
      const step = w / (sides.bottom + 1);
      out.push({
        idx: idx++,
        x: w/2 - step * (i + 1),
        y: h/2 + offset,
        faceAngle: -Math.PI / 2,
      });
    }
    // Left side — face RIGHT (+x = 0)
    for (let i = 0; i < sides.left; i++) {
      const step = h / (sides.left + 1);
      out.push({
        idx: idx++,
        x: -w/2 - offset,
        y: h/2 - step * (i + 1),
        faceAngle: 0,
      });
    }
    return out;
  }

  /**
   * Seats in WORLD coords (after applying table rotation + position).
   * Useful for rendering and hit-testing without DOM transforms.
   */
  function seatsWorld(t) {
    const local = seatsLocal(t);
    const a = (t.rotation || 0) * DEG;
    return local.map(s => {
      const r = rot(s.x, s.y, a);
      return {
        idx: s.idx,
        x: t.x + r.x,
        y: t.y + r.y,
        faceAngle: s.faceAngle + a,
      };
    });
  }

  const SEAT_R = 18; // .seat is 36px, centered (margin -18) → 18px radius

  // Axis-aligned extents of a table's true footprint relative to its center:
  // the rotated body box, plus each seat circle (seat centers padded by SEAT_R).
  // Body corners are NOT padded, so sides without seats sit flush to the body.
  function footprint(t) {
    const a = (t.rotation || 0) * DEG;
    const { w, h } = size(t);
    const corners = [rot(-w/2,-h/2,a), rot(w/2,-h/2,a), rot(w/2,h/2,a), rot(-w/2,h/2,a)];
    let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
    corners.forEach(p => { minx=Math.min(minx,p.x); maxx=Math.max(maxx,p.x);
                           miny=Math.min(miny,p.y); maxy=Math.max(maxy,p.y); });
    seatsLocal(t).forEach(s => { const r = rot(s.x, s.y, a);
      minx=Math.min(minx,r.x-SEAT_R); maxx=Math.max(maxx,r.x+SEAT_R);
      miny=Math.min(miny,r.y-SEAT_R); maxy=Math.max(maxy,r.y+SEAT_R); });
    return { minx, maxx, miny, maxy };
  }

  // Clamp a table's center so its whole footprint stays within the room (margin padding).
  function clampToRoom(t, room, margin = 8) {
    const b = footprint(t);
    const x = Math.min(room.w - margin - b.maxx, Math.max(margin - b.minx, t.x));
    const y = Math.min(room.h - margin - b.maxy, Math.max(margin - b.miny, t.y));
    return { ...t, x, y };
  }

  // Do two tables' footprints overlap? (AABB on true footprints; touching edges are allowed.)
  function overlaps(a, b) {
    const fa = footprint(a), fb = footprint(b);
    return (a.x+fa.minx) < (b.x+fb.maxx) && (a.x+fa.maxx) > (b.x+fb.minx)
        && (a.y+fa.miny) < (b.y+fb.maxy) && (a.y+fa.maxy) > (b.y+fb.miny);
  }
  function collidesAny(t, others) { return others.some(o => overlaps(t, o)); }

  // Resolve a drag to (x,y): take the full move if clear, else slide along one axis
  // (so the table glides along a neighbor's edge), else stay put. Always room-clamped.
  function resolveMove(prev, x, y, others, room) {
    const at = (nx, ny) => clampToRoom({ ...prev, x: nx, y: ny }, room);
    let cand = at(x, y);
    if (!collidesAny(cand, others)) return cand;
    cand = at(x, prev.y);
    if (!collidesAny(cand, others)) return cand;
    cand = at(prev.x, y);
    if (!collidesAny(cand, others)) return cand;
    return prev; // boxed in — hold position
  }

  // Find the nearest room-clamped spot for `t` that doesn't collide with `others`
  // (used when adding/duplicating/rotating). Scans a grid of candidate centers
  // ordered by distance from the requested spot. Returns null if the room is full.
  function findFreeSpot(t, others, room) {
    let cand = clampToRoom(t, room);
    if (!collidesAny(cand, others)) return cand;
    const step = 30;
    const pts = [];
    for (let gx = step; gx < room.w; gx += step)
      for (let gy = step; gy < room.h; gy += step)
        pts.push({ gx, gy, d: (gx - t.x) ** 2 + (gy - t.y) ** 2 });
    pts.sort((p, q) => p.d - q.d);
    for (const p of pts) {
      cand = clampToRoom({ ...t, x: p.gx, y: p.gy }, room);
      if (!collidesAny(cand, others)) return cand;
    }
    return null; // no free spot anywhere
  }

  const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Perimeter-seated rectangle sized to its seat count: seats are spread across all
  // four sides as evenly as possible, and the body grows in whichever direction has
  // more seats. One seat per side (4 total) → a square; more seats → a bigger,
  // roughly-square table. Returns { width, height, sides }.
  function rectDims(seatsPerTable) {
    const n = clampN(Math.round(seatsPerTable) || 1, 1, 24);
    const base = Math.floor(n / 4), rem = n % 4;
    // Hand out the remainder bottom → top → left first, so the default/odd seat lands
    // on the bottom side (whose seats face UP toward the front of the room).
    const sides = {
      bottom: base + (rem >= 1 ? 1 : 0),
      top:    base + (rem >= 2 ? 1 : 0),
      left:   base + (rem >= 3 ? 1 : 0),
      right:  base,
    };
    const BASE = 90, PITCH = 56;
    const perSideX = Math.max(sides.top, sides.bottom);   // seats along top/bottom → width
    const perSideY = Math.max(sides.left, sides.right);   // seats along left/right → height
    return {
      width:  BASE + Math.max(0, perSideX - 1) * PITCH,
      height: BASE + Math.max(0, perSideY - 1) * PITCH,
      sides,
    };
  }

  // A round table sized so its seats don't crowd as the seat count grows.
  function roundDims(seatsPerTable) {
    const n = clampN(Math.round(seatsPerTable) || 1, 1, 24);
    return { diameter: clampN(110 + (n - 6) * 8, 110, 220), roundSeats: n };
  }

  // Lay out `roundCount` round + `rectCount` rect tables (each seating ~seatsPerTable)
  // within `room`. Tables are distributed to FILL the room — rows spread across the
  // height, and each row's tables spread across the full width (so a sparse layout has
  // balanced margins instead of clumping in a corner). When the room is too tight for
  // even spacing, placement falls back to findFreeSpot and densifies. Returns an array
  // that may be SHORTER than the requested total if the room fills up.
  function buildGrid({ room, roundCount, rectCount, seatsPerTable, idPrefix = "t" } = {}) {
    const seats = clampN(Math.round(seatsPerTable) || 1, 1, 24);
    const nRound = clampN(Math.round(roundCount) || 0, 0, 60);
    const nRect = clampN(Math.round(rectCount) || 0, 0, 60);

    // Build the spec list (rounds first, then rects) — bare templates, no position yet.
    const specs = [];
    for (let i = 0; i < nRound; i++) specs.push({ shape: "round", rotation: 0, ...roundDims(seats) });
    for (let i = 0; i < nRect; i++)  specs.push({ shape: "rect",  rotation: 0, ...rectDims(seats) });
    const N = specs.length;
    if (N === 0) return [];

    // Grid shape from the total and the room's aspect ratio.
    let cols = Math.max(1, Math.round(Math.sqrt(N * (room.w / room.h))));
    cols = Math.min(cols, N);
    const rows = Math.ceil(N / cols);

    const out = [];
    let idx = 1, i = 0;
    for (let r = 0; r < rows && i < N; r++) {
      const k = Math.min(cols, N - r * cols);           // tables in this row
      const y = room.h * (r + 0.5) / rows;
      for (let c = 0; c < k && i < N; c++) {
        const x = room.w * (c + 0.5) / k;               // spread across the FULL width
        const want = { ...specs[i], id: idPrefix + idx, label: String(idx), x, y };
        let placed = clampToRoom(want, room);
        if (collidesAny(placed, out)) {
          const free = findFreeSpot(want, out, room);
          if (!free) return out;                        // room full — return what fit
          placed = free;
        }
        out.push(placed);
        idx++; i++;
      }
    }
    return out;
  }

  // Heuristic: how far this table is from the nearest door, for solver scoring
  function distanceToDoor(t, room) {
    if (!room.doors || !room.doors.length) return Infinity;
    let min = Infinity;
    room.doors.forEach(d => {
      const dy = d.pos * room.h - t.y;
      const dx = t.x; // door is on left wall (x=0)
      min = Math.min(min, Math.sqrt(dx*dx + dy*dy));
    });
    return min;
  }

  window.TableGeom = {
    DEFAULTS, defaultTable, capacity, size, seatsLocal, seatsWorld,
    footprint, clampToRoom, overlaps, resolveMove, findFreeSpot, buildGrid, rectDims, distanceToDoor, DEG
  };
})();
