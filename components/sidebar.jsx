function Sidebar({
  students, rules, tables, assignments,
  selectedId, onSelect,
  searchQuery, setSearchQuery,
  activeTab, setActiveTab,
  onAddRule, onDeleteRule, onAddGuest,
  onAddTag,
  onDragStartStudent,
}) {
  const { Icon, TagChip } = window;
  const { TAGS_POOL } = window.Seatery;

  // Map studentId -> tableId
  const placedOf = React.useMemo(() => {
    const m = {};
    Object.entries(assignments).forEach(([tid, arr]) => arr.forEach(sid => { m[sid] = tid; }));
    return m;
  }, [assignments]);

  const tabs = [
    { id: "guests", label: "Guests", count: students.length },
    { id: "rules",  label: "Rules",  count: rules.length },
    { id: "tags",   label: "Tags",   count: TAGS_POOL.length },
  ];

  // Filter + group students
  const filtered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter(s =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      `grade ${s.grade}`.includes(q) ||
      (s.tags || []).join(" ").includes(q) ||
      (s.teacher || "").toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const grouped = React.useMemo(() => {
    const g = {};
    filtered.forEach(s => {
      const k = s.grade;
      (g[k] = g[k] || []).push(s);
    });
    Object.values(g).forEach(arr => arr.sort((a,b) => a.last.localeCompare(b.last)));
    return g;
  }, [filtered]);

  const findStudent = id => students.find(s => s.id === id);

  return (
    <aside className="sidebar">
      <div className="side-tabs">
        {tabs.map(t => (
          <button key={t.id}
            className={"side-tab" + (activeTab === t.id ? " active" : "")}
            onClick={() => setActiveTab(t.id)}>
            {t.label}<span className="count">{t.count}</span>
          </button>
        ))}
      </div>

      {activeTab === "guests" && (
        <>
          <div className="side-search">
            <div className="search-input">
              <Icon.Search />
              <input
                placeholder="Search by name, grade, tag…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button className="btn icon" onClick={onAddGuest} title="Add guest"><Icon.Plus /></button>
          </div>
          <div className="side-body">
            {["K","1","2","3","4"].map(g => grouped[g] && (
              <div key={g}>
                <div className="guest-group-head">
                  <span>Grade {g === "K" ? "K — Kindergarten" : g}</span>
                  <span>{grouped[g].length}</span>
                </div>
                {grouped[g].map(s => (
                  <div
                    key={s.id}
                    className={
                      "guest-row" +
                      (selectedId === s.id ? " selected" : "") +
                      (!placedOf[s.id] ? " unseated" : "")
                    }
                    onClick={() => onSelect({ kind: "student", id: s.id })}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/student", s.id);
                      e.dataTransfer.effectAllowed = "move";
                      onDragStartStudent && onDragStartStudent(s.id);
                    }}
                  >
                    <span className={"grade-dot grade-" + s.grade}>{s.grade}</span>
                    <span className="name">
                      {s.name}
                      <span className="class">·{s.class}</span>
                    </span>
                    <span className="meta">
                      {(s.tags || []).slice(0, 2).map(t => {
                        const def = window.Seatery.TAGS_INDEX[t];
                        if (!def) return null;
                        return <span key={t} className={"tag-chip " + def.cls} title={def.label}>
                          {def.label.split(" ")[0]}
                        </span>;
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {!filtered.length && <div className="helper" style={{ padding: 20, textAlign: "center" }}>
              No students match "{searchQuery}"
            </div>}
          </div>
        </>
      )}

      {activeTab === "rules" && (
        <>
          <div className="rules-toolbar">
            <button className="btn sm" onClick={() => onAddRule("together")}>
              <Icon.Plus />Must sit together
            </button>
            <button className="btn sm" onClick={() => onAddRule("apart")}>
              <Icon.Plus />Keep apart
            </button>
          </div>
          <div className="side-body">
            {rules.length === 0 && (
              <div className="helper" style={{ padding: 20, textAlign: "center" }}>
                No rules yet. Rules let you keep certain students together or apart.
              </div>
            )}
            {rules.map(r => {
              const a = findStudent(r.a);
              const b = findStudent(r.b);
              if (!a || !b) return null;
              return (
                <div key={r.id} className="rule-row">
                  <div>
                    <div className="rule-pair">
                      <span className={"rule-kind " + r.kind}>
                        {r.kind === "together" ? "Together" : "Apart"}
                      </span>
                      <span className={"grade-dot grade-" + a.grade} style={{ width: 16, height: 16, fontSize: 9 }}>{a.grade}</span>
                      <span>{a.name}</span>
                      <span style={{ color: "var(--ink-3)" }}>{r.kind === "together" ? "↔" : "⤬"}</span>
                      <span className={"grade-dot grade-" + b.grade} style={{ width: 16, height: 16, fontSize: 9 }}>{b.grade}</span>
                      <span>{b.name}</span>
                    </div>
                    {r.note && <div className="rule-note">{r.note}</div>}
                  </div>
                  <button className="rule-icon-btn" title="Delete rule" onClick={() => onDeleteRule(r.id)}>
                    <Icon.Trash />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === "tags" && (
        <div className="side-body">
          <div className="tag-block">
            <h4>Attribute tags</h4>
            <div className="tag-grid">
              {TAGS_POOL.map(t => {
                const count = students.filter(s => s.tags?.includes(t.id)).length;
                return (
                  <span key={t.id} className={"tag-chip lg " + t.cls}>
                    {t.label}
                    <span style={{ opacity: 0.65, fontFamily: "var(--ff-mono)", fontSize: 10, marginLeft: 4 }}>{count}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="tag-block">
            <h4>How tags affect seating</h4>
            <div className="helper" style={{ lineHeight: 1.55 }}>
              <p style={{ margin: "0 0 8px" }}><strong style={{color:"var(--ink)"}}>Nut allergy</strong> — clustered at the same table for safe lunch monitoring.</p>
              <p style={{ margin: "0 0 8px" }}><strong style={{color:"var(--ink)"}}>Needs aisle</strong> — placed at tables nearest the cafeteria door.</p>
              <p style={{ margin: "0 0 8px" }}><strong style={{color:"var(--ink)"}}>Lunch helper</strong> — spread one per table when possible.</p>
              <p style={{ margin: "0 0 8px" }}><strong style={{color:"var(--ink)"}}>Shy / Energetic</strong> — informational; affects manual placement decisions.</p>
            </div>
          </div>
          <div className="tag-block">
            <h4>Custom tags (coming soon)</h4>
            <button className="btn sm" disabled style={{ opacity: 0.5 }}>
              <Icon.Plus />New tag
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
window.Sidebar = Sidebar;
