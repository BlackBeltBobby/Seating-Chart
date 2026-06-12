/* ==========================================================================
   Sample data — Maple Ridge Elementary lunch cohort
   150 students, 5 grades × 2 classes × 15 students
   ========================================================================== */
(function () {
  const FIRST_NAMES = [
    "Aarav","Ada","Amelia","Andre","Anika","Anya","Arlo","Asha","Aurora","Ayaan",
    "Bea","Beatrix","Bodhi","Brixton","Cai","Camille","Cassian","Cecilia","Cleo","Cora",
    "Dahlia","Dashiell","Declan","Diego","Edith","Elena","Eliana","Elio","Ember","Emi",
    "Esme","Ezra","Felix","Finley","Fionn","Florence","Freya","Gemma","Gianna","Gideon",
    "Hadley","Halle","Hana","Harper","Hazel","Hudson","Ines","Isla","Jasper","Joaquin",
    "June","Kai","Keiko","Kenji","Knox","Lake","Leo","Lila","Linnea","Lior",
    "Lola","Lucia","Lyra","Mae","Magnus","Maisie","Malik","Margot","Marisol","Mateo",
    "Maya","Micah","Milo","Nadia","Naomi","Nico","Noa","Nori","Oakley","Octavia",
    "Odette","Olive","Omar","Onyx","Opal","Orion","Otto","Pax","Penelope","Pia",
    "Poppy","Quincy","Rafa","Rania","Remy","Renji","Rhea","Rina","River","Romi",
    "Rosalie","Rowan","Ruby","Sable","Sage","Saoirse","Sasha","Selah","Sena","Shilo",
    "Sienna","Silas","Simone","Soraya","Stella","Sufjan","Sunny","Suri","Sylvie","Tadhg",
    "Talia","Tamsin","Teagan","Teo","Thalia","Thea","Theo","Tian","Tilda","Tomas",
    "Uma","Vada","Vance","Vera","Vesper","Viggo","Vivi","Wells","Wren","Xan",
    "Yara","Yusra","Yuto","Zadie","Zaha","Zane","Zara","Zella","Zenobia","Zoya"
  ];
  const LAST_NAMES = [
    "Acosta","Andersen","Bell","Bergmann","Bhatt","Brown","Cabrera","Carr","Cho","Coleman",
    "Cortez","Dalton","Davis","Diallo","Dixon","Doyle","Edwards","Ellis","Esposito","Fang",
    "Ferreira","Finch","Foster","Garcia","Gomez","Greene","Hale","Hassan","Holloway","Iqbal",
    "Ito","Jansen","Johansson","Kapoor","Kim","Kuznetsov","Larsen","Lee","Levy","Lin",
    "Marsh","Mendez","Miller","Moreau","Nakamura","Nguyen","Novak","O'Brien","Okafor","Park",
    "Patel","Peters","Quintero","Reyes","Rosen","Sato","Schultz","Sharma","Singh","Sokolov",
    "Stein","Suzuki","Tanaka","Thomas","Torres","Vargas","Walker","Wang","Wright","Yamada"
  ];
  const GRADES = ["K","1","2","3","4"];
  const CLASSES = ["A","B"];
  // behavior drives the solver: cluster (group same-tag together),
  // spread (one per table), door (seat near the entrance),
  // front (seat near the front/top of the room), none (informational).
  const TAGS_POOL = [
    { id: "allergy",   label: "nut allergy",   cls: "allergy",   weight: 0.06, behavior: "cluster" },
    { id: "access",    label: "needs aisle",   cls: "access",    weight: 0.04, behavior: "door" },
    { id: "monitor",   label: "lunch helper",  cls: "monitor",   weight: 0.08, behavior: "spread" },
    { id: "front",     label: "needs front row", cls: "front",   weight: 0.05, behavior: "front" },
    { id: "shy",       label: "shy",           cls: "shy",       weight: 0.12, behavior: "none" },
    { id: "energetic", label: "energetic",     cls: "energetic", weight: 0.14, behavior: "none" },
  ];
  const TAGS_INDEX = Object.fromEntries(TAGS_POOL.map(t => [t.id, t]));

  // Deterministic PRNG so the demo dataset is stable.
  function mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  // Build a roster of `n` students. Default 150 reproduces the original dataset
  // exactly (5 grades × 2 classes × 15, same PRNG stream); larger counts keep
  // cycling grade/class blocks, smaller counts are a prefix of the same stream.
  function buildSchool(n = 150) {
    const want = Math.max(0, Math.round(n) || 0);
    const rnd = mulberry32(20260513);
    const students = [];
    let id = 1;
    const TEACHERS = ["Ms. Reyes","Mr. Park","Mrs. Linden","Mr. Okafor","Ms. Suzuki","Mr. Diallo","Mrs. Brown","Mr. Vance","Ms. Cho","Mr. Holloway"];
    function makeOne(g, gi, c) {
      const fn = FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)];
      const ln = LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)];
      const tags = [];
      TAGS_POOL.forEach(t => { if (rnd() < t.weight) tags.push(t.id); });
      // Conflict avoidance for tag combos
      if (tags.includes("shy") && tags.includes("energetic")) {
        tags.splice(tags.indexOf("energetic"), 1);
      }
      students.push({
        id: "s" + String(id).padStart(3, "0"),
        first: fn, last: ln,
        name: fn + " " + ln,
        group: g, grade: g, gradeIndex: gi,
        class: c,
        teacher: TEACHERS[gi*2 + (c==="B"?1:0)],
        tags,
        notes: "",
      });
      id++;
    }
    outer:
    for (let round = 0; ; round++) {
      for (let gi = 0; gi < GRADES.length; gi++) {
        for (let ci = 0; ci < CLASSES.length; ci++) {
          for (let i = 0; i < 15; i++) {
            if (students.length >= want) break outer;
            makeOne(GRADES[gi], gi, CLASSES[ci]);
          }
        }
      }
    }
    return students;
  }

  // Seed a handful of pairwise rules referencing actual students by id.
  // Filter to rules whose endpoints both exist, so small/custom rosters
  // don't get dangling constraints.
  function buildRules(students) {
    const ids = new Set(students.map(s => s.id));
    return [
      { id: "r1", kind: "apart",    a: "s011", b: "s012", note: "Sibling rivalry — split for lunch" },
      { id: "r2", kind: "together", a: "s003", b: "s045", note: "Buddy program partners" },
      { id: "r3", kind: "apart",    a: "s022", b: "s029", note: "Disruptive when paired" },
      { id: "r4", kind: "together", a: "s068", b: "s072", note: "Speech buddy" },
      { id: "r5", kind: "apart",    a: "s094", b: "s101", note: "Recently fell out" },
      { id: "r6", kind: "together", a: "s117", b: "s133", note: "Reading partners" },
    ].filter(r => ids.has(r.a) && ids.has(r.b));
  }

  // Initial table layout — mixed cafeteria with round tables + a head/staff table
  function buildTables() {
    const tables = [];
    const cols = 5, rows = 4;
    const startX = 220, startY = 220;
    const gapX = 260, gapY = 240;
    let idx = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 3 && c === 4) continue; // skip last for variety / visual breathing room
        // Mix shapes a little — most round, a couple rectangles, one head table
        let shape = "round", extra = {};
        if (r === 1 && c === 2) {
          shape = "rect";
          // no right seat: this rect sits beside another rect (t09) whose left seat
          // would otherwise overlap it.
          extra = { width: 220, height: 110, sides: { top: 3, right: 0, bottom: 3, left: 1 } };
        } else if (r === 0 && c === 0) {
          // Staff / monitor head table — only one long side used (theater-style)
          shape = "rect";
          extra = { width: 260, height: 80, sides: { top: 0, right: 0, bottom: 5, left: 0 } };
        } else if ((r + c) % 5 === 4) {
          shape = "rect";
          extra = { width: 200, height: 110, sides: { top: 3, right: 1, bottom: 3, left: 1 } };
        } else {
          extra = { diameter: 130, roundSeats: 8 };
        }
        tables.push({
          id: "t" + String(idx).padStart(2, "0"),
          label: String.fromCharCode(64 + idx),
          shape,
          x: startX + c * gapX,
          y: startY + r * gapY,
          rotation: 0,
          ...extra,
        });
        idx++;
      }
    }
    return tables;
  }

  const studentsAll = buildSchool();
  const rules = buildRules(studentsAll);
  const tables = buildTables();

  // ROOM dimensions
  const ROOM = {
    w: 1480, h: 1080,
    label: "Maple Ridge Elementary — Cafeteria",
    doors: [{ side: "left", pos: 0.85 }],
    stage: { x: 600, y: 60, w: 280, h: 50, label: "Servery" },
  };

  // Canvas pixels per real-world foot. The creator defaults to feet and converts
  // with this; e.g. a round 8-top ≈ 130px ≈ 5.4 ft.
  const PX_PER_FOOT = 24;

  // Preset room sizes offered at chart creation, sized to clean foot dimensions
  // (small 40×30 ft, medium 60×45 ft, large 80×60 ft). Stored in pixels.
  const ROOM_PRESETS = {
    small:  { w: 960,  h: 720 },
    medium: { w: 1440, h: 1080 },
    large:  { w: 1920, h: 1440 },
  };

  // Build a room from partial dims, clamping to sane bounds and supplying
  // defaults (a left-wall door for door/front tag behaviors; no stage).
  function makeRoom(opts = {}) {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    return {
      w: clamp(Math.round(opts.w) || 1480, 600, 4000),
      h: clamp(Math.round(opts.h) || 1080, 500, 3000),
      label: opts.label || "",
      doors: opts.doors || [{ side: "left", pos: 0.85 }],
      stage: opts.stage || null,
    };
  }

  // History buckets — months that have already happened
  const PRIOR_HISTORY = []; // empty initially; user can run solver to fill in

  // ----- CSV parsing (paste support) -----
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return { headers: [], rows: [] };
    // detect delimiter
    const first = lines[0];
    const delim = (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? "\t" : ",";
    const split = (line) => {
      const out = []; let cur = ""; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i+1] === '"' && inQ) { cur += '"'; i++; continue; }
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === delim && !inQ) { out.push(cur); cur = ""; continue; }
        cur += ch;
      }
      out.push(cur);
      return out.map(s => s.trim());
    };
    const headers = split(lines[0]).map(h => h.toLowerCase());
    const rows = lines.slice(1).map(l => {
      const cells = split(l);
      const obj = {};
      headers.forEach((h, i) => obj[h] = cells[i] || "");
      return obj;
    });
    return { headers, rows };
  }

  // groups: the active chart-kind's [{id,label,color}] list. The CSV's `group`
  // column (falling back to legacy `grade`) is matched to a group id/label;
  // unmatched values default to the first group.
  function csvToStudents(text, tagPool, groups) {
    const { rows } = parseCSV(text);
    const pool = tagPool && tagPool.length ? tagPool : TAGS_POOL;
    const grps = groups && groups.length ? groups : null;
    const out = [];
    rows.forEach((row, i) => {
      const name = row.name || `${row.first || ""} ${row.last || ""}`.trim();
      if (!name) return;
      const parts = name.split(/\s+/);
      const first = row.first || parts[0];
      const last = row.last || parts.slice(1).join(" ");
      const cellRaw = (row.group || row.grade || "").trim();
      let group;
      if (grps) {
        const c = cellRaw.toLowerCase();
        const match = grps.find(g => g.id.toLowerCase() === c || g.label.toLowerCase() === c);
        group = (match || grps[0]).id;
      } else {
        group = (cellRaw || "K").toUpperCase().replace("KINDERGARTEN", "K");
      }
      const tagsRaw = (row.tags || "").toLowerCase();
      const tags = pool.filter(t =>
        tagsRaw.includes(t.id.toLowerCase()) || tagsRaw.includes(t.label.split(" ")[0].toLowerCase())
      ).map(t => t.id);
      out.push({
        id: "n" + Date.now().toString(36) + i,
        first, last, name: `${first} ${last}`.trim(),
        group, grade: group, gradeIndex: grps ? grps.findIndex(g => g.id === group) : GRADES.indexOf(group),
        class: row.class || row.section || "",
        teacher: row.teacher || "",
        tags,
        notes: row.notes || "",
      });
    });
    return out;
  }

  function studentsToCSV(students) {
    const head = ["first","last","group","class","teacher","tags","notes"];
    const lines = [head.join(",")];
    students.forEach(s => {
      const row = [
        s.first, s.last, s.group || s.grade, s.class, s.teacher || "",
        (s.tags || []).join("|"), (s.notes || "").replace(/,/g, ";")
      ];
      lines.push(row.map(c => /[",\n]/.test(c) ? `"${c.replace(/"/g,'""')}"` : c).join(","));
    });
    return lines.join("\n");
  }

  // Sample paste for the import modal
  const SAMPLE_CSV = `first,last,group,class,teacher,tags,notes
Maya,Patel,2,A,Mrs. Linden,allergy,
Jasper,Lee,K,B,Mr. Park,monitor,
Sienna,Brown,4,A,Ms. Cho,access,wheelchair user
Rowan,Garcia,1,A,Mrs. Reyes,shy,
Theo,Tanaka,3,B,Mr. Vance,energetic|monitor,`;

  // Months (academic year)
  const MONTHS = [
    "September 2026","October 2026","November 2026","December 2026",
    "January 2027","February 2027","March 2027","April 2027",
    "May 2027","June 2027"
  ];

  window.Seatery = {
    GRADES, CLASSES, TAGS_POOL, TAGS_INDEX,
    ROOM, ROOM_PRESETS, makeRoom, PX_PER_FOOT, MONTHS, SAMPLE_CSV,
    buildSchool, buildRules, buildTables,
    studentsAll, rules, tables,
    PRIOR_HISTORY,
    parseCSV, csvToStudents, studentsToCSV,
    mulberry32,
  };
})();
