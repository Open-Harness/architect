// Sheet 3. `ortho check`, replayed, with its three failing parts held open: drift (and `ortho generate` printing the files
// it rewrites), changes, and types, with the line of src/link/add.ts that found a page through the rule. Then the question
// that goes back to you.
Film.scene("check", {
  step: "check",
  html: (D) => {
    const ops = Chg.ops(D), now = Chg.impact(D.cap["change-impact"].out, ["stale", "proven"]);
    const out = D.cap["change-check"].out.split("\n");
    // The parts that answered: a cross, or a count above nought.
    const parts = out.map((l) => /^(\w[\w ]*?) (✘ )?(\d+)$/.exec(l)).filter((m) => m && m[1] !== "exit" && (m[2] || +m[3] > 0));
    Chg.need(parts.length, 3, "c1 three of its parts");
    const drift = +(/^drift ✘ (\d+)$/m.exec(D.cap["change-check"].out) ?? [])[1];
    Chg.need(drift, 9, "c2 nine generated files");
    const updated = D.cap["change-generate"].out.split("\n").filter((l) => /^updated generated\//.test(l));
    Chg.need(updated.length, drift, "c2 generate rewrites the drifted files");
    if (!/^check ✘$/m.test(D.cap["change-check"].out)) throw new Error("check: the check does not fail");
    const file = "src/link/add.ts", src = D.src[file], imp = Kit.line(src, /^import \{ oneNamePerPerson \}/), find = Kit.line(src, /records\.findBy\(oneNamePerPerson,/);
    const tsLine = /^  src\/link\/add\.ts:(\d+) /m.exec(D.cap["change-check"].out); if (!tsLine || +tsLine[1] !== imp) throw new Error("check: the type error is not on the line that imports the rule");
    const counts = { stale: `stale ${Chg.says(now.stale)} · proven ${Chg.says(now.proven)}` };
    return `${Kit.css}${Chg.css("check")}<style>
      #scene-check #ck-term .screen, #scene-check #ck-gen .screen { padding: 14px 22px; }
      #scene-check #ck-term .tag, #scene-check #ck-gen .tag { color: var(--muted); }
      #scene-check .q { left: 1200px; top: 650px; width: 624px; } #scene-check .q .say { font-size: 38px; }
      #scene-check .q .back { display: flex; align-items: center; gap: 16px; margin-top: 20px; font-size: 28px; color: var(--text2); }
      #scene-check .q .nb { position: relative; display: inline-block; opacity: .6; } #scene-check .q .nb i { position: absolute; left: -4px; right: -4px; top: 50%; height: 2.5px; background: var(--paper); transform-origin: 0 50%; }
    </style>
    <div class="head"><div class="eyebrow">The check</div><div class="hl">What leaned on the rule.</div></div>
    ${Chg.who([["agent", "your agent"], ["you", "you"]])}
    ${Kit.term(D, { id: "ck-term", cap: "change-check", x: 96, y: 262, w: 1070, h: 470, size: 20, keep: (l) => !/^  generated\//.test(l), tag: `<span class="tag">${drift} drift lines folded</span>` })}
    ${Kit.term(D, { id: "ck-gen", cap: "change-generate", x: 1200, y: 262, w: 624, h: 440, size: 19, cls: "hidden0" })}
    ${Kit.ed(D, { id: "ck-imp", file, x: 1200, y: 262, w: 624, from: imp, to: imp, size: "small", cls: "hidden0", tag: '<span class="tag">line ' + imp + "</span>" })}
    ${Kit.ed(D, { id: "ck-find", file, x: 1200, y: 440, w: 624, from: find - 1, to: find, size: "small", cls: "hidden0", tag: '<span class="tag">how it found your page</span>' })}
    <div class="abs q hidden0"><div class="say">With two names, which page gets the link?</div>
      <div class="back"><span class="nb">${Kit.who("builder", "a builder's question")}<i></i></span><span class="mu">→</span><span class="to">${Kit.who("you")}</span></div></div>
    ${Chg.band(D, "stale", counts)}`;
  },
  build(s) {
    const c = s.cue, T = s.$("#ck-term"), G = s.$("#ck-gen");
    const types = Chg.rows(s, "#ck-term", /^types ✘/), tsErr = Chg.rows(s, "#ck-term", /TS2305/), drift = Chg.rows(s, "#ck-term", /^drift ✘/);
    const changes = Chg.rows(s, "#ck-term", /^changes \d/), major = Chg.rows(s, "#ck-term", /: major$/), verdict = Chg.rows(s, "#ck-term", /^check ✘$/);
    s.in(".head", s.start + 0.3); s.in(".band", s.start + 0.4, { y: 0 });
    // c1: the check fails, in three parts.
    Chg.act(s, 0, s.start + 0.5); s.in(T, c("c1") - 0.1, { y: 14 });
    const typed = Chg.type(s, T, c("c1", "check"), 0.4);
    Chg.print(s, s.$$("#ck-term .o"), Math.max(typed + 0.15, c("c1", "fails")), 0.07);
    Chg.lit(s, "#ck-term", [...types, ...drift, ...changes, ...verdict], c("c1", "three"));
    // c2: drift, and generate rewriting the nine.
    Chg.lit(s, "#ck-term", drift, c("c2", "Drift")); const dl = Chg.label(drift[0], "generated files, still the old rule"); s.in(dl, c("c2", "nine"), { x: 14, y: 0, dur: 0.35 }); s.out(dl, c("c3") - 0.2, { dur: 0.25 });
    s.in(G, c("c2", "framework's") - 0.1, { y: 14 });
    const gt = Chg.type(s, G, c("c2", "Generate rewrites") - 0.2, 0.4); Chg.print(s, s.$$("#ck-gen .o"), Math.max(gt + 0.1, c("c2", "rewrites")), 0.07);
    s.to(drift, { opacity: 0.38, duration: 0.3 }, c("c2", "$"));
    // c3: changes, counted as major.
    Chg.lit(s, "#ck-term", [...changes, ...major], c("c3", "Changes")); Chg.glow(s, Chg.mark(major[0], "HandleAlreadyOwned removed"), c("c3", "gone"));
    Chg.glow(s, Chg.mark(major[0], "major"), c("c3", "major"));
    // c4: types. The handler for link.add no longer fits.
    s.out(G, c("c4") - 0.2, { dur: 0.3 });
    Chg.lit(s, "#ck-term", [...types, ...tsErr], c("c4", "types"));
    s.in("#ck-imp", c("c4", "handler"), { y: 14 }); Chg.ring(s, "link.add", c("c4", "link"), "no longer fits");
    s.in("#ck-find", c("c4", "found"), { y: 14 });
    const fb = s.$("#ck-find .code"), n = +s.$$("#ck-find .ln").pop().dataset.n; s.focus(fb, [n, n], c("c4", "through"));
    // c5: the question goes back to you.
    s.in(".q", c("c5", "two names"), { y: 14 }); s.in(".q .back", c("c5", "builder's") - 0.2, { y: 8 });
    s.fromTo(".q .nb i", { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, c("c5", "question"));
    Chg.act(s, 1, c("c5", "back to you"));
  },
});
