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
    DEFAULTS, defaultTable, capacity, size, seatsLocal, seatsWorld, distanceToDoor, DEG
  };
})();
