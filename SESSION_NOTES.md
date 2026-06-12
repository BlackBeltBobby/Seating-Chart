# Seatery — Running Notes

A living log for the Seatery seating-chart app. Add a new dated entry under
**Session log** each time; keep **Project facts** and **Current state** updated as things change.

---

## Project facts

- **What it is:** client-side React seating-chart app. Plain JS + JSX transformed by
  Babel-standalone **in the browser** — no build step, no bundler.
- **No test framework.** Verify with `node --check` (plain JS) + a Babel transform check
  for JSX, plus a Node harness that loads the geometry with a fake `window`.
- **Run locally:** `python3 -m http.server 8123` from project root →
  `http://localhost:8123/index.html`. (`index.html` blocks `file://` on purpose.)
- **Key files:**
  - `app.jsx` — root component, chart lifecycle, table handlers.
  - `components/canvas.jsx` — floor plan: pan/zoom, drag tables, rotate, seats.
  - `tables.js` — table geometry, exported on `window.TableGeom`.
  - `data.js` — school defaults + `Seatery.ROOM` (1480×1080) + CSV import.
  - `events.js` — wedding/conference layouts + `ChartKinds`.
  - `components/inspector.jsx`, `components/sidebar.jsx`, `components/modals.jsx`.
  - `store.js` — persistence seam (`window.Store`, localStorage `seatery.charts.v1`).
- **Charts model:** user-created charts of kind `school` / `wedding` / `conference`
  (max 3), per-kind groups (grades / bride-groom / speaker-attendee) and tag sets.

## Verification recipe

```bash
# plain-JS syntax
node --check tables.js && node --check events.js && node --check data.js

# JSX transform (Babel not installed locally; use a throwaway temp dir)
cd /tmp && mkdir -p babelchk && cd babelchk \
  && npm install --silent --no-fund --no-audit @babel/core @babel/preset-react \
  && node -e 'const b=require("@babel/core"),fs=require("fs");
     const root="<PROJECT_PATH>/";
     for(const f of ["app.jsx","components/canvas.jsx"]){
       b.transformSync(fs.readFileSync(root+f,"utf8"),{presets:["@babel/preset-react"]});
       console.log("OK",f);}'

# geometry harness (overlaps / clamp / placement) — load with a fake window:
#   global.window={}; global.document={addEventListener(){},querySelector(){return null},getElementById(){return null}};
#   require("./data.js"); require("./tables.js"); require("./events.js");
#   then use window.TableGeom + window.Seatery + window.ChartKinds
```

## Current state (as of 2026-06-12)

- On branch `changes`. Last commit `7aa833d` (multi-kind charts). **Everything since is
  uncommitted** in the working tree.
- **Room is now per-chart state** (`chart.state.room`), not the global `Seatery.ROOM`.
  Creation modal lets users set room size (presets + custom, **feet or pixels**),
  **round & rectangular table counts**, seats/table, and headcount — any field blank →
  per-kind default. Tables **fill the room evenly**; rect tables **scale to seat count**
  (perimeter, square at 4 seats).
- Edit/change actions now use an **arrow-in-a-circle** icon (`Icon.Edit`) instead of the gear.
- Working tree is **ready to commit** (all files above staged-or-modifiable; nothing committed yet).
- Not yet done: live in-browser click-through (drag feel, header updates, slide behavior);
  visual confirm of the new creation inputs.

---

## Session log

### 2026-06-12 — edit icon → arrow-in-a-circle

- **`components/icons.jsx`:** added `Icon.Edit` — a clockwise circular arrow (arrow inside a
  circle), matching the existing 16×16 stroked icon style. The old gear (`Icon.Settings`) read
  as a settings cog, not an edit affordance.
- Swapped the three edit/change buttons from `Icon.Settings` to `Icon.Edit`:
  "Edit tag" ([sidebar.jsx](components/sidebar.jsx)), "Edit" student ([inspector.jsx](components/inspector.jsx)),
  "Change style" ([toolbar.jsx](components/toolbar.jsx)). No real settings-gear usages remained, so
  `Icon.Settings` is now unused (kept in the registry for future use).
- **Verified:** Babel transform on the four touched JSX files; no stray `Icon.Settings` edit usages.

### 2026-06-12 — creator: units, mixed shapes, seat-scaled rects, even fill

Builds on the creation-parameters work below.

- **`data.js`:** `PX_PER_FOOT = 24` (exported). `ROOM_PRESETS` re-expressed as clean feet
  (small 40×30 → 960×720, medium 60×45 → 1440×1080, large 80×60 → 1920×1440 px). Global
  `ROOM` stays 1480×1080 (back-compat fallback).
- **`tables.js`:** new `rectDims(seats)` — perimeter seating spread over 4 sides (square at
  ≤4 seats, grows roughly square; BASE 90, PITCH 56). **Rewrote `buildGrid`** to
  `{room, roundCount, rectCount, seatsPerTable, idPrefix}`: builds a mixed round+rect spec
  list and **distributes to fill the room** — rows span the height, each row spreads across
  the full width (balanced margins, no corner clump). Tight rooms fall back to `findFreeSpot`
  and may return short. (Old `count`/`shape` signature gone.)
- **`events.js`:** per-kind `defaults: {roundCount, rectCount, seatsPerTable, people}` — all
  default to **rectangular** (school 0/19, wedding 0/16, conference 0/25; seats 8) — single
  source of truth via a shared `tablesFor()` helper. `buildTables`/`buildDemo` default from it.
- **Rect seat facing:** `rectDims` hands the remainder **bottom-first**, so the default/odd
  seat sits on the bottom side (faces UP toward the front of the room), not the back.
- **`app.jsx`:** `createChart` takes `roundCount`/`rectCount` (resolved from `kd.defaults`);
  shortfall toast only when the user **explicitly** set a count (defaults fit silently).
- **`components/modals.jsx`:** unit toggle (Feet|Pixels, default feet) interpreting custom
  W/H and converting feet→px on submit; **Round tables** + **Rectangular tables** fields
  replace the single Tables field; placeholders/capacity read `ChartKinds[kind].defaults`
  (dropped the local map).
- **`components/inspector.jsx`:** rect Width/Height `max` 400/260 → 520 (seat-scaled rects
  can reach ~370px); manual resize otherwise unchanged.
- **Verified:** `node --check`; Babel on app/modals/inspector/canvas; geometry harness (225
  room×mixed-count×seat cases) → 0 overlaps / 0 off-room; even-fill margins symmetric (Δ≤10px);
  `rectDims` square at 1/2/4/8/12/24 seats, capacity exact; defaults 19/16/24 tables;
  50×40 ft → 1200×960 px; localStorage round-trips a custom feet room with mixed tables.
  Pending: visual browser click-through.

### 2026-06-12 — creation parameters (room size / tables / seats / people)

**Goal:** let users size the room and set table/seat/people counts when creating a chart;
any field may be left blank (→ per-kind default).

- **`tables.js`:** new `TableGeom.buildGrid({room,count,seatsPerTable,shape,idPrefix})` —
  aspect-ratio grid, cell pitch = template `footprint` + `GAP(48)` (non-overlap by
  construction), `findFreeSpot` fallback, returns a possibly-short array if the room fills.
  Clamps count 1–60, seats 1–24. Rect template H=90; round diameter grows with seats.
- **`data.js`:** `ROOM_PRESETS` (small/medium/large; medium == old default), `makeRoom()`
  (clamps W 600–4000, H 500–3000; stage→null, keeps left door). `buildSchool(n=150)` now
  cycles grade/class to any `n` (n=150 reproduces the original stream exactly).
  `buildRules` filters rules whose student ids aren't in the roster.
- **`events.js`:** each kind's `buildTables(opts)` delegates to `buildGrid` (school/wedding
  round, conference rect; defaults 19/16/25 @ 8 seats); `buildDemo(count)` honors headcount.
  Removed now-dead `buildWeddingTables`/`buildConferenceTables`.
- **`solver.js`:** `solve({...,room})` uses the passed room, falls back to `ROOM` global.
- **`app.jsx`:** `room` is now a live state hook — threaded through `EMPTY_STATE`,
  `snapshotLive`/`hydrate`/persist-deps (so it isn't dropped on commit), the 6 ex-`Seatery.ROOM`
  geometry calls, the `Canvas` prop, and the solver call. `createChart` applies room/counts
  (blank→defaults) + toasts a shortfall if not all tables fit. `changeKind` keeps the room.
- **`components/modals.jsx`:** ChartModal (create-mode) gains room-size presets + custom W/H,
  Tables/Seats/People number inputs (blank shows the kind default as placeholder), a live
  capacity warning, and a blank-coalescing submit payload. Reuses existing CSS classes.
- **Verified:** `node --check` all plain JS; Babel transform on the 3 JSX files; geometry
  harness (300 room×count×seat×shape cases) → 0 overlaps / 0 off-room, defaults 19/16/25;
  seat counts honored; localStorage round-trip preserves a custom room with in-bounds tables.
  Pending: visual browser click-through (`python3 -m http.server 8123`).

### 2026-06-12 — polish/bugfix + visual fixes

### 2026-06-12 — polish/bugfix + visual fixes

**1. Polish / bugfix pass**
- `app.jsx`: added `resetView()` (clears `selected`, `searchQuery→""`, `activeTab→"guests"`)
  and called it in all four chart-entry flows (`switchChart`, `createChart`, active branch of
  `deleteChart`, `changeKind`) — fixes sidebar search/tab leaking across charts.
- `components/inspector.jsx`: added `if (!other) return null;` in the conflicts map so a
  dangling conflict can't render "undefined".
- `data.js`: `csvToStudents` derives `gradeIndex` from the kind's groups
  (`grps ? grps.findIndex(...) : GRADES.indexOf(group)`) so non-school imports aren't `-1`.

**2. Canvas header label**
- Was hardcoded `ROOM.label = "Maple Ridge Elementary — Cafeteria"`. Now `app.jsx` passes
  `chartName={activeChart ? activeChart.name : ""}` into `<Canvas>`, and `canvas.jsx` renders
  `{chartName && <div className="room-label">…}` — mirrors the active chart name, hidden when empty.

**3. Keep tables/seats on-screen + no overlap**
- Decision: **seat-level strict** no-overlap, **stop/slide** on drag.
- `tables.js` (`window.TableGeom`): `footprint(t)` (true rotated body + seat-circle extent,
  `SEAT_R=18`), `clampToRoom(t,room,margin=8)`, `overlaps(a,b)` (AABB on footprints),
  `resolveMove(prev,x,y,others,room)` (full move → slide one axis → hold), `findFreeSpot(t,
  others,room)` (distance-sorted grid scan, returns `null` if room full).
- `app.jsx`: `moveTable`→`resolveMove`; `addTable`/`duplicateTable`→`findFreeSpot` (toast
  "No room for another table…" + decline on `null`); `rotateTable` keeps rotation in place if
  it fits else nudges.
- Re-spaced defaults that violated strict overlap: school `t08` rect lost its facing right
  seat (`right:0`); wedding head table raised to `y:70` + round grid retightened to
  `y:270+r*220`; conference grid nudged to `y:200+r*190` to fit vertically.
- Verified via Node harness: all 3 default layouts 0 overlaps / 0 off-room; adds never
  overlap (decline when full); drag/rotate collision-free.

---

## Backlog / ideas (not started)

- Live in-browser verification of drag/slide feel and header updates.
- Out-of-scope-for-now (noted earlier): drag-to-specific-seat, keyboard a11y, rotation handle
  at extreme zoom, full-table drop feedback, `distanceToDoor` hardcoded left wall.
- Eventual backend swap behind the `window.Store` seam (Supabase path mapped previously).
