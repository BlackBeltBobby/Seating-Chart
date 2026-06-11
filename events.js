/* ==========================================================================
   Event registry — selectable seating scenarios (school / wedding / conference)
   Each event exposes build() -> { students, rules, tables }.
   Tags are managed separately (per-event) by the app, seeded from defaults.
   ========================================================================== */
(function () {
  const S = window.Seatery;

  // ----- Wedding demo -----
  function buildWeddingDemo() {
    const rnd = S.mulberry32(42);
    const firsts = ["Sophia","Liam","Noah","Olivia","Ava","Ethan","Mia","Lucas","Emma","Aiden","Ella","Mason","Harper","Logan","Aria","James","Layla","Jackson","Chloe","Sebastian"];
    const lasts = ["Park","Lin","Chen","Davis","Walker","Reyes","Tanaka","Bhatt","Foster","Cho"];
    const out = [];
    for (let i = 0; i < 120; i++) {
      const fn = firsts[Math.floor(rnd() * firsts.length)];
      const ln = lasts[Math.floor(rnd() * lasts.length)];
      const tags = [];
      if (i < 60) tags.push("bride-side"); else tags.push("groom-side");
      if (rnd() < 0.2) tags.push("plus-one");
      if (rnd() < 0.1) tags.push("kids");
      if (rnd() < 0.07) tags.push("vip");
      out.push({
        id: "w" + i, first: fn, last: ln, name: fn + " " + ln,
        grade: ["K","1","2","3","4"][Math.floor(rnd()*5)], gradeIndex: 0,
        class: tags[0], teacher: "", tags: [], notes: ""
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
    // Head table on top
    out.unshift({
      id: "wt-head", label: "Head",
      shape: "rect", width: 320, height: 80,
      sides: { top: 0, right: 0, bottom: 6, left: 0 },
      x: 740, y: 100, rotation: 0
    });
    return out;
  }

  // ----- Conference demo -----
  function buildConferenceDemo() {
    const rnd = S.mulberry32(7);
    const firsts = ["Alex","Sam","Jordan","Taylor","Riley","Casey","Morgan","Avery","Quinn","Reese","Cameron","Drew","Skyler","Devon","Sage"];
    const lasts = ["Tanaka","Kim","Lee","Wang","Chen","Patel","Sharma","Hansen","Nakamura","Reyes","Singh","Walker"];
    const out = [];
    for (let i = 0; i < 200; i++) {
      out.push({
        id: "c" + i,
        first: firsts[Math.floor(rnd()*firsts.length)],
        last: lasts[Math.floor(rnd()*lasts.length)],
        name: "", grade: ["K","1","2","3","4"][Math.floor(rnd()*5)],
        gradeIndex: 0, class: "track", teacher: "", tags: [], notes: ""
      });
      out[out.length - 1].name = out[out.length - 1].first + " " + out[out.length - 1].last;
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

  window.SeateryEvents = [
    {
      id: "school", kind: "school", kindLabel: "School cohort",
      name: "Maple Ridge Elementary",
      build: () => ({ students: S.buildSchool(), rules: S.buildRules(), tables: S.buildTables() }),
    },
    {
      id: "wedding", kind: "wedding", kindLabel: "Wedding",
      name: "Park & Lin Wedding",
      build: () => ({ students: buildWeddingDemo(), rules: [], tables: buildWeddingTables() }),
    },
    {
      id: "conference", kind: "conference", kindLabel: "Conference",
      name: "DevSummit 2026",
      build: () => ({ students: buildConferenceDemo(), rules: [], tables: buildConferenceTables() }),
    },
  ];
})();
