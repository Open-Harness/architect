// Sheet 3. Built once: `ortho build`, replayed; the commit and the fingerprint become two tags; then the same command on a
// tree with one uncommitted line, replayed as a refusal. The plan's three outlines wait in the corner.
Film.scene("build", {
  step: "build",
  html: (D) => {
    const b = Stg.built(D), dirty = D.cap["stage-build-dirty"].out;
    if (b.count !== 2) throw new Error("build: the narration says two things; the build printed " + b.count);
    if (!/^refused: .*commit or stash/m.test(dirty) || !dirty.includes(b.commit)) throw new Error("build: the dirty build does not refuse against the same commit");
    return `${Kit.css}${Stg.css("build")}<style>
      #scene-build .once { position: absolute; left: 96px; top: 470px; width: 1728px; display: flex; align-items: center; gap: 28px; }
      #scene-build .once .card { position: relative; padding: 20px 28px; } #scene-build .once .arrow { font-size: 44px; color: var(--muted); }
      #scene-build .ask { position: absolute; left: 1440px; top: 452px; width: 384px; border-left: 2px solid var(--paper); padding: 6px 0 6px 24px; }
      #scene-build .ask .say { font-size: 36px; }
      #scene-build .triocap { left: 96px; top: 916px; }
      #scene-build .nored { position: absolute; left: 96px; top: 612px; font-size: 30px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Build it once</div><div class="hl">The file that was proved, built from a commit.</div></div>
    <div class="who">${Kit.who("agent", "your agent")}</div>
    <div class="once"><div class="card o1 hidden0"><div class="lbl">what runs in staging</div><div class="kbig">the file that was proved</div></div><div class="arrow o2 hidden0">→</div><div class="card o3 hidden0"><div class="lbl">so</div><div class="kbig">built once, from a commit</div></div></div>
    ${Kit.term(D, { id: "bd-term", cap: "stage-build", x: 96, y: 262, w: 1728, h: 150, cls: "hidden0" })}
    ${Stg.tags(D, { id: "bd-tags", x: 96, y: 440, w: 1310, cls: "hidden0" })}
    <div class="ask hidden0"><div class="lbl">those two</div><div class="say">are what you will ask any address for.</div></div>
    ${Kit.term(D, { id: "bd-dirty", cap: "stage-build-dirty", x: 96, y: 690, w: 1728, h: 186, cls: "hidden0", tag: '<span class="tag">one line not committed</span>' })}
    <div class="triocap">the plan · still nothing made</div>
    ${Stg.trio(D, { id: "bd-trio", x: 1104, y: 906, w: 720, layout: "mini" })}`;
  },
  build(s) {
    const c = s.cue, b = Stg.built(s.D), T = s.$("#bd-term"), Dt = s.$("#bd-dirty");
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in("#bd-trio, .triocap", s.start + 0.5, { y: 0 });
    // b1: what was proved, built once.
    s.in(".o1", c("b1", "file"), { y: 12 }); s.in(".o2, .o3", c("b1", "built once"), { x: -14, y: 0, stagger: 0.12 });
    // b2: the command, and its one line: the commit and the fingerprint.
    s.out(".once", c("b2") - 0.3, { dur: 0.3 });
    s.in(T, c("b2") - 0.3, { y: 12 });
    const row = s.$$("#bd-term .o")[0], cm = Stg.mark(row, b.commit), fp = Stg.mark(row, b.sha);
    s.run(T, c("b2", "Ortho"), { type: 0.5, at: c("b2", "prints"), each: 0.1 });
    Stg.hit(s, cm, c("b2", "commit")); s.in("#bd-tags", c("b2", "commit"), { y: 0, dur: 0.01 });
    s.fromTo("#bd-tags .t1", { autoAlpha: 0, y: -60 }, { autoAlpha: 1, y: 0, duration: 0.5 }, c("b2", "commit") + 0.1);
    Stg.hit(s, fp, c("b2", "fingerprint")); s.fromTo("#bd-tags .t2", { autoAlpha: 0, y: -120 }, { autoAlpha: 1, y: 0, duration: 0.55 }, c("b2", "fingerprint") + 0.1);
    // b3: what any address will be asked for.
    s.in(".ask", c("b3", "Those"), { x: 16, y: 0 });
    // b4: the refusal, in plain ink.
    const t4 = c("b4");
    s.in(Dt, t4 - 0.2, { y: 14 });
    s.run(Dt, c("b4", "build") - 0.1, { type: 0.5, at: c("b4", "refuses"), each: 0.12 });
    const why = Stg.rows(s, "#bd-dirty", /^refused: /)[0], what = Stg.mark(why, "commit or stash what changed");
    Stg.lit(s, "#bd-dirty", [why], c("b4", "refuses") + 0.2); Stg.hit(s, what, c("b4", "commit first"));
  },
});
