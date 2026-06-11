function Sidebar({
  students, rules, tables, assignments,
  tags, tagsIndex,
  groups, groupsIndex, groupNoun,
  selectedId, onSelect,
  searchQuery, setSearchQuery,
  activeTab, setActiveTab,
  onAddRule, onDeleteRule, onAddGuest,
  onAddTag, onEditTag, onDeleteTag,
  onDragStartStudent,
}) {
  const { Icon, TagChip, tagBehaviorLabel } = window;
  const tagIdx = tagsIndex || {};
  const grpIdx = groupsIndex || {};
  const grps = groups || [];
  const noun = groupNoun || "Group";

  // Map studentId -> tableId
  const placedOf = React.useMemo(() => {
    const m = {};
    Object.entries(assignments).forEach(([tid, arr]) => arr.forEach(sid => { m[sid] = tid; }));
    return m;
  }, [assignments]);

  const tabs = [
    { id: "guests", label: "Guests", count: students.length },
    { id: "rules",  label: "Rules",  count: rules.length },
    { id: "tags",   label: "Tags",   count: tags.length },
  ];

  // Filter + group students
  const filtered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter(s => {
      if (!q) return true;
      const groupLabel = (grpIdx[s.group]?.label || s.group || "").toLowerCase();
      return s.name.toLowerCase().includes(q) ||
        `${noun} ${groupLabel}`.toLowerCase().includes(q) ||
        groupLabel.includes(q) ||
        (s.tags || []).join(" ").includes(q) ||
        (s.teacher || "").toLowerCase().includes(q);
    });
  }, [students, searchQuery, grpIdx, noun]);

  const grouped = React.useMemo(() => {
    const g = {};
    filtered.forEach(s => {
      const k = s.group;
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
                placeholder={`Search by name, ${noun.toLowerCase()}, tag…`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <button className="btn icon" onClick={onAddGuest} title="Add guest"><Icon.Plus /></button>
          </div>
          <div className="side-body">
            {grps.map(g => grouped[g.id] && (
              <div key={g.id}>
                <div className="guest-group-head">
                  <span>{noun} {g.label}</span>
                  <span>{grouped[g.id].length}</span>
                </div>
                {grouped[g.id].map(s => (
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
                    <span className="grade-dot" style={{ background: grpIdx[s.group]?.color }}>{g.label}</span>
                    <span className="name">
                      {s.name}
                      {s.class ? <span className="class">·{s.class}</span> : null}
                    </span>
                    <span className="meta">
                      {(s.tags || []).slice(0, 2).map(t => {
                        const def = tagIdx[t];
                        if (!def) return null;
                        return <TagChip key={t} tag={def} short />;
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ))}
            {!filtered.length && <div className="helper" style={{ padding: 20, textAlign: "center" }}>
              {searchQuery.trim()
                ? `No names match "${searchQuery}"`
                : "No names yet — add or import to get started."}
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
                No rules yet. Rules let you keep certain names together or apart.
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
                      <span className="grade-dot" style={{ width: 16, height: 16, fontSize: 9, background: grpIdx[a.group]?.color }}>{grpIdx[a.group]?.label || a.group}</span>
                      <span>{a.name}</span>
                      <span style={{ color: "var(--ink-3)" }}>{r.kind === "together" ? "↔" : "⤬"}</span>
                      <span className="grade-dot" style={{ width: 16, height: 16, fontSize: 9, background: grpIdx[b.group]?.color }}>{grpIdx[b.group]?.label || b.group}</span>
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
            <div className="tag-block-head">
              <h4>Tags</h4>
              <button className="btn sm" onClick={onAddTag}><Icon.Plus />New tag</button>
            </div>
            <div className="tag-list">
              {tags.map(t => {
                const count = students.filter(s => s.tags?.includes(t.id)).length;
                return (
                  <div key={t.id} className="tag-list-row">
                    <TagChip tag={t} lg />
                    <span className={"tag-behavior behavior-" + (t.behavior || "none")}>
                      {tagBehaviorLabel(t.behavior)}
                    </span>
                    <span className="tag-count">{count}</span>
                    {t.custom && (
                      <span className="tag-row-actions">
                        <button className="rule-icon-btn" title="Edit tag" onClick={() => onEditTag(t.id)}><Icon.Settings /></button>
                        <button className="rule-icon-btn" title="Delete tag" onClick={() => onDeleteTag(t.id)}><Icon.Trash /></button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="tag-block">
            <h4>How tags affect seating</h4>
            <div className="helper" style={{ lineHeight: 1.55 }}>
              <p style={{ margin: "0 0 8px" }}><strong style={{color:"var(--ink)"}}>Cluster together</strong> — groups everyone with the tag at the same table.</p>
              <p style={{ margin: "0 0 8px" }}><strong style={{color:"var(--ink)"}}>Spread apart</strong> — places at most one per table when possible.</p>
              <p style={{ margin: "0 0 8px" }}><strong style={{color:"var(--ink)"}}>Seat near door</strong> — prefers tables closest to the entrance.</p>
              <p style={{ margin: "0 0 8px" }}><strong style={{color:"var(--ink)"}}>Seat near front</strong> — prefers tables nearest the front (top) of the room.</p>
              <p style={{ margin: "0 0 8px" }}><strong style={{color:"var(--ink)"}}>Informational</strong> — no effect on auto-arrange; helps manual decisions.</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
window.Sidebar = Sidebar;
