/* ==========================================================================
   Modals — Import CSV, Add Rule, Export, Add Guest
   ========================================================================== */

function Modal({ title, onClose, children, footer, size }) {
  const { Icon } = window;
  React.useEffect(() => {
    const fn = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal " + (size === "lg" ? "lg" : "")}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn icon ghost" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImport }) {
  const { Icon } = window;
  const { csvToStudents, SAMPLE_CSV } = window.Seatery;
  const [csv, setCsv] = React.useState("");
  const [mode, setMode] = React.useState("append"); // append or replace
  const parsed = React.useMemo(() => {
    if (!csv.trim()) return { rows: [], headers: [] };
    return window.Seatery.parseCSV(csv);
  }, [csv]);
  const previewStudents = React.useMemo(() => csv.trim() ? csvToStudents(csv) : [], [csv]);

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
        Paste CSV or tab-separated data below. Columns: <code style={{ background: "var(--bg-deep)", padding: "1px 5px", borderRadius: 3, fontFamily: "var(--ff-mono)" }}>first, last, grade, class, teacher, tags, notes</code>. Multiple tags use <code style={{ background: "var(--bg-deep)", padding: "1px 5px", borderRadius: 3, fontFamily: "var(--ff-mono)" }}>|</code>.
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
                <span className={"grade-dot grade-" + (s.grade || "K")}>{s.grade}</span>
                <span className="name">{s.name} <span className="class">·{s.class}</span></span>
                <span className="meta">
                  {(s.tags || []).map(t => {
                    const def = window.Seatery.TAGS_INDEX[t]; if (!def) return null;
                    return <span key={t} className={"tag-chip " + def.cls}>{def.label.split(" ")[0]}</span>;
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

function RuleModal({ onClose, onSave, students, defaultKind, defaultA }) {
  const { Icon } = window;
  const [kind, setKind] = React.useState(defaultKind || "together");
  const [a, setA] = React.useState(defaultA || "");
  const [b, setB] = React.useState("");
  const [note, setNote] = React.useState("");

  const sortedStudents = React.useMemo(
    () => students.slice().sort((x, y) => x.name.localeCompare(y.name)),
    [students]
  );

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
            {sortedStudents.map(s => <option key={s.id} value={s.id}>{s.name} (Grade {s.grade}{s.class})</option>)}
          </select>
        </div>
        <div className="field">
          <label>Student B</label>
          <select value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">— pick a student —</option>
            {sortedStudents.filter(s => s.id !== a).map(s => <option key={s.id} value={s.id}>{s.name} (Grade {s.grade}{s.class})</option>)}
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

function GuestModal({ onClose, onSave, students, editingId }) {
  const { TAGS_POOL } = window.Seatery;
  const editing = editingId && students.find(s => s.id === editingId);
  const [first, setFirst] = React.useState(editing?.first || "");
  const [last, setLast] = React.useState(editing?.last || "");
  const [grade, setGrade] = React.useState(editing?.grade || "K");
  const [klass, setKlass] = React.useState(editing?.class || "A");
  const [teacher, setTeacher] = React.useState(editing?.teacher || "");
  const [tags, setTags] = React.useState(editing?.tags || []);
  const [notes, setNotes] = React.useState(editing?.notes || "");

  function toggleTag(t) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  return (
    <Modal
      title={editing ? "Edit student" : "Add student"}
      onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!first.trim() || !last.trim()}
          onClick={() => {
            onSave({ id: editing?.id, first: first.trim(), last: last.trim(),
              name: `${first.trim()} ${last.trim()}`, grade, class: klass, teacher,
              tags, gradeIndex: ["K","1","2","3","4"].indexOf(grade), notes });
            onClose();
          }}>{editing ? "Save changes" : "Add student"}</button>
      </>}
    >
      <div className="field-grid">
        <div className="field"><label>First name</label><input value={first} onChange={e => setFirst(e.target.value)} /></div>
        <div className="field"><label>Last name</label><input value={last} onChange={e => setLast(e.target.value)} /></div>
        <div className="field"><label>Grade</label>
          <select value={grade} onChange={e => setGrade(e.target.value)}>
            {["K","1","2","3","4"].map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="field"><label>Class</label>
          <select value={klass} onChange={e => setKlass(e.target.value)}>
            <option>A</option><option>B</option>
          </select>
        </div>
        <div className="field full"><label>Teacher</label><input value={teacher} onChange={e => setTeacher(e.target.value)} placeholder="Ms. Reyes" /></div>
        <div className="field full">
          <label>Tags</label>
          <div className="tag-grid" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TAGS_POOL.map(t => (
              <button key={t.id} type="button"
                onClick={() => toggleTag(t.id)}
                style={{
                  border: tags.includes(t.id) ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                  background: tags.includes(t.id) ? "var(--accent-soft)" : "var(--surface)",
                  borderRadius: 999, padding: "3px 10px", fontSize: 12, cursor: "pointer",
                  color: tags.includes(t.id) ? "var(--accent)" : "var(--ink-2)", fontWeight: 500,
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field full"><label>Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra context…" /></div>
      </div>
    </Modal>
  );
}

window.Modal = Modal;
window.ImportModal = ImportModal;
window.RuleModal = RuleModal;
window.ExportModal = ExportModal;
window.GuestModal = GuestModal;
