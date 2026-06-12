/* ==========================================================================
   Seatery — main app
   ========================================================================== */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "chalkboard",
  "showNames": false
}/*EDITMODE-END*/;

// Hard cap on user-created charts (single source of truth — adjust here).
const MAX_CHARTS = 3;

// Seed a chart's tag pool from its kind's built-in tags (fall back to school).
const tagsForKind = (kind) =>
  JSON.parse(JSON.stringify((window.ChartKinds[kind] && window.ChartKinds[kind].tags) || window.Seatery.TAGS_POOL));

const EMPTY_STATE = {
  students: [], rules: [], tables: [], tags: [], room: null,
  history: [], monthIndex: 0, assignments: {},
};

function App() {
  const { Seatery, Solver, Toolbar, Sidebar, Canvas, Inspector,
          ImportModal, RuleModal, ExportModal, GuestModal, TagModal, ChartModal,
          ChartKinds, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakToggle } = window;

  // ----- Tweaks -----
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ----- Chart registry (persisted through the Store seam) -----
  const bootRef = React.useRef(window.Store.loadAll());
  const boot = bootRef.current;
  const bootCharts = (boot && boot.charts) || [];
  const bootActiveId =
    boot && boot.activeId && bootCharts.some(c => c.id === boot.activeId)
      ? boot.activeId
      : (bootCharts[0] && bootCharts[0].id) || null;
  const bootState = (bootCharts.find(c => c.id === bootActiveId) || {}).state || EMPTY_STATE;

  const [charts, setCharts] = React.useState(bootCharts);
  const [activeId, setActiveId] = React.useState(bootActiveId);
  const [chartModal, setChartModal] = React.useState(null); // null | {mode:"create"} | {mode:"change", id}

  // ----- Core working state — the live copy of the ACTIVE chart -----
  const [students, setStudents] = React.useState(() => bootState.students);
  const [rules, setRules] = React.useState(() => bootState.rules);
  const [tables, setTables] = React.useState(() => bootState.tables);
  const [tags, setTags] = React.useState(() => bootState.tags);
  const [history, setHistory] = React.useState(() => bootState.history);
  const [monthIndex, setMonthIndex] = React.useState(() => bootState.monthIndex || 0);
  const [assignments, setAssignments] = React.useState(() => bootState.assignments || {});
  const [room, setRoom] = React.useState(() => bootState.room || Seatery.ROOM);

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

  // ----- Active chart + its kind definition -----
  const activeChart = charts.find(c => c.id === activeId) || null;
  const kindDef = (activeChart && ChartKinds[activeChart.kind]) || ChartKinds.school;
  const groups = kindDef.groups;
  const groupNoun = kindDef.groupNoun;
  const fields = kindDef.fields;
  const groupsIndex = React.useMemo(
    () => Object.fromEntries(groups.map(g => [g.id, g])),
    [groups]
  );

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

  // ----- Chart lifecycle helpers -----
  const snapshotLive = () => ({ students, rules, tables, tags, history, monthIndex, assignments, room });
  // Reset per-chart view state when entering a different chart, so search/tab don't leak across charts.
  const resetView = () => { setSelected(null); setSearchQuery(""); setActiveTab("guests"); };
  // Return `charts` with the active entry refreshed from live working state.
  function commitLive(list) {
    if (!activeId) return list;
    return list.map(c => c.id === activeId ? { ...c, state: snapshotLive() } : c);
  }
  function hydrate(state) {
    setStudents(state.students);
    setRules(state.rules);
    setTables(state.tables);
    setTags(state.tags);
    setHistory(state.history);
    setMonthIndex(state.monthIndex || 0);
    setAssignments(state.assignments || {});
    setRoom(state.room || Seatery.ROOM);
  }

  function switchChart(id) {
    if (id === activeId) return;
    const committed = commitLive(charts);
    const target = committed.find(c => c.id === id);
    setCharts(committed);
    if (target) hydrate(target.state);
    setActiveId(id);
    resetView();
  }

  function createChart({ kind, name, seed, roomSize, roomW, roomH, roundCount, rectCount, seatsPerTable, people }) {
    if (charts.length >= MAX_CHARTS) {
      toast(`Chart limit reached (${MAX_CHARTS}). Delete one to add another.`);
      return;
    }
    const kd = ChartKinds[kind] || ChartKinds.school;
    // Room from preset or custom dims (already pixels); makeRoom clamps/defaults blanks.
    const newRoom = roomSize === "custom"
      ? Seatery.makeRoom({ w: roomW, h: roomH })
      : Seatery.makeRoom(Seatery.ROOM_PRESETS[roomSize] || Seatery.ROOM_PRESETS.medium);
    // Blank counts/seats/people fall through to the kind's defaults.
    const d = kd.defaults || {};
    const rRound = roundCount != null ? roundCount : d.roundCount;
    const rRect = rectCount != null ? rectCount : d.rectCount;
    const demo = seed === "demo" ? kd.buildDemo(people) : { students: [], rules: [] };
    const builtTables = kd.buildTables({ room: newRoom, roundCount: rRound, rectCount: rRect, seatsPerTable });
    const state = {
      students: demo.students, rules: demo.rules,
      tables: builtTables, tags: tagsForKind(kind), room: newRoom,
      history: [], monthIndex: 0, assignments: {},
    };
    const id = "ch" + Math.random().toString(36).slice(2, 8);
    const committed = commitLive(charts);
    setCharts([...committed, { id, name: (name && name.trim()) || kd.defaultName, kind, state }]);
    hydrate(state);
    setActiveId(id);
    setChartModal(null);
    resetView();
    toast(`Created “${(name && name.trim()) || kd.defaultName}”.`);
    // Only warn about a shortfall when the user explicitly asked for a count —
    // defaults are best-effort and fit silently.
    const explicit = roundCount != null || rectCount != null;
    const requested = (rRound || 0) + (rRect || 0);
    if (explicit && builtTables.length < requested) {
      toast(`Room fit ${builtTables.length} of ${requested} tables — enlarge the room or reduce tables.`);
    }
  }

  function deleteChart(id) {
    const c = charts.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Delete “${c.name}”? This removes its roster and seating.`)) return;
    const committed = commitLive(charts);
    const remaining = committed.filter(x => x.id !== id);
    setCharts(remaining);
    if (id === activeId) {
      if (remaining.length) {
        hydrate(remaining[0].state);
        setActiveId(remaining[0].id);
      } else {
        setActiveId(null); // no charts -> welcome chooser reopens
      }
      resetView();
    }
  }

  // Change a chart's kind. Resets contents (groups are kind-specific, so a remap
  // would be lossy); the UI confirms first when the chart is non-empty.
  function changeKind(id, newKind, newName) {
    const kd = ChartKinds[newKind] || ChartKinds.school;
    const committed = commitLive(charts);
    // Keep the chart's room across a style change; fit the new tables to it.
    const prev = committed.find(c => c.id === id);
    const keepRoom = (prev && prev.state && prev.state.room) || Seatery.ROOM;
    const newState = {
      students: [], rules: [],
      tables: kd.buildTables({ room: keepRoom }), tags: tagsForKind(newKind), room: keepRoom,
      history: [], monthIndex: 0, assignments: {},
    };
    setCharts(committed.map(c =>
      c.id === id ? { ...c, kind: newKind, name: (newName && newName.trim()) || c.name, state: newState } : c
    ));
    if (id === activeId) hydrate(newState);
    setChartModal(null);
    resetView();
    toast(`Style changed to ${kd.label}.`);
  }

  // ----- Persist (debounced) through the Store seam -----
  React.useEffect(() => {
    const payload = activeId ? { charts: commitLive(charts), activeId } : { charts, activeId: null };
    const h = setTimeout(() => window.Store.save(payload), 500);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charts, activeId, students, rules, tables, tags, history, monthIndex, assignments, room]);

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
        tagsIndex, room,
      });
      setAssignments(result.assignments);
      setSolving(false);
      if (!silent) {
        const c = result.conflicts.length;
        toast(c ? `Arranged with ${c} fallback placement${c>1?"s":""}.` : `Arranged ${students.length} guests across ${tables.length} tables.`);
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
    setTables(prev => {
      const t = prev.find(z => z.id === tableId);
      if (!t) return prev;
      const others = prev.filter(z => z.id !== tableId);
      const placed = window.TableGeom.resolveMove(t, x, y, others, room);
      return prev.map(z => z.id === tableId ? placed : z);
    });
  }
  function rotateTable(tableId, deg) {
    setTables(prev => {
      const t = prev.find(z => z.id === tableId);
      if (!t) return prev;
      const others = prev.filter(z => z.id !== tableId);
      const rotated = window.TableGeom.clampToRoom({ ...t, rotation: deg }, room);
      // Keep the rotation in place if it fits; otherwise nudge to a free spot.
      const placed = others.some(o => window.TableGeom.overlaps(rotated, o))
        ? (window.TableGeom.findFreeSpot({ ...t, rotation: deg }, others, room) || rotated)
        : rotated;
      return prev.map(z => z.id === tableId ? placed : z);
    });
  }
  function updateTable(tableId, patch) {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...patch } : t));
  }
  function deleteTable(tableId) {
    if (!confirm("Delete this table? Guests seated here will be unseated.")) return;
    setTables(prev => prev.filter(t => t.id !== tableId));
    setAssignments(prev => { const n = { ...prev }; delete n[tableId]; return n; });
    if (selected?.kind === "table" && selected.id === tableId) setSelected(null);
  }
  function duplicateTable(tableId) {
    const t = tables.find(x => x.id === tableId);
    if (!t) return;
    const copy = window.TableGeom.findFreeSpot({
      ...JSON.parse(JSON.stringify(t)),
      id: "t" + Math.random().toString(36).slice(2, 7),
      x: t.x + 60, y: t.y + 60,
      label: t.label + "′",
    }, tables, room);
    if (!copy) { toast("No room for another table — move or remove one first."); return; }
    setTables(prev => [...prev, copy]);
    setSelected({ kind: "table", id: copy.id });
    toast(`Table ${t.label} duplicated.`);
  }
  function addTable(kind) {
    const t = window.TableGeom.findFreeSpot(window.TableGeom.defaultTable(kind, {
      label: String.fromCharCode(65 + tables.length % 26),
      x: 360 + (tables.length % 4) * 60,
      y: 360 + Math.floor(tables.length / 4) * 60,
    }), tables, room);
    if (!t) { toast("No room for another table — move or remove one first."); return; }
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
    toast(`Imported ${newStudents.length} guest${newStudents.length === 1 ? "" : "s"}.`);
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
    if (!confirm("Remove this guest from the roster?")) return;
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
    const head = ["first","last","group","class","teacher","tags","table","seat","notes"];
    const lines = [head.join(",")];
    students.forEach(s => {
      const tid = placedOf[s.id];
      const t = tables.find(x => x.id === tid);
      const seatNo = tid ? (assignments[tid].indexOf(s.id) + 1) : "";
      const row = [s.first, s.last, s.group || s.grade, s.class, s.teacher || "",
        (s.tags || []).join("|"), t ? t.label : "", seatNo, (s.notes || "").replace(/,/g, ";")];
      lines.push(row.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g,'""')}"` : c).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = (activeChart ? activeChart.name : "seatery").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.href = url; a.download = `${slug}-${Seatery.MONTHS[monthIndex].replace(/\s/g, "-")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Roster exported.");
  }

  // ----- First run: no charts yet -> non-dismissible welcome chooser -----
  if (!activeChart) {
    return (
      <div className="app welcome-shell" data-theme={themeAttr}>
        <ChartModal firstRun mode="create" onSubmit={createChart} />
      </div>
    );
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
          charts={charts}
          activeId={activeId}
          maxCharts={MAX_CHARTS}
          onSelectChart={switchChart}
          onNewChart={() => setChartModal({ mode: "create" })}
          onChangeStyle={(id) => setChartModal({ mode: "change", id })}
          onDeleteChart={deleteChart}
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
          groups={groups}
          groupsIndex={groupsIndex}
          groupNoun={groupNoun}
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
          room={room}
          chartName={activeChart ? activeChart.name : ""}
          tables={tables}
          students={students}
          assignments={assignments}
          conflicts={conflicts}
          groupsIndex={groupsIndex}
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
            groups={groups}
            groupsIndex={groupsIndex}
            groupNoun={groupNoun}
            fields={fields}
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
        tags={tags} tagsIndex={tagsIndex} groups={groups} groupsIndex={groupsIndex} groupNoun={groupNoun} />}
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} onExportCSV={exportCSV}
        onPrint={() => window.print()} students={students} monthIndex={monthIndex}
        months={Seatery.MONTHS} assignments={assignments} tables={tables} />}
      {ruleModal && <RuleModal onClose={() => setRuleModal(null)} onSave={addRule}
        students={students} defaultKind={ruleModal.kind} defaultA={ruleModal.defaultA}
        groups={groups} groupsIndex={groupsIndex} />}
      {guestModal && <GuestModal onClose={() => setGuestModal(null)} onSave={saveGuest}
        students={students} editingId={guestModal.editingId} availableTags={tags}
        groups={groups} groupNoun={groupNoun} fields={fields} />}
      {tagModal && <TagModal onClose={() => setTagModal(null)} onSave={saveTag}
        tags={tags} editingId={tagModal.editingId} />}

      {chartModal && (
        <ChartModal
          mode={chartModal.mode}
          current={chartModal.mode === "change"
            ? (() => { const c = charts.find(x => x.id === chartModal.id);
                       return c ? { kind: c.kind, name: c.name, studentCount: (c.state.students || []).length } : null; })()
            : null}
          onClose={() => setChartModal(null)}
          onSubmit={(payload) => {
            if (chartModal.mode === "change") changeKind(chartModal.id, payload.kind, payload.name);
            else createChart(payload);
          }}
        />
      )}

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
