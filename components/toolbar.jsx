function Toolbar({
  monthIndex, onMonth, months,
  onImport, onSolve, onExport, onAddRule,
  solving,
  charts, activeId, maxCharts,
  onSelectChart, onNewChart, onChangeStyle, onDeleteChart,
  hasConflicts,
  onToggleInspector, inspectorOpen,
}) {
  const { Icon, ChartKinds } = window;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const list = charts || [];
  const current = list.find(c => c.id === activeId) || list[0] || { name: "—", kind: "school" };
  const kindLabel = (k) => (ChartKinds[k] && ChartKinds[k].label) || "Chart";
  const atCap = list.length >= (maxCharts || Infinity);

  return (
    <div className="toolbar">
      <div className="brand">
        <div className="brand-mark">s</div>
        <div className="brand-name">seat<em>ery</em></div>
      </div>

      <div className="event-switch-wrap" ref={menuRef}>
        <button className="event-switch" onClick={() => setMenuOpen(o => !o)} aria-haspopup="true" aria-expanded={menuOpen}>
          <Icon.School />
          <div>
            <div className="kind">{kindLabel(current.kind)}</div>
            <div className="name">{current.name}</div>
          </div>
          <Icon.Chev className="chev" />
        </button>
        {menuOpen && (
          <div className="event-menu" role="menu">
            {list.map(c => (
              <div key={c.id} className={"event-menu-item" + (c.id === activeId ? " active" : "")} role="menuitemradio" aria-checked={c.id === activeId}>
                <button
                  className="event-menu-main"
                  onClick={() => { onSelectChart(c.id); setMenuOpen(false); }}
                >
                  <div className="event-menu-text">
                    <div className="kind">{kindLabel(c.kind)}</div>
                    <div className="name">{c.name}</div>
                  </div>
                  {c.id === activeId && <Icon.Check />}
                </button>
                <span className="chart-row-actions">
                  <button className="rule-icon-btn" title="Change style" onClick={() => { onChangeStyle(c.id); setMenuOpen(false); }}>
                    <Icon.Settings />
                  </button>
                  <button className="rule-icon-btn" title="Delete chart" onClick={() => { onDeleteChart(c.id); }}>
                    <Icon.Trash />
                  </button>
                </span>
              </div>
            ))}
            <div className="event-menu-divider" />
            <button
              className="event-menu-new"
              disabled={atCap}
              title={atCap ? `Limit reached (${maxCharts})` : "Create a new chart"}
              onClick={() => { if (!atCap) { onNewChart(); setMenuOpen(false); } }}
            >
              <Icon.Plus />
              {atCap ? `New chart — limit reached (${maxCharts})` : "New chart"}
            </button>
          </div>
        )}
      </div>

      <div className="month-picker" title="Pick the month">
        <button onClick={() => onMonth(Math.max(0, monthIndex - 1))} aria-label="Prev month"><Icon.ChevLeft /></button>
        <div className="label">{months[monthIndex]}</div>
        <button onClick={() => onMonth(Math.min(months.length - 1, monthIndex + 1))} aria-label="Next month"><Icon.ChevRight /></button>
      </div>

      {hasConflicts ? (
        <span className="banner danger">
          <Icon.Alert />
          <span><strong>{hasConflicts}</strong> conflict{hasConflicts > 1 ? "s" : ""}</span>
        </span>
      ) : (
        <span className="banner" style={{ color: "var(--accent)" }}>
          <Icon.Check />
          <span>No rule conflicts</span>
        </span>
      )}

      <div className="toolbar-spacer" />

      <button className="btn sm" onClick={onImport}><Icon.Upload />Import roster</button>
      <button className="btn sm" onClick={onAddRule}><Icon.Link />Add rule</button>
      <button className="btn sm" onClick={onExport}><Icon.Download />Export</button>
      <button className="btn accent" onClick={onSolve} disabled={solving}>
        <Icon.Sparkle />
        {solving ? "Arranging…" : "Auto-arrange"}
      </button>
      <button className="btn icon" onClick={onToggleInspector} title={inspectorOpen ? "Hide inspector" : "Show inspector"}>
        <Icon.Eye />
      </button>
    </div>
  );
}
window.Toolbar = Toolbar;
