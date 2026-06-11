function Toolbar({
  monthIndex, onMonth, months,
  onImport, onSolve, onExport, onAddRule,
  solving, eventName, hasConflicts,
  onToggleInspector, inspectorOpen,
}) {
  const { Icon } = window;
  return (
    <div className="toolbar">
      <div className="brand">
        <div className="brand-mark">s</div>
        <div className="brand-name">seat<em>ery</em></div>
      </div>

      <button className="event-switch" onClick={() => alert("In full version: switch between events (school, weddings, conferences).")}>
        <Icon.School />
        <div>
          <div className="kind">School cohort</div>
          <div className="name">{eventName}</div>
        </div>
        <Icon.Chev className="chev" />
      </button>

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
