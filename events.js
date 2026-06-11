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
  function buildWeddingDemo() {
    const rnd = S.mulberry32(42);
    const firsts = ["Sophia","Liam","Noah","Olivia","Ava","Ethan","Mia","Lucas","Emma","Aiden","Ella","Mason","Harper","Logan","Aria","James","Layla","Jackson","Chloe","Sebastian"];
    const lasts = ["Park","Lin","Chen","Davis","Walker","Reyes","Tanaka","Bhatt","Foster","Cho"];
    const out = [];
    for (let i = 0; i < 120; i++) {
      const fn = firsts[Math.floor(rnd() * firsts.length)];
      const ln = lasts[Math.floor(rnd() * lasts.length)];
      const group = i < 60 ? "bride" : "groom";
      out.push({
        id: "w" + i, first: fn, last: ln, name: fn + " " + ln,
        group, grade: group, class: "", teacher: "", tags: [], notes: "",
      });
    }
    return out;
  }
  function buildWeddingTables() {
    const out = [];
    const cols = 4, rows = 4;
    let idx = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          id: "wt"+idx, label: String(idx),
          shape: "round", diameter: 130, roundSeats: 8,
          x: 300 + c * 280, y: 220 + r * 240, rotation: 0
        });
        idx++;
      }
    }
    // Head table on top (front of the room)
    out.unshift({
      id: "wt-head", label: "Head",
      shape: "rect", width: 320, height: 80,
      sides: { top: 0, right: 0, bottom: 6, left: 0 },
      x: 740, y: 100, rotation: 0
    });
    return out;
  }

  // ----- Conference demo -----
  const CONFERENCE_GROUPS = [
    { id: "speaker",  label: "Speaker",  color: "oklch(58% 0.16 290)" },
    { id: "attendee", label: "Attendee", color: "oklch(62% 0.13 195)" },
  ];
  function buildConferenceDemo() {
    const rnd = S.mulberry32(7);
    const firsts = ["Alex","Sam","Jordan","Taylor","Riley","Casey","Morgan","Avery","Quinn","Reese","Cameron","Drew","Skyler","Devon","Sage"];
    const lasts = ["Tanaka","Kim","Lee","Wang","Chen","Patel","Sharma","Hansen","Nakamura","Reyes","Singh","Walker"];
    const out = [];
    for (let i = 0; i < 200; i++) {
      const fn = firsts[Math.floor(rnd()*firsts.length)];
      const ln = lasts[Math.floor(rnd()*lasts.length)];
      const speaker = rnd() < 0.1;
      out.push({
        id: "c" + i, first: fn, last: ln, name: fn + " " + ln,
        group: speaker ? "speaker" : "attendee", grade: speaker ? "speaker" : "attendee",
        class: "", teacher: "",
        // speakers prefer the front of the room — showcases the "front" tag behavior
        tags: speaker ? ["front"] : [],
        notes: "",
      });
    }
    return out;
  }
  function buildConferenceTables() {
    const out = [];
    let idx = 1;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        out.push({
          id: "ct"+idx, label: String(idx),
          shape: "rect", width: 220, height: 90,
          sides: { top: 4, right: 0, bottom: 4, left: 0 },
          x: 280 + c * 250, y: 220 + r * 200, rotation: 0,
        });
        idx++;
      }
    }
    return out;
  }

  window.ChartKinds = {
    school: {
      kind: "school", label: "Classroom", defaultName: "New classroom",
      groupNoun: "Grade", groups: SCHOOL_GROUPS,
      fields: { class: true, teacher: true },
      blurb: "Students grouped by grade, with class & teacher.",
      buildTables: () => S.buildTables(),
      buildDemo: () => { const students = S.buildSchool(); return { students, rules: S.buildRules(students) }; },
    },
    wedding: {
      kind: "wedding", label: "Wedding", defaultName: "New wedding",
      groupNoun: "Side", groups: WEDDING_GROUPS,
      fields: { class: false, teacher: false },
      blurb: "Guests grouped by bride's or groom's side.",
      buildTables: () => buildWeddingTables(),
      buildDemo: () => ({ students: buildWeddingDemo(), rules: [] }),
    },
    conference: {
      kind: "conference", label: "Conference", defaultName: "New conference",
      groupNoun: "Role", groups: CONFERENCE_GROUPS,
      fields: { class: false, teacher: false },
      blurb: "Attendees and speakers; speakers seated up front.",
      buildTables: () => buildConferenceTables(),
      buildDemo: () => ({ students: buildConferenceDemo(), rules: [] }),
    },
  };
  // Display order for pickers
  window.ChartKindOrder = ["school", "wedding", "conference"];
})();
