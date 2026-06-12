/* ==========================================================================
   Chart-kind templates — window.ChartKinds, keyed by kind (school/wedding/conference)
   Each kind exposes:
     { kind, label, defaultName, groupNoun, groups:[{id,label,color}],
       fields:{class,teacher}, buildTables() -> tables, buildDemo() -> {students, rules} }
   Charts store only `kind`; group metadata/colors are resolved from here at render,
   so they survive reloads without being persisted.
   ========================================================================== */
(function () {
  const S = window.Seatery;

  // ----- School (classroom) -----
  const SCHOOL_GROUPS = [
    { id: "K", label: "K", color: "oklch(70% 0.13 50)" },
    { id: "1", label: "1", color: "oklch(67% 0.13 130)" },
    { id: "2", label: "2", color: "oklch(65% 0.13 195)" },
    { id: "3", label: "3", color: "oklch(62% 0.13 270)" },
    { id: "4", label: "4", color: "oklch(67% 0.13 340)" },
  ];

  // ----- Wedding demo -----
  const WEDDING_GROUPS = [
    { id: "bride", label: "Bride", color: "oklch(62% 0.16 350)" },
    { id: "groom", label: "Groom", color: "oklch(60% 0.14 250)" },
  ];
  // Wedding-specific built-in tags. Defined with `color` (hex) + `behavior` and
  // no `cls`, so TagChip renders them as colored chips with no extra CSS.
  const WEDDING_TAGS = [
    { id: "vip",       label: "VIP",         color: "#C2410C", behavior: "front" },
    { id: "bride",     label: "bride's side", color: "#BE185D", behavior: "cluster" },
    { id: "groom",     label: "groom's side", color: "#2A6FDB", behavior: "cluster" },
    { id: "kids",      label: "kids",        color: "#4D7C0F", behavior: "cluster" },
    { id: "plus-one",  label: "plus one",    color: "#7A5AE0", behavior: "none" },
    { id: "needs-aisle", label: "needs aisle", color: "#0E7490", behavior: "door" },
  ];
  function buildWeddingDemo(n = 120) {
    const total = Math.max(0, Math.round(n) || 0);
    const rnd = S.mulberry32(42);
    const firsts = ["Sophia","Liam","Noah","Olivia","Ava","Ethan","Mia","Lucas","Emma","Aiden","Ella","Mason","Harper","Logan","Aria","James","Layla","Jackson","Chloe","Sebastian"];
    const lasts = ["Park","Lin","Chen","Davis","Walker","Reyes","Tanaka","Bhatt","Foster","Cho"];
    const out = [];
    const half = Math.floor(total / 2);
    for (let i = 0; i < total; i++) {
      const fn = firsts[Math.floor(rnd() * firsts.length)];
      const ln = lasts[Math.floor(rnd() * lasts.length)];
      const group = i < half ? "bride" : "groom";
      // Tag each guest with their side so the cluster behavior keeps sides apart.
      const tags = [group];
      if (rnd() < 0.07) tags.push("vip");
      if (rnd() < 0.10) tags.push("kids");
      out.push({
        id: "w" + i, first: fn, last: ln, name: fn + " " + ln,
        group, grade: group, class: "", teacher: "", tags, notes: "",
      });
    }
    return out;
  }
  // ----- Conference demo -----
  const CONFERENCE_GROUPS = [
    { id: "speaker",  label: "Speaker",  color: "oklch(58% 0.16 290)" },
    { id: "attendee", label: "Attendee", color: "oklch(62% 0.13 195)" },
  ];
  // Conference-specific built-in tags (color + behavior, no `cls`).
  const CONFERENCE_TAGS = [
    { id: "frontrow", label: "front row",     color: "#7A5AE0", behavior: "front" },
    { id: "sponsor",  label: "sponsor",       color: "#C2410C", behavior: "cluster" },
    { id: "press",    label: "press",         color: "#0E7490", behavior: "door" },
    { id: "dietary",  label: "dietary needs", color: "#1F8A5B", behavior: "cluster" },
    { id: "workshop", label: "workshop",      color: "#2A6FDB", behavior: "none" },
  ];
  function buildConferenceDemo(n = 200) {
    const total = Math.max(0, Math.round(n) || 0);
    const rnd = S.mulberry32(7);
    const firsts = ["Alex","Sam","Jordan","Taylor","Riley","Casey","Morgan","Avery","Quinn","Reese","Cameron","Drew","Skyler","Devon","Sage"];
    const lasts = ["Tanaka","Kim","Lee","Wang","Chen","Patel","Sharma","Hansen","Nakamura","Reyes","Singh","Walker"];
    const out = [];
    for (let i = 0; i < total; i++) {
      const fn = firsts[Math.floor(rnd()*firsts.length)];
      const ln = lasts[Math.floor(rnd()*lasts.length)];
      const speaker = rnd() < 0.1;
      out.push({
        id: "c" + i, first: fn, last: ln, name: fn + " " + ln,
        group: speaker ? "speaker" : "attendee", grade: speaker ? "speaker" : "attendee",
        class: "", teacher: "",
        // speakers prefer the front of the room — showcases the front-row tag behavior
        tags: speaker ? ["frontrow"] : [],
        notes: "",
      });
    }
    return out;
  }
  // Per-kind creation defaults — single source of truth for the creator modal
  // placeholders, createChart's blank-resolution, and buildTables/buildDemo.
  const SCHOOL_DEFAULTS     = { roundCount: 0, rectCount: 19, seatsPerTable: 8, people: 150 };
  const WEDDING_DEFAULTS    = { roundCount: 0, rectCount: 16, seatsPerTable: 8, people: 120 };
  const CONFERENCE_DEFAULTS = { roundCount: 0, rectCount: 25, seatsPerTable: 8, people: 200 };

  // Build tables for a kind: resolve blank opts from the kind's defaults, then
  // delegate to the generic grid generator.
  function tablesFor(d, idPrefix, opts) {
    const {
      room = S.ROOM,
      roundCount = d.roundCount, rectCount = d.rectCount, seatsPerTable = d.seatsPerTable,
    } = opts || {};
    return window.TableGeom.buildGrid({ room, roundCount, rectCount, seatsPerTable, idPrefix });
  }

  window.ChartKinds = {
    school: {
      kind: "school", label: "Classroom", defaultName: "New classroom",
      groupNoun: "Grade", groups: SCHOOL_GROUPS,
      fields: { class: true, teacher: true },
      blurb: "Students grouped by grade, with class & teacher.",
      tags: S.TAGS_POOL,
      defaults: SCHOOL_DEFAULTS,
      buildTables: (opts = {}) => tablesFor(SCHOOL_DEFAULTS, "t", opts),
      buildDemo: (count = SCHOOL_DEFAULTS.people) => { const students = S.buildSchool(count); return { students, rules: S.buildRules(students) }; },
    },
    wedding: {
      kind: "wedding", label: "Wedding", defaultName: "New wedding",
      groupNoun: "Side", groups: WEDDING_GROUPS,
      fields: { class: false, teacher: false },
      blurb: "Guests grouped by bride's or groom's side.",
      tags: WEDDING_TAGS,
      defaults: WEDDING_DEFAULTS,
      buildTables: (opts = {}) => tablesFor(WEDDING_DEFAULTS, "wt", opts),
      buildDemo: (count = WEDDING_DEFAULTS.people) => ({ students: buildWeddingDemo(count), rules: [] }),
    },
    conference: {
      kind: "conference", label: "Conference", defaultName: "New conference",
      groupNoun: "Role", groups: CONFERENCE_GROUPS,
      fields: { class: false, teacher: false },
      blurb: "Attendees and speakers; speakers seated up front.",
      tags: CONFERENCE_TAGS,
      defaults: CONFERENCE_DEFAULTS,
      buildTables: (opts = {}) => tablesFor(CONFERENCE_DEFAULTS, "ct", opts),
      buildDemo: (count = CONFERENCE_DEFAULTS.people) => ({ students: buildConferenceDemo(count), rules: [] }),
    },
  };
  // Display order for pickers
  window.ChartKindOrder = ["school", "wedding", "conference"];
})();
