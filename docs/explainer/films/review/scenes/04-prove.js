// Sheet 4. The reviewer runs it itself: review-prove (seven journeys, claim's performance line against the new budget),
// review-check (drift passes), then review-impact-after, and the row of seven is all proven again.
Film.scene("prove", {
  step: "prove",
  html: (D) => {
    const F = Rv.facts(D), was = +((/budget p95 (\d+)ms$/.exec(Rv.out(D, "review-prove-before").find((l) => /^handle\.claim performance /.test(l)) ?? "") ?? [])[1]);
    Rv.must(was === F.df.was, "the proof before the change did not measure claim against the old budget");
    Rv.must(Rv.out(D, "review-check").includes("drift ✔"), "the reviewer's check has no passing drift line");
    const keep = (l) => l.startsWith("journey ") || l === F.perf || /^prove /.test(l);
    return `${Kit.css}${Rv.css("prove")}<style>
      #scene-prove .term .tag { color: var(--text2); }
      #scene-prove .why { left: 1236px; top: 574px; width: 588px; height: 208px; border-color: var(--paper); } #scene-prove .why .kbig { font-size: 34px; }
      #scene-prove .verdict { left: 760px; top: 716px; font: 600 54px var(--mono); color: var(--green); border: 4px solid var(--green); padding: 4px 26px; transform: rotate(-4deg); background: rgba(8,17,31,.92); }
    </style>
    <div class="head"><div class="eyebrow">Run the proof yourself</div><div class="hl">A report that says it passes is a claim.</div></div>
    <div class="who">${Kit.who("agent", "the reviewer")}</div>
    ${Kit.term(D, { id: "pv-prove", cap: "review-prove", x: 96, y: 262, w: 1100, h: 440, keep, cls: "hidden0 ph1", tag: '<span class="tag">run by the reviewer</span>' })}
    <div class="abs verdict hidden0 ph1">${Film.esc(Rv.out(D, "review-prove").pop())}</div>
    ${Kit.term(D, { id: "pv-check", cap: "review-check", x: 1236, y: 262, w: 588, h: 292, size: 19, cls: "hidden0" })}
    <div class="kbox why hidden0"><div class="lbl">why nobody read the ${F.st.gen.length}</div><div class="kbig">each generated file is exactly what the blueprint makes</div></div>
    ${Kit.term(D, { id: "pv-after", cap: "review-impact-after", x: 96, y: 262, w: 1100, h: 222, cls: "hidden0", tag: '<span class="tag">asked once more</span>' })}
    <span class="wasmark hidden0" data-was="${was}"></span>
    ${Rv.ops(D, ["review-impact", "review-impact-after"])}`;
  },
  build(s) {
    const c = s.cue, F = Rv.facts(s.D), P = s.$("#pv-prove"), C = s.$("#pv-check"), A = s.$("#pv-after"), was = +s.$(".wasmark").dataset.was;
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // The row as the last sheet left it: claim stale.
    Rv.set(s, "review-impact", s.start, { now: true }); s.in(".ops", s.start + 0.4, { y: 0 });
    // d1: the reviewer runs the whole proof itself.
    s.in(P, c("d1", "so") - 0.1, { y: 14 }); Rv.type(s, P, c("d1", "runs"), 0.7);
    const rows = s.$$("#pv-prove .o"), js = rows.filter((o) => o.textContent.startsWith("journey ")), perf = Rv.rows(s, "#pv-prove", /^handle\.claim performance /)[0], end = rows[rows.length - 1];
    // d2: seven journeys pass; claim's performance line, against the new budget.
    Rv.print(s, js, c("d2", "Seven") - 0.15, 0.08); Rv.lit(s, "#pv-prove", js, c("d2", "pass"));
    s.in(Rv.label(js[0], `${js.length} journeys`), c("d2", "pass") + 0.05, { x: 14, y: 0, dur: 0.3 });
    Rv.print(s, [perf], c("d2", "claims")); Rv.lit(s, "#pv-prove", [perf], c("d2", "performance"));
    Rv.hit(s, Rv.mark(perf, `budget p95 ${F.budget}ms`), c("d2", "hundred"));
    const wl = Rv.label(perf, `was ${was}ms`); s.in(wl, c("d2", "new budget"), { x: 14, y: 0, dur: 0.3 });
    Rv.print(s, [end], c("d2", "milliseconds") + 0.3); s.fromTo(".verdict", { autoAlpha: 0, scale: 1.6, rotate: -4 }, { autoAlpha: 1, scale: 1, rotate: -4, duration: 0.35, ease: "back.out(2)" }, c("d2", "milliseconds") + 0.45);
    // d3: then the check; drift passes.
    const t3 = c("d3");
    s.in(C, t3 - 0.15, { x: 14, y: 0 }); Rv.type(s, C, t3, 0.45); Rv.print(s, s.$$("#pv-check .o"), c("d3", "check") + 0.2, 0.07);
    const drift = Rv.rows(s, "#pv-check", /^drift ✔$/);
    Rv.lit(s, "#pv-check", drift, c("d3", "drift")); s.in(Rv.label(drift[0], "drift"), c("d3", "drift") + 0.05, { x: 14, y: 0, dur: 0.3 });
    s.in(".why", c("d3", "one line"), { y: 12 });
    // d4: impact once more: nothing stale, seven proven.
    const t4 = c("d4");
    s.out(".ph1", t4 - 0.35, { dur: 0.3 }); s.to(".why", { opacity: 0.45, duration: 0.3 }, t4);
    s.in(A, t4 - 0.05, { y: 14 }); Rv.type(s, A, c("d4", "impact"), 0.6); const ar = s.$$("#pv-after .o"); Rv.print(s, ar, c("d4", "once") + 0.3, 0.12);
    Rv.lit(s, "#pv-after", Rv.rows(s, "#pv-after", /^stale none$/), c("d4", "nothing"));
    Rv.lit(s, "#pv-after", ar, c("d4", "seven")); Rv.set(s, "review-impact-after", c("d4", "seven"), { stagger: 0 });
    Rv.pulse(s, Rv.impact(s.D, "review-impact-after").proven, c("d4", "before"));
  },
});
