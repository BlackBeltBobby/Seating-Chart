/* ==========================================================================
   Floor plan canvas
   - Pan / zoom
   - Tables: drag to move, rotate handle, click to select
   - Seats: positioned per side (configurable), face their table edge
   - Drag-drop students between seats
   ========================================================================== */

function Canvas({
  room, tables, students, assignments, conflicts,
  selected, onSelect,
  onMoveStudent, onMoveTable, onRotateTable, onAddTable,
  showNames, setShowNames,
  solving,
}) {
  const { Icon, TableGeom } = window;
  const [zoom, setZoom] = React.useState(0.75);
  const [pan, setPan] = React.useState({ x: 60, y: 24 });
  const panStateRef = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(null);
  const stageRef = React.useRef(null);

  // Fit-to-screen on mount + resize
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const z = Math.min((r.width - 80) / room.w, (r.height - 80) / room.h);
      const nz = Math.min(0.95, Math.max(0.3, z));
      setZoom(nz);
      setPan({ x: (r.width - room.w * nz) / 2, y: (r.height - room.h * nz) / 2 });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [room.w, room.h]);

  const studentMap = React.useMemo(() => {
    const m = {}; students.forEach(s => m[s.id] = s); return m;
  }, [students]);

  // Map studentId -> tableId
  const placedOf = React.useMemo(() => {
    const m = {};
    Object.entries(assignments).forEach(([tid, arr]) => arr.forEach(sid => m[sid] = tid));
    return m;
  }, [assignments]);

  const tableFlagCount = React.useMemo(() => {
    const m = {};
    conflicts.forEach(c => {
      if (c.tableId) m[c.tableId] = (m[c.tableId] || 0) + 1;
      if (c.tableA) m[c.tableA] = (m[c.tableA] || 0) + 1;
      if (c.tableB) m[c.tableB] = (m[c.tableB] || 0) + 1;
    });
    return m;
  }, [conflicts]);
  const flaggedSeats = React.useMemo(() => {
    const set = new Set();
    conflicts.forEach(c => { if (c.a) set.add(c.a); if (c.b) set.add(c.b); });
    return set;
  }, [conflicts]);

  // ----- Pan -----
  function onStageMouseDown(e) {
    if (e.target.closest(".table-obj, .seat, .rot-handle")) return;
    panStateRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.classList.add("panning");
  }
  function onStageMouseMove(e) {
    if (!panStateRef.current) return;
    const ps = panStateRef.current;
    setPan({ x: ps.px + (e.clientX - ps.sx), y: ps.py + (e.clientY - ps.sy) });
  }
  function onStageMouseUp(e) {
    panStateRef.current = null;
    e.currentTarget.classList.remove("panning");
  }
  function onWheel(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = stageRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const nz = Math.max(0.3, Math.min(2, zoom * (1 - e.deltaY / 600)));
    const nx = mx - (mx - pan.x) * (nz / zoom);
    const ny = my - (my - pan.y) * (nz / zoom);
    setZoom(nz);
    setPan({ x: nx, y: ny });
  }

  // ----- Drag table position -----
  function onTableMouseDown(e, table) {
    if (e.target.closest(".seat, .rot-handle")) return;
    e.stopPropagation();
    onSelect({ kind: "table", id: table.id });
    const startX = e.clientX, startY = e.clientY;
    const origX = table.x, origY = table.y;
    function move(ev) {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      onMoveTable(table.id, origX + dx, origY + dy);
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  // ----- Rotate handle -----
  function onRotateMouseDown(e, table) {
    e.stopPropagation();
    e.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    // Table center in screen coords
    const cx = rect.left + pan.x + table.x * zoom;
    const cy = rect.top  + pan.y + table.y * zoom;
    const startAng = Math.atan2(e.clientY - cy, e.clientX - cx);
    const origRot = table.rotation || 0;
    function move(ev) {
      const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
      let deg = origRot + (a - startAng) * 180 / Math.PI;
      // Snap to 15° if shift held
      if (ev.shiftKey) deg = Math.round(deg / 15) * 15;
      // Wrap nicely
      while (deg > 180) deg -= 360;
      while (deg < -180) deg += 360;
      onRotateTable(table.id, deg);
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  // ----- Seat drag-drop -----
  function onSeatDragStart(e, student) {
    if (!student) { e.preventDefault(); return; }
    e.dataTransfer.setData("text/student", student.id);
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  }
  function onTableDragOver(e, table) {
    if (e.dataTransfer.types.includes("text/student")) {
      e.preventDefault();
      setDragOver(table.id);
    }
  }
  function onTableDragLeave(e, table) {
    if (dragOver === table.id) setDragOver(null);
  }
  function onTableDrop(e, table) {
    e.preventDefault();
    const sid = e.dataTransfer.getData("text/student");
    if (!sid) return;
    onMoveStudent(sid, table.id);
    setDragOver(null);
  }

  // Conflict lines between separated together-pairs
  const conflictLines = React.useMemo(() => {
    return conflicts.filter(c => c.kind === "together").map((c, i) => {
      const ta = tables.find(t => t.id === c.tableA);
      const tb = tables.find(t => t.id === c.tableB);
      if (!ta || !tb) return null;
      return { key: "c" + i, x1: ta.x, y1: ta.y, x2: tb.x, y2: tb.y };
    }).filter(Boolean);
  }, [conflicts, tables]);

  function zoomTo(z) {
    const r = stageRef.current.getBoundingClientRect();
    const mx = r.width/2, my = r.height/2;
    const nx = mx - (mx - pan.x) * (z / zoom);
    const ny = my - (my - pan.y) * (z / zoom);
    setZoom(z);
    setPan({ x: nx, y: ny });
  }
  function fitToScreen() {
    const r = stageRef.current.getBoundingClientRect();
    const z = Math.min((r.width - 80) / room.w, (r.height - 80) / room.h);
    const nz = Math.min(0.95, Math.max(0.3, z));
    setZoom(nz);
    setPan({ x: (r.width - room.w * nz) / 2, y: (r.height - room.h * nz) / 2 });
  }

  return (
    <div className="stage" ref={stageRef}>
      <div className="stage-overlay-top">
        <span className="banner">
          <span style={{ fontFamily: "var(--ff-mono)", color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Floor plan</span>
          <span className="pill">{tables.length} tables</span>
          <span className="pill">{students.length} students</span>
        </span>
        <button className="btn sm" onClick={() => onAddTable("round")}>
          <Icon.Plus /> Round table
        </button>
        <button className="btn sm" onClick={() => onAddTable("rect")}>
          <Icon.Plus /> Rect table
        </button>
        <button className="btn sm" onClick={() => onAddTable("head")} title="One-sided / theater-style table">
          <Icon.Plus /> Head table
        </button>
      </div>

      <div
        className="canvas-pan"
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onMouseLeave={onStageMouseUp}
        onWheel={onWheel}
      >
        <div
          className={"canvas-content" + (solving ? " solving" : "") + (showNames ? " show-names" : "")}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <div className="room" style={{ width: room.w, height: room.h }}>
            <div className="room-label" style={{ top: -14, left: 16 }}>{room.label}</div>

            {room.stage && (
              <div className="room-stage" style={{
                left: room.stage.x, top: room.stage.y,
                width: room.stage.w, height: room.stage.h,
              }}>{room.stage.label}</div>
            )}

            {room.doors.map((d, i) => (
              <div key={i} className="room-door" style={{
                left: -8, top: d.pos * room.h - 7,
              }} />
            ))}

            <svg className="conflict-layer" width={room.w} height={room.h}>
              {conflictLines.map(l => (
                <line key={l.key} className="conflict-line" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
              ))}
            </svg>

            {tables.map(t => (
              <TableNode
                key={t.id}
                table={t}
                assignments={assignments}
                studentMap={studentMap}
                flagsCount={tableFlagCount[t.id] || 0}
                flaggedSeats={flaggedSeats}
                selected={selected}
                isOver={dragOver === t.id}
                onSelect={onSelect}
                onMouseDown={onTableMouseDown}
                onRotateMouseDown={onRotateMouseDown}
                onSeatDragStart={onSeatDragStart}
                onDragOver={onTableDragOver}
                onDragLeave={onTableDragLeave}
                onDrop={onTableDrop}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="stage-overlay-bot">
        <button onClick={() => zoomTo(Math.max(0.3, zoom - 0.1))} title="Zoom out"><Icon.Minus /></button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button onClick={() => zoomTo(Math.min(2, zoom + 0.1))} title="Zoom in"><Icon.Plus /></button>
        <span style={{ width: 1, height: 18, background: "var(--line)" }}></span>
        <button onClick={fitToScreen}><Icon.Grid /> Fit</button>
        <button
          onClick={() => setShowNames(v => !v)}
          style={showNames ? { background: "var(--accent-soft)", color: "var(--accent)" } : null}
        >
          <Icon.Eye /> Names
        </button>
      </div>
    </div>
  );
}

// ---------- One table: outline + seats + rotate handle ----------
function TableNode({
  table, assignments, studentMap, flagsCount, flaggedSeats,
  selected, isOver,
  onSelect, onMouseDown, onRotateMouseDown, onSeatDragStart,
  onDragOver, onDragLeave, onDrop,
}) {
  const { TableGeom } = window;
  const { w, h } = TableGeom.size(table);
  const seats = TableGeom.seatsLocal(table);
  const seatedIds = assignments[table.id] || [];
  const cap = TableGeom.capacity(table);
  const isSelected = selected?.kind === "table" && selected.id === table.id;
  const rot = table.rotation || 0;

  // Render: outer wrapper is positioned at table center.
  // Inside, the "frame" rotates; seats are siblings of the frame and also rotated
  // (so they follow the table), but each seat has an INNER element that
  // counter-rotates to keep the avatar upright while the directional dash
  // honors the seat's facing angle.

  return (
    <div
      className={
        "table-obj " + table.shape +
        (flagsCount ? " flagged" : "") +
        (isSelected ? " selected" : "") +
        (isOver ? " over" : "")
      }
      style={{ left: table.x, top: table.y }}
      onMouseDown={(e) => onMouseDown(e, table)}
      onDragOver={(e) => onDragOver(e, table)}
      onDragLeave={(e) => onDragLeave(e, table)}
      onDrop={(e) => onDrop(e, table)}
    >
      {/* Rotating frame (table surface + label) */}
      <div className="table-frame" style={{ transform: `rotate(${rot}deg)` }}>
        <div className="ring" style={{
          width: w, height: h,
          left: -w/2, top: -h/2,
          borderRadius: table.shape === "round" ? "50%" : "14px",
        }}>
          <div className="ring-inner" style={{ transform: `rotate(${-rot}deg)` }}>
            <div className="table-label">Table {table.label}</div>
            <div className="table-meta">{seatedIds.length}/{cap} · {table.shape}</div>
          </div>
        </div>
      </div>

      {flagsCount > 0 && <div className="table-flag" title={flagsCount + " conflict(s)"}>!</div>}

      {/* Seats — positioned in WORLD-rotated local coords */}
      {seats.map((p, i) => {
        // Apply table rotation to local seat coords
        const a = rot * Math.PI / 180;
        const sx = p.x * Math.cos(a) - p.y * Math.sin(a);
        const sy = p.x * Math.sin(a) + p.y * Math.cos(a);
        const faceDeg = (p.faceAngle * 180 / Math.PI) + rot;
        const sid = seatedIds[i];
        const stu = sid ? studentMap[sid] : null;
        const flagged = stu && flaggedSeats.has(stu.id);
        const isSeatSel = selected?.kind === "student" && selected.id === stu?.id;
        return (
          <div
            key={i}
            className={
              "seat " +
              (stu ? "filled grade-" + stu.grade : "empty") +
              (flagged ? " flagged" : "") +
              (isSeatSel ? " selected" : "")
            }
            style={{
              left: sx, top: sy,
              background: stu ? `var(--g-${stu.grade})` : undefined,
              color: stu ? "white" : undefined,
              borderColor: stu ? `var(--g-${stu.grade})` : undefined,
            }}
            draggable={!!stu}
            onDragStart={(e) => stu && onSeatDragStart(e, stu)}
            onMouseDown={(e) => { e.stopPropagation(); stu && onSelect({ kind: "student", id: stu.id }); }}
            title={stu ? `${stu.name} · seat ${i+1}` : "Empty seat"}
          >
            {/* Facing tick — points toward the table */}
            <span className="facing-tick" style={{ transform: `rotate(${faceDeg}deg)` }}></span>
            <span className="seat-glyph">{stu ? stu.first[0] + (stu.last[0] || "") : ""}</span>
            {stu && <span className="seat-name">{stu.first}</span>}
          </div>
        );
      })}

      {/* Rotation handle — visible when selected */}
      {isSelected && (
        <div
          className="rot-handle"
          style={{
            transform: `rotate(${rot}deg) translate(0, -${h/2 + 46}px)`,
          }}
          onMouseDown={(e) => onRotateMouseDown(e, table)}
          title="Drag to rotate · Shift snaps to 15°"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8a5 5 0 0 1 8.5-3.5l1 1M13 8a5 5 0 0 1-8.5 3.5l-1-1"/>
            <path d="M11 2v3h3M5 14v-3H2"/>
          </svg>
        </div>
      )}
    </div>
  );
}

window.Canvas = Canvas;
