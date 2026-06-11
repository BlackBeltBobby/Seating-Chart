function Inspector({
  selected, students, tables, rules, assignments, conflicts, history, monthIndex,
  tags, tagsIndex,
  groups, groupsIndex, groupNoun, fields,
  onClearSelection, onUnseat, onSeat, onAddRule, onDeleteRule, onEditStudent, onDeleteStudent,
  onUpdateTable, onDeleteTable, onDuplicateTable,
}) {
  const { Icon, TagChip } = window;
  const TAGS_INDEX = tagsIndex || {};
  const grpIdx = groupsIndex || {};
  const grps = groups || [];
  const noun = groupNoun || "Group";
  const flds = fields || { class: false, teacher: false };

  if (!selected) {
    return (
      <aside className="inspector">
        <div className="insp-empty">
          <div className="icon"><Icon.User /></div>
          <h4>Nothing selected</h4>
          <p>Click a name or a table on the floor plan to see details, history, and rule conflicts.</p>
        </div>
      </aside>
    );
  }

  // ----- Student selected -----
  if (selected.kind === "student") {
    const s = students.find(x => x.id === selected.id);
    if (!s) return null;
    const placedTableId = Object.entries(assignments).find(([tid, arr]) => arr.includes(s.id))?.[0];
    const placedTable = placedTableId && tables.find(t => t.id === placedTableId);
    const myConflicts = conflicts.filter(c => c.a === s.id || c.b === s.id);
    const myRules = rules.filter(r => r.a === s.id || r.b === s.id);

    // History: months past that include this student
    const myHistory = [];
    history.forEach((m, idx) => {
      const tid = Object.entries(m.assignments || {}).find(([k,v]) => v.includes(s.id))?.[0];
      if (!tid) return;
      const mates = m.assignments[tid].filter(x => x !== s.id).map(id => students.find(z => z.id === id)).filter(Boolean);
      myHistory.push({ month: m.label || ("M" + (idx+1)), tableId: tid, mates });
    });

    return (
      <aside className="inspector">
        <div className="insp-head">
          <div className="name-row">
            <div className="insp-avatar" style={{ background: grpIdx[s.group]?.color }}>
              {s.first[0]}{s.last[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div className="insp-name">{s.name}</div>
              <div className="insp-sub">
                {noun} {grpIdx[s.group]?.label || s.group}
                {flds.class && s.class ? ` · Class ${s.class}` : ""}
                {flds.teacher && s.teacher ? ` · ${s.teacher}` : ""}
              </div>
            </div>
            <button className="btn icon ghost" onClick={onClearSelection}><Icon.X /></button>
          </div>
        </div>

        <div className="insp-section">
          <h5>Tags</h5>
          {(s.tags || []).length ? (
            <div className="tag-grid" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {s.tags.map(t => {
                const def = TAGS_INDEX[t]; if (!def) return null;
                return <TagChip key={t} tag={def} lg />;
              })}
            </div>
          ) : (
            <div className="helper">No tags yet — edit to add.</div>
          )}
        </div>

        <div className="insp-section">
          <h5>Current seating</h5>
          {placedTable ? (
            <>
              <dl className="kv">
                <dt>Table</dt>
                <dd>Table {placedTable.label} · {placedTable.shape} · {window.TableGeom.capacity(placedTable)} seats</dd>
                <dt>Position</dt>
                <dd>Seat #{(assignments[placedTable.id] || []).indexOf(s.id) + 1}</dd>
              </dl>
              <div className="action-row" style={{ marginTop: 10 }}>
                <button className="btn sm" onClick={() => onUnseat(s.id)}><Icon.X />Unseat</button>
              </div>
            </>
          ) : (
            <div>
              <div className="helper warn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon.Alert /> Not yet seated this month.
              </div>
              <div className="helper" style={{ marginTop: 6 }}>Drag onto a table from the floor plan or sidebar.</div>
            </div>
          )}
        </div>

        {myConflicts.length > 0 && (
          <div className="insp-section" style={{ background: "var(--danger-soft)" }}>
            <h5 style={{ color: "var(--danger)" }}>Conflicts ({myConflicts.length})</h5>
            {myConflicts.map((c, i) => {
              const other = students.find(x => x.id === (c.a === s.id ? c.b : c.a));
              const note = rules.find(r => r.id === c.ruleId)?.note;
              return (
                <div key={i} style={{ fontSize: 12.5, padding: "6px 0", borderTop: i ? "1px solid var(--line)" : 0 }}>
                  <strong>{c.kind === "apart" ? "Sitting with" : "Separated from"}</strong> {other?.name}
                  {note && <div className="helper">"{note}"</div>}
                </div>
              );
            })}
          </div>
        )}

        <div className="insp-section">
          <h5>Rules involving {s.first}
            <button onClick={() => onAddRule("together", s.id)}><Icon.Plus />Add</button>
          </h5>
          {myRules.length === 0 && <div className="helper">No rules. Use ＋ to keep this name near or away from another.</div>}
          {myRules.map(r => {
            const other = students.find(x => x.id === (r.a === s.id ? r.b : r.a));
            if (!other) return null;
            return (
              <div key={r.id} className="rule-pair" style={{ marginTop: 6 }}>
                <span className={"rule-kind " + r.kind}>{r.kind === "together" ? "Together" : "Apart"}</span>
                <span>{other.name}</span>
                <button className="rule-icon-btn" onClick={() => onDeleteRule(r.id)}><Icon.Trash /></button>
              </div>
            );
          })}
        </div>

        <div className="insp-section">
          <h5>Tablemate history</h5>
          {myHistory.length === 0 && <div className="helper">No prior months recorded. Run auto-arrange to start building history.</div>}
          {myHistory.length > 0 && (
            <div className="history-list">
              {myHistory.map((h, i) => (
                <div key={i} className="history-row">
                  <span className="month">{h.month.slice(0,3)}</span>
                  <div className="tablemates">
                    {h.mates.slice(0, 6).map(m => (
                      <span key={m.id} className="mate-chip">
                        <span className="dot" style={{ background: grpIdx[m.group]?.color }}></span>
                        {m.first}
                      </span>
                    ))}
                    {h.mates.length > 6 && <span className="helper" style={{ alignSelf: "center" }}>+{h.mates.length - 6}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="insp-section">
          <div className="action-row">
            <button className="btn sm" onClick={() => onEditStudent(s.id)}><Icon.Settings />Edit</button>
            <button className="btn sm" onClick={() => onDeleteStudent(s.id)}><Icon.Trash />Remove</button>
          </div>
        </div>
      </aside>
    );
  }

  // ----- Table selected -----
  if (selected.kind === "table") {
    const t = tables.find(x => x.id === selected.id);
    if (!t) return null;
    const { TableGeom } = window;
    const cap = TableGeom.capacity(t);
    const ids = assignments[t.id] || [];
    const stats = window.Solver.tableStats(t.id, assignments, students);

    return (
      <aside className="inspector">
        <div className="insp-head">
          <div className="name-row">
            <div className="insp-avatar" style={{ background: "var(--ink)" }}>{t.label}</div>
            <div style={{ flex: 1 }}>
              <input
                className="insp-name editable"
                value={t.label}
                onChange={(e) => onUpdateTable(t.id, { label: e.target.value })}
                style={{ border: 0, background: "transparent", outline: "none", padding: 0, width: "100%" }}
              />
              <div className="insp-sub">{t.shape} · {ids.length}/{cap} seated · {t.rotation || 0}°</div>
            </div>
            <button className="btn icon ghost" onClick={onClearSelection}><Icon.X /></button>
          </div>
        </div>

        <div className="insp-section">
          <h5>Shape</h5>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <button
              className={"btn sm" + (t.shape === "round" ? " primary" : "")}
              onClick={() => onUpdateTable(t.id, {
                shape: "round",
                diameter: t.diameter || 130,
                roundSeats: t.roundSeats || 8,
              })}
            >Round</button>
            <button
              className={"btn sm" + (t.shape === "rect" ? " primary" : "")}
              onClick={() => onUpdateTable(t.id, {
                shape: "rect",
                width: t.width || 200,
                height: t.height || 110,
                sides: t.sides || { top: 3, right: 1, bottom: 3, left: 1 },
              })}
            >Rectangular</button>
          </div>

          {t.shape === "round" && (
            <div className="field-grid">
              <div className="field">
                <label>Diameter (px)</label>
                <input type="number" min="80" max="260" step="10"
                  value={t.diameter || 130}
                  onChange={(e) => onUpdateTable(t.id, { diameter: Math.max(80, +e.target.value || 130) })}
                />
              </div>
              <div className="field">
                <label>Seats around</label>
                <input type="number" min="2" max="20"
                  value={t.roundSeats || 8}
                  onChange={(e) => onUpdateTable(t.id, { roundSeats: Math.max(0, Math.min(20, +e.target.value || 0)) })}
                />
              </div>
            </div>
          )}

          {t.shape === "rect" && (
            <>
              <div className="field-grid">
                <div className="field">
                  <label>Width</label>
                  <input type="number" min="80" max="400" step="10"
                    value={t.width || 200}
                    onChange={(e) => onUpdateTable(t.id, { width: Math.max(80, +e.target.value || 200) })}
                  />
                </div>
                <div className="field">
                  <label>Height</label>
                  <input type="number" min="60" max="260" step="10"
                    value={t.height || 110}
                    onChange={(e) => onUpdateTable(t.id, { height: Math.max(60, +e.target.value || 110) })}
                  />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <h5 style={{ margin: "0 0 6px" }}>Seats per side</h5>
                <SidesEditor sides={t.sides || { top:0,right:0,bottom:0,left:0 }}
                  rotation={t.rotation || 0}
                  onChange={(sides) => onUpdateTable(t.id, { sides })} />
                <div className="helper" style={{ marginTop: 6 }}>
                  Set a side to 0 to leave it empty — great for head tables where everyone faces the same way.
                </div>
              </div>
            </>
          )}
        </div>

        <div className="insp-section">
          <h5>Rotation</h5>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="range" min="-180" max="180" step="1"
              value={t.rotation || 0}
              onChange={(e) => onUpdateTable(t.id, { rotation: +e.target.value })}
              style={{ flex: 1 }}
            />
            <input type="number" min="-180" max="180" step="1"
              value={t.rotation || 0}
              onChange={(e) => onUpdateTable(t.id, { rotation: +e.target.value })}
              style={{ width: 64, border: "1px solid var(--line)", borderRadius: 6, padding: "4px 6px", textAlign: "right", fontFamily: "var(--ff-mono)" }}
            />
            <span className="helper">°</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[0, 45, 90, 135, 180, -90, -45].map(d => (
              <button key={d} className="btn sm" onClick={() => onUpdateTable(t.id, { rotation: d })}>{d}°</button>
            ))}
          </div>
          <div className="helper" style={{ marginTop: 6 }}>
            Rotates the table and everyone sitting at it. Drag the green handle above the table to rotate by hand — hold Shift to snap to 15°.
          </div>
        </div>

        <div className="insp-section">
          <h5>{noun} composition</h5>
          <div className="composition-bar">
            {grps.map(g => {
              const c = stats.byGroup[g.id] || 0;
              if (!c) return null;
              return <div key={g.id} className="comp-segment"
                style={{ background: g.color, width: `${(c / Math.max(1, ids.length)) * 100}%` }} />;
            })}
          </div>
          <div className="comp-legend">
            {grps.map(g => {
              const c = stats.byGroup[g.id] || 0;
              if (!c) return null;
              return <span key={g.id} className="item">
                <span className="dot" style={{ background: g.color }}></span>
                {noun} {g.label} · {c}
              </span>;
            })}
          </div>
        </div>

        <div className="insp-section">
          <h5>Highlights</h5>
          <dl className="kv">
            {(tags || []).map(tg => {
              const c = stats.byTag[tg.id] || 0;
              if (!c) return null;
              return <React.Fragment key={tg.id}><dt>{tg.label}</dt><dd>{c}</dd></React.Fragment>;
            })}
            <dt>Empty seats</dt><dd>{Math.max(0, cap - ids.length)}</dd>
          </dl>
        </div>

        <div className="insp-section">
          <h5>Seated students ({ids.length})</h5>
          {ids.length === 0 && <div className="helper">No one assigned. Drag a name here.</div>}
          {ids.map(sid => {
            const s = students.find(x => x.id === sid); if (!s) return null;
            return (
              <div key={sid} className="guest-row" style={{ borderBottom: "1px solid var(--line)", padding: "6px 0", cursor: "pointer" }}
                   onClick={() => window.dispatchEvent(new CustomEvent("seatery:select", { detail: { kind: "student", id: s.id } }))}>
                <span className="grade-dot" style={{ background: grpIdx[s.group]?.color }}>{grpIdx[s.group]?.label || s.group}</span>
                <span className="name">{s.name}</span>
                <button className="rule-icon-btn" onClick={(e) => { e.stopPropagation(); onUnseat(s.id); }}>
                  <Icon.X />
                </button>
              </div>
            );
          })}
        </div>

        <div className="insp-section">
          <div className="action-row">
            <button className="btn sm" onClick={() => onDuplicateTable(t.id)}><Icon.Plus />Duplicate</button>
            <button className="btn sm" onClick={() => onDeleteTable(t.id)}><Icon.Trash />Delete table</button>
          </div>
        </div>
      </aside>
    );
  }

  return null;
}

// ---------- Visual editor for per-side seat counts on a rect table ----------
function SidesEditor({ sides, rotation, onChange }) {
  // Show a small diagram with 4 inputs around it. Rotation note shown separately.
  function setSide(side, val) {
    const v = Math.max(0, Math.min(20, +val || 0));
    onChange({ ...sides, [side]: v });
  }
  const input = (side) => (
    <input type="number" min="0" max="20"
      value={sides[side] || 0}
      onChange={(e) => setSide(side, e.target.value)}
      style={{
        width: 44, border: "1px solid var(--line)", borderRadius: 6,
        padding: "4px 6px", textAlign: "center", fontFamily: "var(--ff-mono)",
        background: "var(--surface-2)",
      }}
    />
  );
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "44px 1fr 44px",
      gridTemplateRows: "30px 70px 30px",
      alignItems: "center", justifyItems: "center",
      gap: 6,
    }}>
      <div></div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span className="helper" style={{ fontSize: 11 }}>Top</span>
        {input("top")}
      </div>
      <div></div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span className="helper" style={{ fontSize: 11 }}>Left</span>
        {input("left")}
      </div>
      <div style={{
        width: "100%", height: "100%",
        background: "var(--surface-2)", border: "1.5px solid var(--ink)",
        borderRadius: 8,
        display: "grid", placeItems: "center",
        fontFamily: "var(--ff-mono)", fontSize: 10, color: "var(--ink-3)",
        textTransform: "uppercase", letterSpacing: "0.08em",
      }}>
        Table
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <span className="helper" style={{ fontSize: 11 }}>Right</span>
        {input("right")}
      </div>

      <div></div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        {input("bottom")}
        <span className="helper" style={{ fontSize: 11 }}>Bottom</span>
      </div>
      <div></div>
    </div>
  );
}
window.Inspector = Inspector;
