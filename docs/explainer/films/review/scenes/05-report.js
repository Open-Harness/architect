// Sheet 5. What you read: the four lines of blueprint and a finding's three parts. When it goes wrong: review-check-early
// (drift failing on every file behind) and review-impact-handler (stale, with no changed line). Ask before you prove.
// The honest notes, each part stamped with how it stands, and the next chapter.
Film.scene("report", {
  step: "report",
  html: (D) => {
    const F = Rv.facts(D), early = Rv.out(D, "review-check-early"), drift = early.find((l) => /^drift ✘ \d+$/.test(l));
    const behind = early.filter((l) => /^  generated\//.test(l));
    Rv.must(drift && +drift.split(" ").pop() === behind.length && behind.length === F.st.gen.length, "the early check does not name every generated file as behind");
    Rv.must(early.includes("check ✘"), "the early check did not fail");
    const hd = Rv.impact(D, "review-impact-handler");
    Rv.must(hd.changed.length === 0 && hd.stale.length === 1, "the handler's impact is not one stale operation with no changed line");
    Rv.must(Rv.impact(D, "review-impact-after").stale.length === 0, "after a full proof, something is stale");
    const four = F.df.outs.length + F.df.ins.length;
    return `${Kit.css}${Rv.css("report")}<style>
      #scene-report .term .tag { color: var(--text2); }
      #scene-report .finding { left: 1236px; top: 262px; width: 588px; height: 330px; } #scene-report .finding .part { font-size: 34px; line-height: 1.5; color: var(--paper); } #scene-report .finding .part::before { content: "·"; color: var(--muted); margin-right: 14px; }
      #scene-report #rp-early .o { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: 0; text-indent: 0; }
      #scene-report .moved { left: 1236px; top: 524px; width: 588px; height: 260px; } #scene-report .moved .kbig { font-size: 34px; }
      #scene-report .moved .chip { margin-top: 18px; color: var(--paper); }
      #scene-report .order { left: 96px; top: 290px; display: flex; align-items: center; gap: 22px; }
      #scene-report .order .chip { font-size: 30px; padding: 12px 26px; } #scene-report .order .chip.first { border-color: var(--paper); } #scene-report .order i { font-style: normal; font-size: 40px; color: var(--muted); }
      #scene-report .order .lbl { font-size: 24px; }
      #scene-report .writes { left: 96px; top: 410px; width: 1100px; }
      #scene-report .staged { left: 96px; top: 270px; right: 96px; } #scene-report .staged .big { font-size: 64px; font-weight: 500; letter-spacing: -.02em; line-height: 1.1; }
      #scene-report .staged .facts { display: flex; flex-direction: column; gap: 10px; margin-top: 30px; font-size: 36px; color: var(--text2); } #scene-report .staged .facts b { color: var(--paper); font-weight: 500; }
      #scene-report .next { left: 96px; top: 300px; } #scene-report .next .big { font-size: 64px; font-weight: 500; letter-spacing: -.02em; }
      #scene-report .next .row { display: flex; align-items: center; gap: 18px; margin-top: 40px; } #scene-report .next .chip { font-family: var(--sans); font-size: 36px; padding: 14px 30px; border-color: var(--paper); }
      #scene-report .stands .kstand span { font-size: 22px; color: var(--text2); text-transform: none; letter-spacing: 0; font-family: var(--sans); font-weight: 400; }
    </style>
    <div class="head"><div class="eyebrow">What you read</div><div class="hl">Four lines, and the findings.</div></div>
    <div class="who">${Kit.who("you")}</div>
    ${Kit.term(D, { id: "rp-diff", cap: "review-diff", x: 96, y: 262, w: 1100, h: 250, keep: (l) => /^-(?!--)/.test(l) || /^\+(?!\+\+)/.test(l), size: 19, cls: "hidden0 ph1", tag: `<span class="tag">${four} lines of blueprint</span>` })}
    <div class="kbox finding hidden0 ph1"><div class="lbl">a finding names</div><div class="part p1 hidden0">a file</div><div class="part p2 hidden0">a line</div><div class="part p3 hidden0">what would make it right</div></div>
    ${Kit.term(D, { id: "rp-early", cap: "review-check-early", x: 96, y: 262, w: 1100, h: 430, size: 19, keep: (l) => /^drift |^  generated\/|^check /.test(l), cls: "hidden0 ph2", tag: '<span class="tag">handed over before generate</span>' })}
    ${Kit.term(D, { id: "rp-hand", cap: "review-impact-handler", x: 1236, y: 262, w: 588, h: 244, size: 19, cls: "hidden0 ph2", tag: '<span class="tag">a handler line added</span>' })}
    <div class="kbox moved hidden0 ph2"><div class="lbl">no line says what changed</div><div class="kbig">The code moved.<br>The blueprint did not.</div><span class="chip rh hidden0">the reviewer reads src/handle/claim.ts</span></div>
    <div class="abs order hidden0 ph3"><span class="lbl">ask first</span><span class="chip first">ortho impact</span><i>→</i><span class="lbl">then</span><span class="chip">ortho prove</span></div>
    <div class="abs writes hidden0 ph3"><div class="say">A full proof writes a new record.</div><div class="say mu aft hidden0" style="margin-top:12px">After it, nothing is stale.</div></div>
    <div class="abs staged hidden0 ph4"><div class="lbl" style="font-size:24px">honest notes</div><div class="big">This was staged.</div>
      <div class="facts"><div class="f1 hidden0"><b>The recording</b> made the change.</div><div class="f2 hidden0"><b>No reviewer</b> was filmed reading it.</div><div class="f3 hidden0"><b>No command</b> checks who wrote what.</div></div></div>
    <div class="abs next hidden0"><div class="lbl" style="font-size:24px">next</div><div class="row"><span class="chip k1 hidden0">run the app</span><span class="chip k2 hidden0">break it</span><span class="chip k3 hidden0">read the trace</span></div></div>
    <div class="stands">
      <div class="sd1 hidden0">${Kit.stand("real", "every command on these sheets, replayed from its recording; the change itself was staged by the recording", "left:96px;top:800px")}</div>
      <div class="sd2 hidden0">${Kit.stand("practice", "a reviewer that wrote none of it: no command checks who wrote what", "left:96px;top:852px")}</div>
      <div class="sd3 hidden0">${Kit.stand("missing", "a printed brief for a change to the blueprint", "left:96px;top:904px")}</div>
    </div>
    ${Rv.ops(D, ["review-impact-after", "review-impact-handler"])}`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    Rv.set(s, "review-impact-after", s.start, { now: true }); s.in(".ops", s.start + 0.4, { y: 0 });
    // e1: four lines of blueprint, and the findings.
    const P = s.$("#rp-diff"); s.in(P, s.start + 0.5, { y: 14 });
    s.fromTo("#rp-diff .cmd", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, s.start + 0.5); s.fromTo("#rp-diff .typed", { width: "auto" }, { width: "auto", duration: 0.01 }, s.start + 0.5);
    Rv.print(s, s.$$("#rp-diff .o"), c("e1", "four") - 0.1, 0.12);
    s.in(".finding", c("e1", "findings"), { x: 14, y: 0 });
    s.in(".p1", c("e1", "file"), { y: 8, dur: 0.3 }); s.in(".p2", c("e1", "line", 2), { y: 8, dur: 0.3 }); s.in(".p3", c("e1", "what"), { y: 8, dur: 0.3 });
    // e2: handed over before generate: the check fails and names every file behind.
    const t2 = c("e2");
    s.out(".ph1", t2 - 0.35, { dur: 0.3 });
    const E = s.$("#rp-early"); s.in(E, t2, { y: 14 }); Rv.type(s, E, c("e2", "Generate"), 0.45);
    const er = s.$$("#rp-early .o"), drift = Rv.rows(s, "#rp-early", /^drift ✘/), files = Rv.rows(s, "#rp-early", /^  generated\//), fail = Rv.rows(s, "#rp-early", /^check ✘$/);
    Rv.print(s, [...drift, ...fail], c("e2", "check") - 0.1, 0.1); Rv.lit(s, "#rp-early", fail, c("e2", "fails"));
    Rv.print(s, files, c("e2", "names"), 0.1); Rv.lit(s, "#rp-early", [...drift, ...files, ...fail], c("e2", "every"));
    s.in(Rv.label(drift[0], `${files.length} behind`), c("e2", "every") + 0.05, { x: 14, y: 0, dur: 0.3 });
    // e3: stale, and no line says what changed. The code moved; the reviewer reads the handler.
    const H = s.$("#rp-hand"); s.to(E, { opacity: 0.45, duration: 0.3 }, c("e3"));
    s.in(H, c("e3") - 0.1, { x: 14, y: 0 }); Rv.type(s, H, c("e3") + 0.05, 0.6); Rv.print(s, s.$$("#rp-hand .o"), c("e3", "stale") - 0.1, 0.12);
    const st = Rv.rows(s, "#rp-hand", /^stale /);
    Rv.lit(s, "#rp-hand", st, c("e3", "stale") + 0.2); Rv.set(s, "review-impact-handler", c("e3", "stale") + 0.2);
    s.in(".moved", c("e3", "no line"), { y: 12 }); s.in(".rh", c("e3", "reviewer reads"), { y: 8 });
    // e4: ask impact before you prove; a full proof writes a new record.
    const t4 = c("e4");
    s.out(".ph2", t4 - 0.35, { dur: 0.3 });
    s.in(".order", c("e4", "ask"), { y: 12 }); s.in(".writes", c("e4", "writes") - 0.2, { y: 12 });
    s.in(".writes .aft", c("e4", "after"), { y: 8 }); Rv.set(s, "review-impact-after", c("e4", "nothing"), { stagger: 0 });
    // e5: honest notes, each part stamped.
    const t5 = c("e5");
    s.out(".ph3", t5 - 0.35, { dur: 0.3 }); s.out(".ops", t5 - 0.35, { dur: 0.3 });
    s.in(".staged", t5, { y: 12 });
    s.in(".f1", c("e5", "recording"), { y: 8 }); s.in(".f2", c("e5", "no reviewer"), { y: 8 }); s.in(".f3", c("e5", "no command"), { y: 8 });
    s.in(".sd1", c("e5", "staged"), { y: 6 }); s.in(".sd2", c("e5", "practice") - 0.2, { y: 6 }); s.in(".sd3", c("e5", "practice") + 0.5, { y: 6 });
    // e6: next.
    const t6 = c("e6");
    s.out(".staged", t6 - 0.35, { dur: 0.3 }); s.in(".next", t6, { y: 12 });
    s.in(".k1", c("e6", "run"), { y: 10 }); s.in(".k2", c("e6", "break"), { y: 10 }); s.in(".k3", c("e6", "read"), { y: 10 });
  },
});
