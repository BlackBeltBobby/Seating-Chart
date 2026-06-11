function Toolbar({
  monthIndex, onMonth, months,
  onImport, onSolve, onExport, onAddRule,
  solving, events, currentEventId, onSelectEvent, hasConflicts,
  onToggleInspector, inspectorOpen,
}) {
  const { Icon } = window;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const list = events || [];
  const current = list.find(e => e.id === currentEventId) || list[0] || { kindLabel: "Event", name: "" };

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
            <div className="kind">{current.kindLabel}</div>
            <div className="name">{current.name}</div>
          </div>
          <Icon.Chev className="chev" />
        </button>
        {menuOpen && (
          <div className="event-menu" role="menu">
            {list.map(ev => (
              <button
                key={ev.id}
                className={"event-menu-item" + (ev.id === currentEventId ? " active" : "")}
                role="menuitemradio"
                aria-checked={ev.id === currentEventId}
                onClick={() => { onSelectEvent(ev.id); setMenuOpen(false); }}
              >
                <div className="event-menu-text">
                  <div className="kind">{ev.kindLabel}</div>
                  <div className="name">{ev.name}</div>
                </div>
                {ev.id === currentEventId && <Icon.Check />}
              </button>
            ))}
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
