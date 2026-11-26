// Sheet 2. Watch over an environment: nothing to read, then the test environment started and used, then the healthy watch
// read a line at a time while the budget bar is drawn from its two p95 lines.
Film.scene("watch", {
  step: "watch",
  html: (D) => {
    const ok = D.cap["watch-healthy"].out, ops = Loc.ops(ok), calls = Loc.calls(ok);
    Loc.says(ops.length, 2, "the operations watch judged (both pass)"); Loc.need(ops.every((o) => o.ok), "the healthy watch has a ✘");
    Loc.says(calls["handle.claim"], 2, "claims"); Loc.says(calls["profile.get"], 3, "reads of the public page");
    const ref = /^refusals: (\S+) (\d+) \(([\w-]+)\)$/m.exec(ok); Loc.need(ref, "no refusals line"); Loc.says(+ref[2], 1, "refusals");
    Loc.need(/^defects: none$/m.test(ok) && /^drift none$/m.test(ok), "the healthy watch has defects or drift");
    Loc.need(/^\[HN-002\] HandleAlreadyOwned$/m.test(D.cap["watch-claim-second"].out), "the second claim was not refused");
    const rows = ops.map((o) => ({ ...o, budgets: [o.budget], mark: "ok", calls: calls[o.op], counts: [calls[o.op]] }));
    const dots = Array.from({ length: calls["profile.get"] }, (_, k) => `<i class="dot d${k}"></i>`).join("");
    return `${Kit.css}${Loc.css("watch")}<style>
      #scene-watch .reads { left: 96px; top: 618px; display: flex; align-items: center; gap: 18px; }
      #scene-watch .reads .dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--paper); background: var(--text2); visibility: hidden; opacity: 0; }
      #scene-watch .reads .lbl { font-size: 22px; margin-right: 6px; } #scene-watch .reads .note { font-size: 24px; margin-left: 10px; }
    </style>
    <div class="head"><div class="eyebrow">ortho watch</div><div class="hl">What an environment recorded.</div></div>
    <div class="who">${Kit.who("you")}</div>
    ${Kit.term(D, { id: "w-none", cap: "watch-nothing", x: 96, y: 262, w: 1728, h: 212, title: "plugged-in · before the environment has run" })}
    ${Kit.term(D, { id: "w-up", cap: "watch-up", x: 96, y: 490, w: 560, h: 124, size: 19, cls: "hidden0" })}
    ${Kit.term(D, { id: "w-c1", cap: "watch-claim-first", x: 680, y: 490, w: 560, h: 124, size: 19, cls: "hidden0" })}
    ${Kit.term(D, { id: "w-c2", cap: "watch-claim-second", x: 1264, y: 490, w: 560, h: 154, size: 19, cls: "hidden0" })}
    <div class="abs reads hidden0"><span class="lbl">the public page, read</span>${dots}<span class="note mu">profile.get · ${calls["profile.get"]} calls</span></div>
    ${Kit.term(D, { id: "w-ok", cap: "watch-healthy", x: 96, y: 262, w: 1728, h: 352, size: 19, cls: "hidden0", title: "plugged-in · test, after the calls" })}
    ${Loc.bars("w-bars", rows.map((r) => ({ ...r, drawn: false, mark: "" })), { top: 660, hide: true, empty: "nothing recorded yet" })}`;
  },
  build(s) {
    const c = s.cue, ok = s.D.cap["watch-healthy"].out, ops = Loc.ops(ok), calls = Loc.calls(ok);
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // b1, b2: watch, before the environment has run.
    s.in("#w-none", s.start + 0.5, { y: 14 }); Loc.type(s, s.$("#w-none"), c("b1", "OrthoWatch"), Math.max(0.5, c("b1", "environment") - c("b1", "OrthoWatch")));
    Loc.print(s, s.$$("#w-none .o"), c("b2", "nothing"), 0.25);
    s.in("#w-bars", c("b2", "nothing"), { y: 14 }); s.in("#w-bars .bempty", c("b2", "nothing") + 0.3, { y: 8 });
    Loc.lit(s, "#w-none", Loc.rows(s, "#w-none", /^watch couldn't run/), c("b2", "says"));
    // b3: start the test environment, and use it.
    const t3 = c("b3");
    s.in("#w-up", t3, { y: 12, dur: 0.35 }); Loc.type(s, s.$("#w-up"), c("b3", "start"), 0.6); Loc.print(s, s.$$("#w-up .o"), c("b3", "machine"));
    s.in("#w-c1", c("b3", "name") - 0.3, { y: 12, dur: 0.35 }); Loc.type(s, s.$("#w-c1"), c("b3", "name") - 0.2, 0.3); Loc.print(s, s.$$("#w-c1 .o"), c("b3", "claimed"));
    s.in("#w-c2", c("b3", "second") - 0.3, { y: 12, dur: 0.35 }); Loc.type(s, s.$("#w-c2"), c("b3", "second") - 0.2, 0.3); Loc.print(s, s.$$("#w-c2 .o"), c("b3", "refused"));
    s.in(".reads", c("b3", "public"), { y: 10 });
    ["read", "three", "times"].forEach((w, k) => s.fromTo(".reads .d" + k, { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, c("b3", w)));
    // b4: watch again. A line for each operation, against its own budget.
    const t4 = c("b4"), w = s.$$("#w-ok .o");
    s.out("#w-none, #w-up, #w-c1, #w-c2, .reads", t4 - 0.4, { dur: 0.3 }); s.out("#w-bars .bempty", t4 - 0.2, { dur: 0.2 });
    s.in("#w-ok", t4, { y: 12, dur: 0.35 }); Loc.type(s, s.$("#w-ok"), t4 + 0.05, 0.5);
    const head = Loc.rows(s, "#w-ok", /^watch test /), opRows = ops.map((o) => Loc.rows(s, "#w-ok", new RegExp("^" + o.op.replace(".", "\\.") + " p95 "))[0]);
    Loc.print(s, [...head, ...opRows], c("b4", "each"), 0.2);
    s.in("#w-bars .brow", c("b4", "line"), { y: 0, stagger: 0.15, dur: 0.3 });
    ops.forEach((o, k) => Loc.grow(s, "#w-bars", o, c("b4", "line") + 0.1 + k * 0.25));
    Loc.lit(s, "#w-ok", opRows, c("b4", "against"));
    s.fromTo("#w-bars .bline", { scaleY: 0.2 }, { scaleY: 1, duration: 0.3 }, c("b4", "budget"));
    ops.forEach((o, k) => Loc.mark(s, "#w-bars", o.op, "ok", c("b4", "both") + k * 0.2));
    // b5: the counts, the refusal by name, the defects.
    const callRow = Loc.rows(s, "#w-ok", /^calls: /), refRow = Loc.rows(s, "#w-ok", /^refusals: /), defRow = Loc.rows(s, "#w-ok", /^defects: /);
    Loc.print(s, callRow, c("b5", "counts")); Loc.lit(s, "#w-ok", callRow, c("b5", "counts"));
    Loc.count(s, "#w-bars", "handle.claim", calls["handle.claim"], c("b5", "two")); Loc.count(s, "#w-bars", "profile.get", calls["profile.get"], c("b5", "three"));
    Loc.print(s, refRow, c("b5", "refusal")); Loc.lit(s, "#w-ok", refRow, c("b5", "refusal"));
    s.in(Loc.label(refRow[0], "no, on purpose"), c("b5", "purpose"), { x: 14, y: 0, dur: 0.3 });
    Loc.print(s, defRow, c("b5", "Defects")); Loc.lit(s, "#w-ok", defRow, c("b5", "Defects"));
    // b6: the evals, on real calls; drift none.
    const evRow = Loc.rows(s, "#w-ok", /^evals: /), drRow = Loc.rows(s, "#w-ok", /^drift /);
    s.out(s.$$("#w-ok .tlab"), c("b6") - 0.1, { dur: 0.2 });
    Loc.print(s, evRow, c("b6", "avals")); Loc.lit(s, "#w-ok", evRow, c("b6", "avals"));
    Loc.print(s, drRow, c("b6", "drift")); Loc.lit(s, "#w-ok", [...opRows, ...drRow], c("b6", "drift"));
  },
});
