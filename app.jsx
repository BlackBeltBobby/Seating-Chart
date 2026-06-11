/* ==========================================================================
   Seatery — main app
   ========================================================================== */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "chalkboard",
  "showNames": false
}/*EDITMODE-END*/;

const defaultTags = () => JSON.parse(JSON.stringify(window.Seatery.TAGS_POOL));

function App() {
  const { Seatery, Solver, Toolbar, Sidebar, Canvas, Inspector,
          ImportModal, RuleModal, ExportModal, GuestModal, TagModal,
          TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakToggle } = window;

  // ----- Tweaks -----
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ----- Event selection -----
  const [eventId, setEventId] = React.useState("school");
  // Snapshots of each event's working state, so switching back restores it.
  const eventStatesRef = React.useRef({});

  // ----- Core state -----
  const [students, setStudents] = React.useState(() => Seatery.studentsAll);
  const [rules, setRules] = React.useState(() => Seatery.rules);
  const [tables, setTables] = React.useState(() => Seatery.buildTables());
  const [tags, setTags] = React.useState(defaultTags);

  // assignments per month: { monthIndex: { tableId: [studentIds] } }
  const [history, setHistory] = React.useState([]);
  const [monthIndex, setMonthIndex] = React.useState(0);
  // current month assignments
  const [assignments, setAssignments] = React.useState({});

  const [selected, setSelected] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("guests");
  const [solving, setSolving] = React.useState(false);
  const [showNames, setShowNames] = React.useState(TWEAK_DEFAULTS.showNames);
  const [inspectorOpen, setInspectorOpen] = React.useState(true);
  const [toasts, setToasts] = React.useState([]);

  // Modals
  const [importOpen, setImportOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [ruleModal, setRuleModal] = React.useState(null); // null | {kind, defaultA}
  const [guestModal, setGuestModal] = React.useState(null); // null | {editingId?}
  const [tagModal, setTagModal] = React.useState(null); // null | {editingId?}

  // Quick lookup from tag id -> tag definition
  const tagsIndex = React.useMemo(
    () => Object.fromEntries(tags.map(tg => [tg.id, tg])),
    [tags]
  );

  // ----- Listen for global cross-pane selection events -----
  React.useEffect(() => {
    function handler(e) { setSelected(e.detail); }
    window.addEventListener("seatery:select", handler);
    return () => window.removeEventListener("seatery:select", handler);
  }, []);

  // React to theme tweak
  const themeAttr = t.theme || "chalkboard";

  // ----- Switch event, preserving each event's working state -----
  const currentEvent = window.SeateryEvents.find(e => e.id === eventId) || window.SeateryEvents[0];
  function switchEvent(newId) {
    if (newId === eventId) return;
    // Snapshot the live state under the current event
    eventStatesRef.current[eventId] = { students, rules, tables, history, monthIndex, assignments, tags };
    const saved = eventStatesRef.current[newId];
    if (saved) {
      setStudents(saved.students);
      setRules(saved.rules);
      setTables(saved.tables);
      setHistory(saved.history);
      setMonthIndex(saved.monthIndex);
      setAssignments(saved.assignments);
      setTags(saved.tags);
    } else {
      const ev = window.SeateryEvents.find(e => e.id === newId);
      const built = ev.build();
      setStudents(built.students);
      setRules(built.rules);
      setTables(built.tables);
      setHistory([]);
      setMonthIndex(0);
      setAssignments({});
      setTags(defaultTags());
    }
    setEventId(newId);
    setSelected(null);
  }

  // Conflicts (live audit)
  const conflicts = React.useMemo(
    () => Solver.audit({ assignments, students, rules, tables }),
    [assignments, students, rules, tables]
  );

  // ----- Toast -----
  function toast(text) {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter(x => x.id !== id)), 2600);
  }

  // ----- Solver -----
  function runSolver({ silent } = {}) {
    setSolving(true);
    setTimeout(() => {
      const result = Solver.solve({
        students, tables, rules,
        history: history.slice(0, monthIndex),
        seed: 1000 + monthIndex,
        tagsIndex,
      });
      setAssignments(result.assignments);
      setSolving(false);
      if (!silent) {
        const c = result.conflicts.length;
        toast(c ? `Arranged with ${c} fallback placement${c>1?"s":""}.` : `Arranged ${students.length} students across ${tables.length} tables.`);
      }
    }, 700);
  }

  // ----- Month change saves current to history -----
  function changeMonth(newIdx) {
    if (newIdx === monthIndex) return;
    setHistory(prev => {
      const next = prev.slice();
      next[monthIndex] = { label: Seatery.MONTHS[monthIndex], assignments };
      return next;
    });
    setMonthIndex(newIdx);
    // Load existing assignments for that month if any
    const existing = history[newIdx];
    setAssignments(existing?.assignments || {});
    setSelected(null);
  }

  // ----- Mutations -----
  function moveStudentToTable(studentId, tableId) {
    setAssignments(prev => {
      const next = {};
      // remove from any current table
      Object.entries(prev).forEach(([tid, arr]) => {
        next[tid] = arr.filter(id => id !== studentId);
      });
      // ensure target exists
      next[tableId] = next[tableId] || [];
      const targetTable = tables.find(t => t.id === tableId);
      if (targetTable && next[tableId].length >= window.TableGeom.capacity(targetTable)) {
        toast("Table " + targetTable.label + " is full.");
        return prev;
      }
      next[tableId] = [...(next[tableId] || []), studentId];
      return next;
    });
  }
  function unseat(studentId) {
    setAssignments(prev => {
      const next = {};
      Object.entries(prev).forEach(([tid, arr]) => {
        next[tid] = arr.filter(id => id !== studentId);
      });
      return next;
    });
  }
  function moveTable(tableId, x, y) {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, x, y } : t));
  }
  function rotateTable(tableId, deg) {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, rotation: deg } : t));
  }
  function updateTable(tableId, patch) {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...patch } : t));
  }
  function deleteTable(tableId) {
    if (!confirm("Delete this table? Students seated here will be unseated.")) return;
    setTables(prev => prev.filter(t => t.id !== tableId));
    setAssignments(prev => { const n = { ...prev }; delete n[tableId]; return n; });
    if (selected?.kind === "table" && selected.id === tableId) setSelected(null);
  }
  function duplicateTable(tableId) {
    const t = tables.find(x => x.id === tableId);
    if (!t) return;
    const copy = {
      ...JSON.parse(JSON.stringify(t)),
      id: "t" + Math.random().toString(36).slice(2, 7),
      x: t.x + 60, y: t.y + 60,
      label: t.label + "′",
    };
    setTables(prev => [...prev, copy]);
    setSelected({ kind: "table", id: copy.id });
    toast(`Table ${t.label} duplicated.`);
  }
  function addTable(kind) {
    const stageEl = document.querySelector(".stage");
    const t = window.TableGeom.defaultTable(kind, {
      label: String.fromCharCode(65 + tables.length % 26),
      x: 360 + (tables.length % 4) * 60,
      y: 360 + Math.floor(tables.length / 4) * 60,
    });
    setTables(prev => [...prev, t]);
    setSelected({ kind: "table", id: t.id });
    toast(`${kind === "head" ? "Head" : kind === "rect" ? "Rectangular" : "Round"} table added.`);
  }

  function addRule(rule) {
    const r = { id: "r" + Math.random().toString(36).slice(2, 7), ...rule };
    setRules(prev => [...prev, r]);
    toast(`Rule added: ${rule.kind === "together" ? "must sit together" : "keep apart"}.`);
  }
  function deleteRule(id) {
    setRules(prev => prev.filter(r => r.id !== id));
  }

  function importStudents(newStudents, mode) {
    if (mode === "replace") {
      setStudents(newStudents);
      setRules([]);
      setHistory([]);
      setAssignments({});
    } else {
      setStudents(prev => [...prev, ...newStudents]);
    }
    toast(`Imported ${newStudents.length} student${newStudents.length === 1 ? "" : "s"}.`);
  }

  function saveGuest(g) {
    setStudents(prev => {
      const exists = prev.find(s => s.id === g.id);
      if (exists) return prev.map(s => s.id === g.id ? { ...s, ...g } : s);
      const newOne = { ...g, id: "n" + Math.random().toString(36).slice(2,7) };
      return [...prev, newOne];
    });
  }
  function deleteStudent(id) {
    if (!confirm("Remove this student from the roster?")) return;
    setStudents(prev => prev.filter(s => s.id !== id));
    setRules(prev => prev.filter(r => r.a !== id && r.b !== id));
    unseat(id);
    setSelected(null);
  }

  // ----- Custom tags -----
  function saveTag(tag) {
    setTags(prev => {
      const exists = prev.find(x => x.id === tag.id);
      if (exists) return prev.map(x => x.id === tag.id ? { ...x, ...tag } : x);
      const id = "tag" + Math.random().toString(36).slice(2, 7);
      return [...prev, { ...tag, id, custom: true }];
    });
    toast(tag.id ? "Tag updated." : `Tag "${tag.label}" added.`);
  }
  function deleteTag(id) {
    setTags(prev => prev.filter(x => x.id !== id));
    // Strip the tag from every student that had it
    setStudents(prev => prev.map(s => ({ ...s, tags: (s.tags || []).filter(tg => tg !== id) })));
  }

  // ----- Export -----
  function exportCSV() {
    const placedOf = {};
    Object.entries(assignments).forEach(([tid, arr]) => arr.forEach(id => placedOf[id] = tid));
    const head = ["first","last","grade","class","teacher","tags","table","seat","notes"];
    const lines = [head.join(",")];
    students.forEach(s => {
      const tid = placedOf[s.id];
      const t = tables.find(x => x.id === tid);
      const seatNo = tid ? (assignments[tid].indexOf(s.id) + 1) : "";
      const row = [s.first, s.last, s.grade, s.class, s.teacher || "",
        (s.tags || []).join("|"), t ? t.label : "", seatNo, (s.notes || "").replace(/,/g, ";")];
      lines.push(row.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g,'""')}"` : c).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `seatery-${Seatery.MONTHS[monthIndex].replace(/\s/g, "-")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Roster exported.");
  }

  // ----- Render -----
  return (
    <>
      <div className={"app" + (inspectorOpen ? "" : " no-inspector")} data-theme={themeAttr}>
        <Toolbar
          monthIndex={monthIndex}
          months={Seatery.MONTHS}
          onMonth={changeMonth}
          onImport={() => setImportOpen(true)}
          onSolve={() => runSolver()}
          onExport={() => setExportOpen(true)}
          onAddRule={() => setRuleModal({ kind: "together" })}
          solving={solving}
          events={window.SeateryEvents}
          currentEventId={eventId}
          onSelectEvent={switchEvent}
          hasConflicts={conflicts.length}
          onToggleInspector={() => setInspectorOpen(v => !v)}
          inspectorOpen={inspectorOpen}
        />

        <Sidebar
          students={students}
          rules={rules}
          tables={tables}
          assignments={assignments}
          tags={tags}
          tagsIndex={tagsIndex}
          selectedId={selected?.kind === "student" ? selected.id : null}
          onSelect={setSelected}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onAddRule={(kind) => setRuleModal({ kind })}
          onDeleteRule={deleteRule}
          onAddGuest={() => setGuestModal({})}
          onAddTag={() => setTagModal({})}
          onEditTag={(id) => setTagModal({ editingId: id })}
          onDeleteTag={deleteTag}
        />

        <Canvas
          room={Seatery.ROOM}
          tables={tables}
          students={students}
          assignments={assignments}
          conflicts={conflicts}
          selected={selected}
          onSelect={setSelected}
          onMoveStudent={moveStudentToTable}
          onMoveTable={moveTable}
          onRotateTable={rotateTable}
          onAddTable={addTable}
          showNames={showNames}
          setShowNames={setShowNames}
          solving={solving}
        />

        {inspectorOpen && (
          <Inspector
            selected={selected}
            students={students}
            tables={tables}
            rules={rules}
            assignments={assignments}
            conflicts={conflicts}
            history={history}
            monthIndex={monthIndex}
            tags={tags}
            tagsIndex={tagsIndex}
            onClearSelection={() => setSelected(null)}
            onUnseat={unseat}
            onAddRule={(kind, defaultA) => setRuleModal({ kind, defaultA })}
            onDeleteRule={deleteRule}
            onEditStudent={(id) => setGuestModal({ editingId: id })}
            onDeleteStudent={deleteStudent}
            onUpdateTable={updateTable}
            onDeleteTable={deleteTable}
            onDuplicateTable={duplicateTable}
          />
        )}
      </div>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onImport={importStudents}
        tags={tags} tagsIndex={tagsIndex} />}
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} onExportCSV={exportCSV}
        onPrint={() => window.print()} students={students} monthIndex={monthIndex}
        months={Seatery.MONTHS} assignments={assignments} tables={tables} />}
      {ruleModal && <RuleModal onClose={() => setRuleModal(null)} onSave={addRule}
        students={students} defaultKind={ruleModal.kind} defaultA={ruleModal.defaultA} />}
      {guestModal && <GuestModal onClose={() => setGuestModal(null)} onSave={saveGuest}
        students={students} editingId={guestModal.editingId} availableTags={tags} />}
      {tagModal && <TagModal onClose={() => setTagModal(null)} onSave={saveTag}
        tags={tags} editingId={tagModal.editingId} />}

      <div className="toasts">
        {toasts.map(t => <div key={t.id} className="toast">{t.text}</div>)}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakRadio
            label="Mood"
            value={t.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "chalkboard", label: "Chalkboard" },
              { value: "ink",        label: "Mono" },
              { value: "sunrise",    label: "Sunrise" },
            ]}
          />
        </TweakSection>
        <TweakSection label="Floor plan">
          <TweakToggle label="Show all names" value={showNames}
            onChange={(v) => { setShowNames(v); setTweak("showNames", v); }} />
          <div style={{ padding: "0 14px 8px", color: "var(--ink-3)", fontSize: 12, lineHeight: 1.45 }}>
            Tables now configure independently — select one to set its shape, seats per side, and rotation.
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
