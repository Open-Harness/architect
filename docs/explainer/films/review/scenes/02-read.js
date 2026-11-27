// Sheet 2. The part you can read: review-diff (two lines out, two in), then review-stat, its one blueprint row set apart
// from the eight generated rows, and no handler or journey among them.
Film.scene("read", {
  step: "read",
  html: (D) => {
    const F = Rv.facts(D);
    Rv.must(!F.st.files.some((f) => /^(src|journeys)\//.test(f)), "the change touches a handler or a journey");
    const keepDiff = (l) => /^@@ /.test(l) || /^-(?!--)/.test(l) || /^\+(?!\+\+)/.test(l);
    return `${Kit.css}${Rv.css("read")}<style>
      #scene-read .tally { left: 96px; top: 612px; display: flex; gap: 18px; }
      #scene-read .tally .chip { font-family: var(--sans); font-size: 30px; padding: 10px 24px; } #scene-read .tally .chip b { font-family: var(--mono); font-weight: 500; color: var(--paper); }
      #scene-read .side { left: 1236px; width: 588px; }
      #scene-read .side .kbig { font-size: 34px; } #scene-read .side .mono { font-size: 24px; color: var(--text2); }
      #scene-read .side.chk { border-color: var(--paper); } #scene-read #rd-stat .o.bp .path { color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">Start with the blueprint</div><div class="hl">The part you can read.</div></div>
    <div class="who">${Kit.who("agent", "the reviewer")}</div>
    ${Kit.term(D, { id: "rd-diff", cap: "review-diff", x: 96, y: 262, w: 1728, h: 330, keep: keepDiff, title: "the blueprint's part of the change" })}
    <div class="abs tally hidden0"><span class="chip ct1 hidden0"><b>${F.df.outs.length}</b> lines out</span><span class="chip ct2 hidden0"><b>${F.df.ins.length}</b> lines in</span><span class="chip ct3 hidden0">budget <b>${F.df.was}</b> → <b>${F.df.now}</b> millis</span></div>
    ${Kit.term(D, { id: "rd-stat", cap: "review-stat", x: 96, y: 262, w: 1100, h: 460, cls: "hidden0", title: "every file the change touched" })}
    <div class="kbox side s1 hidden0" style="top:262px;height:130px"><div class="lbl">a handler · src/</div><div class="kbig">none in the change</div></div>
    <div class="kbox side s2 hidden0" style="top:408px;height:130px"><div class="lbl">a journey · journeys/</div><div class="kbig">none in the change</div></div>
    <div class="kbox side chk hidden0" style="top:554px;height:168px"><div class="lbl">nobody reads the ${F.st.gen.length}</div><div class="kbig">a check says whether they are exactly what the blueprint makes</div></div>
    ${Rv.tiles(D, "the change")}`;
  },
  build(s) {
    const c = s.cue, F = Rv.facts(s.D), D = s.$("#rd-diff"), S = s.$("#rd-stat");
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    s.in(".tiles", s.start + 0.2, { y: 0, dur: 0.3 });
    // b1: the blueprint's part first.
    s.to(".tile.gen", { opacity: 0.4, duration: 0.4 }, c("b1", "blueprints")); s.to(".tile.bp", { backgroundColor: "rgba(233,240,250,.1)", duration: 0.4 }, c("b1", "blueprints"));
    s.in(D, c("b1", "starts") - 0.1, { y: 14 });
    Rv.type(s, D, c("b1", "blueprints"), 0.9);
    const rows = s.$$("#rd-diff .o"); Rv.print(s, rows, c("b1", "because"), 0.12);
    // b2: two out, two in; the description, and the budget from 150 to 100.
    const outs = Rv.rows(s, "#rd-diff", /^-/), ins = Rv.rows(s, "#rd-diff", /^\+/);
    const descs = Rv.rows(s, "#rd-diff", /^[-+]\s+description: /), buds = Rv.rows(s, "#rd-diff", /^[-+]\s+budget: /);
    Rv.lit(s, "#rd-diff", outs, c("b2", "out")); s.in(".tally", c("b2", "out") - 0.1, { y: 0, dur: 0.2 }); s.in(".ct1", c("b2", "out"), { y: 8, dur: 0.3 });
    Rv.lit(s, "#rd-diff", [...outs, ...ins], c("b2", "two", 2)); s.in(".ct2", c("b2", "in"), { y: 8, dur: 0.3 });
    Rv.lit(s, "#rd-diff", descs, c("b2", "description"));
    const lab1 = Rv.label(descs[1], "plainer"); s.in(lab1, c("b2", "description") + 0.05, { x: 14, y: 0, dur: 0.3 });
    Rv.lit(s, "#rd-diff", buds, c("b2", "budget")); s.out(lab1, c("b2", "budget") - 0.05, { dur: 0.2 });
    Rv.hit(s, Rv.mark(buds[0], `"${F.df.was} millis"`), c("b2", "150")); s.in(".ct3", c("b2", "150"), { y: 8, dur: 0.3 });
    Rv.hit(s, Rv.mark(buds[1], `"${F.df.now} millis"`), c("b2", "100"));
    // b3: every file it touched. One blueprint, eight generated.
    const t3 = c("b3");
    s.out("#rd-diff, .tally", t3 - 0.35, { dur: 0.3 }); s.in(S, t3 - 0.1, { y: 14 });
    Rv.type(s, S, t3 + 0.05, 0.8); const sr = s.$$("#rd-stat .o"); Rv.print(s, sr, c("b3", "touched"), 0.07);
    s.to(".tile.gen", { opacity: 1, duration: 0.3 }, c("b3", "touched"));
    const bp = Rv.rows(s, "#rd-stat", /^\s*blueprint\//), gen = Rv.rows(s, "#rd-stat", /^\s*generated\//);
    bp.forEach((o) => o.classList.add("bp"));
    Rv.must(bp.length === F.st.bp.length && gen.length === F.st.gen.length, "the stat terminal lost a row");
    Rv.lit(s, "#rd-stat", bp, c("b3", "One")); const lb = Rv.label(bp[0], `${bp.length} · the blueprint's`); s.in(lb, c("b3", "One") + 0.05, { x: 14, y: 0, dur: 0.3 });
    s.fromTo(".tile.bp", { scale: 1 }, { scale: 1.06, duration: 0.25, yoyo: true, repeat: 1 }, c("b3", "One"));
    Rv.lit(s, "#rd-stat", [...bp, ...gen], c("b3", "eight")); const lg = Rv.label(gen[Math.floor(gen.length / 2) - 1], `${gen.length} · generated`); s.in(lg, c("b3", "eight") + 0.05, { x: 14, y: 0, dur: 0.3 });
    s.fromTo(".tile.gen", { borderColor: "rgba(132,170,222,.36)" }, { borderColor: "#62c6ff", duration: 0.3 }, c("b3", "generated"));
    // b4: no handler, no journey; nobody reads the eight.
    s.in(".s1", c("b4", "handler") - 0.2, { x: 14, y: 0 }); s.in(".s2", c("b4", "journey") - 0.2, { x: 14, y: 0 });
    Rv.lit(s, "#rd-stat", bp, c("b4", "nobody")); s.to(".tile.gen", { opacity: 0.4, duration: 0.4 }, c("b4", "nobody"));
    s.in(".chk", c("b4", "check"), { x: 14, y: 0 });
    s.to(".tile.gen", { opacity: 1, duration: 0.4 }, c("b4", "exactly"));
  },
});
