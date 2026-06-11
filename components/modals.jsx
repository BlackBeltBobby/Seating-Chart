/* ==========================================================================
   Modals — Import CSV, Add Rule, Export, Add Guest
   ========================================================================== */

function Modal({ title, onClose, children, footer, size, dismissible = true }) {
  const { Icon } = window;
  React.useEffect(() => {
    if (!dismissible) return undefined;
    const fn = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, dismissible]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => dismissible && e.target === e.currentTarget && onClose()}>
      <div className={"modal " + (size === "lg" ? "lg" : "")}>
        <div className="modal-head">
          <h3>{title}</h3>
          {dismissible && <button className="btn icon ghost" onClick={onClose}><Icon.X /></button>}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImport, tags, tagsIndex, groups, groupsIndex, groupNoun }) {
  const { Icon, TagChip } = window;
  const { csvToStudents, SAMPLE_CSV } = window.Seatery;
  const tagIdx = tagsIndex || {};
  const grpIdx = groupsIndex || {};
  const [csv, setCsv] = React.useState("");
  const [mode, setMode] = React.useState("append"); // append or replace
  const parsed = React.useMemo(() => {
    if (!csv.trim()) return { rows: [], headers: [] };
    return window.Seatery.parseCSV(csv);
  }, [csv]);
  const previewStudents = React.useMemo(() => csv.trim() ? csvToStudents(csv, tags, groups) : [], [csv, tags, groups]);

  return (
    <Modal
      size="lg"
      title="Import roster"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!previewStudents.length}
            onClick={() => { onImport(previewStudents, mode); onClose(); }}>
            <Icon.Upload />Import {previewStudents.length || ""} student{previewStudents.length === 1 ? "" : "s"}
          </button>
        </>
      }
    >
      <div className="helper" style={{ marginBottom: 10 }}>
        Paste CSV or tab-separated data below. Columns: <code style={{ background: "var(--bg-deep)", padding: "1px 5px", borderRadius: 3, fontFamily: "var(--ff-mono)" }}>first, last, group, class, teacher, tags, notes</code>. The <code style={{ background: "var(--bg-deep)", padding: "1px 5px", borderRadius: 3, fontFamily: "var(--ff-mono)" }}>group</code> column maps to this chart's {groupNoun ? groupNoun.toLowerCase() : "group"}s ({(groups || []).map(g => g.label).join(", ")}); unmatched values fall to the first. Multiple tags use <code style={{ background: "var(--bg-deep)", padding: "1px 5px", borderRadius: 3, fontFamily: "var(--ff-mono)" }}>|</code>.
      </div>
      <textarea
        className="csv"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={SAMPLE_CSV}
      />
      <div style={{ marginTop: 10, display: "flex", gap: 16, alignItems: "center" }}>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="radio" name="mode" checked={mode === "append"} onChange={() => setMode("append")} />
          Append to existing roster
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} />
          Replace existing roster
        </label>
        <span style={{ marginLeft: "auto" }} className="helper">
          {parsed.rows.length ? `${parsed.rows.length} rows · ${parsed.headers.length} columns` : "No data yet"}
        </span>
      </div>
      <button
        className="btn sm"
        style={{ marginTop: 12 }}
        onClick={() => setCsv(SAMPLE_CSV)}
      >Use sample data</button>

      {previewStudents.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h5 style={{ margin: "0 0 8px", fontSize: 11, fontFamily: "var(--ff-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)" }}>
            Preview ({previewStudents.length})
          </h5>
          <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid var(--line)", borderRadius: 8 }}>
            {previewStudents.slice(0, 12).map(s => (
              <div key={s.id} className="guest-row" style={{ borderBottom: "1px solid var(--line)" }}>
                <span className="grade-dot" style={{ background: grpIdx[s.group]?.color }}>{grpIdx[s.group]?.label || s.group}</span>
                <span className="name">{s.name}{s.class ? <span className="class">·{s.class}</span> : null}</span>
                <span className="meta">
                  {(s.tags || []).map(t => {
                    const def = tagIdx[t]; if (!def) return null;
                    return <TagChip key={t} tag={def} short />;
                  })}
                </span>
              </div>
            ))}
            {previewStudents.length > 12 && (
              <div className="helper" style={{ padding: 10, textAlign: "center" }}>
                + {previewStudents.length - 12} more
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function RuleModal({ onClose, onSave, students, defaultKind, defaultA, groupsIndex }) {
  const { Icon } = window;
  const grpIdx = groupsIndex || {};
  const [kind, setKind] = React.useState(defaultKind || "together");
  const [a, setA] = React.useState(defaultA || "");
  const [b, setB] = React.useState("");
  const [note, setNote] = React.useState("");

  const sortedStudents = React.useMemo(
    () => students.slice().sort((x, y) => x.name.localeCompare(y.name)),
    [students]
  );
  const grpLabel = (s) => grpIdx[s.group]?.label || s.group || "";

  return (
    <Modal
      title="New seating rule"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!a || !b || a === b}
            onClick={() => { onSave({ kind, a, b, note }); onClose(); }}>
            <Icon.Link />Save rule
          </button>
        </>
      }
    >
      <div className="helper" style={{ marginBottom: 14 }}>
        Rules connect two students. <strong style={{ color: "var(--accent)" }}>Together</strong> places them at the same table.
        <strong style={{ color: "var(--danger)" }}> Apart</strong> keeps them at different tables.
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button className={"btn " + (kind === "together" ? "accent" : "")} onClick={() => setKind("together")}>
          Must sit together
        </button>
        <button className={"btn " + (kind === "apart" ? "primary" : "")} style={kind === "apart" ? { background: "var(--danger)", borderColor: "var(--danger)" } : null} onClick={() => setKind("apart")}>
          Keep apart
        </button>
      </div>
      <div className="field-grid">
        <div className="field">
          <label>Student A</label>
          <select value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">— pick a student —</option>
            {sortedStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({grpLabel(s)}{s.class})</option>)}
          </select>
        </div>
        <div className="field">
          <label>Student B</label>
          <select value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">— pick a student —</option>
            {sortedStudents.filter(s => s.id !== a).map(s => <option key={s.id} value={s.id}>{s.name} ({grpLabel(s)}{s.class})</option>)}
          </select>
        </div>
        <div className="field full">
          <label>Reason (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. siblings, recently fell out, speech buddy…" />
        </div>
      </div>
    </Modal>
  );
}

function ExportModal({ onClose, onExportCSV, onPrint, students, monthIndex, months, assignments, tables }) {
  const { Icon } = window;
  const total = students.length;
  const seated = Object.values(assignments).flat().length;

  return (
    <Modal
      title="Export & share"
      onClose={onClose}
      footer={<button className="btn primary" onClick={onClose}>Done</button>}
    >
      <div className="preview-stats">
        <div className="stat"><div className="v">{total}</div><div className="l">Students</div></div>
        <div className="stat"><div className="v">{tables.length}</div><div className="l">Tables</div></div>
        <div className="stat"><div className="v">{seated}</div><div className="l">Seated</div></div>
        <div className="stat"><div className="v">{months[monthIndex].split(" ")[0].slice(0, 3)}</div><div className="l">Month</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <button className="btn" onClick={onExportCSV} style={{ padding: 14, flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
          <Icon.Download />
          <div>
            <div style={{ fontWeight: 500 }}>Download CSV</div>
            <div className="helper" style={{ marginTop: 2 }}>Roster + assignments</div>
          </div>
        </button>
        <button className="btn" onClick={onPrint} style={{ padding: 14, flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
          <Icon.Print />
          <div>
            <div style={{ fontWeight: 500 }}>Print chart</div>
            <div className="helper" style={{ marginTop: 2 }}>One page per table</div>
          </div>
        </button>
        <button className="btn" onClick={() => alert("Shareable link copied (mock).")} style={{ padding: 14, flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
          <Icon.Share />
          <div>
            <div style={{ fontWeight: 500 }}>Share link</div>
            <div className="helper" style={{ marginTop: 2 }}>View-only for staff</div>
          </div>
        </button>
      </div>
    </Modal>
  );
}

function GuestModal({ onClose, onSave, students, editingId, availableTags, groups, groupNoun, fields }) {
  const tagPool = availableTags || window.Seatery.TAGS_POOL;
  const grps = (groups && groups.length) ? groups : [{ id: "K", label: "K" }];
  const flds = fields || { class: false, teacher: false };
  const editing = editingId && students.find(s => s.id === editingId);
  const [first, setFirst] = React.useState(editing?.first || "");
  const [last, setLast] = React.useState(editing?.last || "");
  const [group, setGroup] = React.useState(editing?.group || grps[0].id);
  const [klass, setKlass] = React.useState(editing?.class || "A");
  const [teacher, setTeacher] = React.useState(editing?.teacher || "");
  const [tags, setTags] = React.useState(editing?.tags || []);
  const [notes, setNotes] = React.useState(editing?.notes || "");

  function toggleTag(t) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  return (
    <Modal
      title={editing ? "Edit guest" : "Add guest"}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!first.trim() || !last.trim()}
          onClick={() => {
            onSave({ id: editing?.id, first: first.trim(), last: last.trim(),
              name: `${first.trim()} ${last.trim()}`, group, grade: group,
              class: flds.class ? klass : "", teacher: flds.teacher ? teacher : "",
              tags, notes });
            onClose();
          }}>{editing ? "Save changes" : "Add guest"}</button>
      </>}
    >
      <div className="field-grid">
        <div className="field"><label>First name</label><input value={first} onChange={e => setFirst(e.target.value)} /></div>
        <div className="field"><label>Last name</label><input value={last} onChange={e => setLast(e.target.value)} /></div>
        <div className="field"><label>{groupNoun || "Group"}</label>
          <select value={group} onChange={e => setGroup(e.target.value)}>
            {grps.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </div>
        {flds.class && (
          <div className="field"><label>Class</label>
            <select value={klass} onChange={e => setKlass(e.target.value)}>
              <option>A</option><option>B</option>
            </select>
          </div>
        )}
        {flds.teacher && (
          <div className="field full"><label>Teacher</label><input value={teacher} onChange={e => setTeacher(e.target.value)} placeholder="Ms. Reyes" /></div>
        )}
        <div className="field full">
          <label>Tags</label>
          <div className="tag-grid" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tagPool.map(t => {
              const on = tags.includes(t.id);
              const accent = t.color || "var(--accent)";
              return (
                <button key={t.id} type="button"
                  onClick={() => toggleTag(t.id)}
                  style={{
                    border: on ? "1.5px solid " + accent : "1px solid var(--line)",
                    background: on ? (t.color ? t.color + "22" : "var(--accent-soft)") : "var(--surface)",
                    borderRadius: 999, padding: "3px 10px", fontSize: 12, cursor: "pointer",
                    color: on ? accent : "var(--ink-2)", fontWeight: 500,
                  }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="field full"><label>Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra context…" /></div>
      </div>
    </Modal>
  );
}

function TagModal({ onClose, onSave, tags, editingId }) {
  const { Icon, TagChip, TAG_PALETTE, TAG_BEHAVIORS } = window;
  const editing = editingId && (tags || []).find(t => t.id === editingId);
  const [label, setLabel] = React.useState(editing?.label || "");
  const [color, setColor] = React.useState(editing?.color || TAG_PALETTE[0]);
  const [behavior, setBehavior] = React.useState(editing?.behavior || "none");

  const preview = { id: "preview", label: label.trim() || "New tag", color, behavior };
  const behaviorHint = (TAG_BEHAVIORS.find(b => b.value === behavior) || {}).hint;

  return (
    <Modal
      title={editing ? "Edit tag" : "New tag"}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!label.trim()}
          onClick={() => {
            onSave({ id: editing?.id, label: label.trim(), color, behavior });
            onClose();
          }}>{editing ? "Save changes" : "Add tag"}</button>
      </>}
    >
      <div className="field-grid">
        <div className="field full">
          <label>Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. VIP, vegetarian, family…" autoFocus />
        </div>
        <div className="field full">
          <label>Color</label>
          <div className="tag-palette">
            {TAG_PALETTE.map(c => (
              <button key={c} type="button"
                className={"tag-swatch" + (c === color ? " active" : "")}
                style={{ background: c }}
                aria-label={c}
                onClick={() => setColor(c)}>
                {c === color && <Icon.Check />}
              </button>
            ))}
          </div>
        </div>
        <div className="field full">
          <label>Seating behavior</label>
          <select value={behavior} onChange={e => setBehavior(e.target.value)}>
            {TAG_BEHAVIORS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          {behaviorHint && <div className="helper" style={{ marginTop: 6 }}>{behaviorHint}</div>}
        </div>
        <div className="field full">
          <label>Preview</label>
          <div><TagChip tag={preview} lg /></div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Create / change-style chart chooser ----------
function ChartModal({ firstRun, mode, current, onClose, onSubmit }) {
  const { Icon, ChartKinds, ChartKindOrder } = window;
  const isChange = mode === "change";
  const order = ChartKindOrder || Object.keys(ChartKinds);

  const [kind, setKind] = React.useState((current && current.kind) || order[0]);
  const [name, setName] = React.useState(
    (current && current.name) || (ChartKinds[(current && current.kind) || order[0]].defaultName)
  );
  const [seed, setSeed] = React.useState("sample"); // create-only: "sample" | "empty"
  const touchedName = React.useRef(isChange); // in change mode, treat name as user-owned

  function pickKind(k) {
    setKind(k);
    // Keep the name in sync with the kind default until the user edits it.
    if (!touchedName.current) setName(ChartKinds[k].defaultName);
  }

  const studentCount = (current && current.studentCount) || 0;
  const warnReset = isChange && studentCount > 0;

  function submit() {
    if (!name.trim()) return;
    if (isChange) onSubmit({ kind, name: name.trim() });
    else onSubmit({ kind, name: name.trim(), seed: seed === "sample" ? "demo" : "empty" });
  }

  return (
    <Modal
      title={isChange ? "Change chart style" : (firstRun ? "Create your first chart" : "New chart")}
      dismissible={!firstRun}
      onClose={onClose || (() => {})}
      footer={<>
        {!firstRun && <button className="btn ghost" onClick={onClose}>Cancel</button>}
        <button className="btn primary" disabled={!name.trim()} onClick={submit}>
          {isChange ? "Change style" : "Create chart"}
        </button>
      </>}
    >
      {firstRun && (
        <div className="helper" style={{ marginBottom: 14 }}>
          Welcome to Seatery. Pick a kind of chart to get started — you can create more later.
        </div>
      )}

      <label className="chart-modal-label">Style</label>
      <div className="kind-cards">
        {order.map(k => {
          const def = ChartKinds[k];
          return (
            <button
              key={k}
              type="button"
              className={"kind-card" + (k === kind ? " active" : "")}
              onClick={() => pickKind(k)}
            >
              <div className="kind-card-title">{def.label}{k === kind && <Icon.Check />}</div>
              <div className="kind-card-blurb">{def.blurb}</div>
            </button>
          );
        })}
      </div>

      <div className="field full" style={{ marginTop: 16 }}>
        <label>Name</label>
        <input
          value={name}
          autoFocus
          onChange={e => { touchedName.current = true; setName(e.target.value); }}
          placeholder={ChartKinds[kind].defaultName}
        />
      </div>

      {!isChange && (
        <div className="field full" style={{ marginTop: 12 }}>
          <label>Starting data</label>
          <div className="seed-toggle">
            <button type="button" className={"seed-opt" + (seed === "sample" ? " active" : "")} onClick={() => setSeed("sample")}>
              Load sample data
            </button>
            <button type="button" className={"seed-opt" + (seed === "empty" ? " active" : "")} onClick={() => setSeed("empty")}>
              Start empty
            </button>
          </div>
        </div>
      )}

      {warnReset && (
        <div className="chart-warn">
          <Icon.Alert />
          <span>Changing style will remove the {studentCount} guest{studentCount === 1 ? "" : "s"} and seating already in this chart.</span>
        </div>
      )}
    </Modal>
  );
}

window.Modal = Modal;
window.ImportModal = ImportModal;
window.RuleModal = RuleModal;
window.ExportModal = ExportModal;
window.GuestModal = GuestModal;
window.TagModal = TagModal;
window.ChartModal = ChartModal;
