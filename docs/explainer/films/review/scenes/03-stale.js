// Sheet 3. How far the change reaches: review-impact-before (nothing stale, seven proven), the proof that left its record,
// then review-impact (handle.claim changed and stale, six standing). The row of seven operations is set from each.
Film.scene("stale", {
  step: "stale",
  html: (D) => {
    const F = Rv.facts(D), last = Rv.out(D, "review-prove-before").pop();
    Rv.must(last === "prove ✔", "the proof before the change did not pass, so it left no record");
    return `${Kit.css}${Rv.css("stale")}<style>
      #scene-stale #st-rec .tag, #scene-stale #st-before .tag, #scene-stale #st-now .tag { color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">What the change unproved</div><div class="hl">How far does the change reach?</div></div>
    <div class="who">${Kit.who("agent", "the reviewer")}</div>
    ${Kit.term(D, { id: "st-before", cap: "review-impact-before", x: 96, y: 262, w: 1100, h: 222, title: "plugged-in", tag: '<span class="tag">before the change</span>' })}
    ${Kit.term(D, { id: "st-rec", cap: "review-prove-before", x: 1236, y: 262, w: 588, h: 222, keep: (l) => l === last, title: "the record it compares with", cls: "hidden0" })}
    ${Kit.term(D, { id: "st-now", cap: "review-impact", x: 96, y: 504, w: 1728, h: 222, cls: "hidden0", title: "plugged-in", tag: '<span class="tag">with the change in place</span>' })}
    ${Rv.ops(D, ["review-impact-before", "review-impact"])}`;
  },
  build(s) {
    const c = s.cue, B = s.$("#st-before"), R = s.$("#st-rec"), N = s.$("#st-now");
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    s.in(".ops", s.start + 0.6, { y: 12 });
    // c1: one command: ortho impact.
    s.in(B, c("c1", "One command") - 0.1, { y: 14 });
    const typed = Rv.type(s, B, c("c1", "ortho"), 0.7);
    // c2: it compares with the record the last full proof left. Before: nothing stale, seven proven.
    s.in(R, c("c2", "record") - 0.1, { x: 14, y: 0 }); Rv.type(s, R, c("c2", "record"), 0.5); Rv.print(s, s.$$("#st-rec .o"), c("c2", "proof"));
    s.to(R, { borderColor: "#e9f0fa", duration: 0.3 }, c("c2", "machine"));
    const rows = s.$$("#st-before .o"); Rv.print(s, rows, typed + 0.35, 0.12);
    const none = Rv.rows(s, "#st-before", /^stale none$/), proven = Rv.rows(s, "#st-before", /^proven /);
    Rv.lit(s, "#st-before", none, c("c2", "nothing"));
    Rv.lit(s, "#st-before", proven, c("c2", "seven")); Rv.set(s, "review-impact-before", c("c2", "seven"));
    // c3: with the change in place, it names the declaration that changed.
    const t3 = c("c3");
    s.to(R, { opacity: 0.45, duration: 0.3 }, t3); Rv.lit(s, "#st-before", [], t3);
    s.in(N, t3 - 0.1, { y: 14 }); Rv.type(s, N, t3 + 0.1, 0.7); const nr = s.$$("#st-now .o"); Rv.print(s, nr, c("c3", "names") - 0.1, 0.12);
    const changed = Rv.rows(s, "#st-now", /^changed operation /)[0];
    Rv.lit(s, "#st-now", [changed], c("c3", "declaration")); s.in(Rv.label(changed, "what changed"), c("c3", "declaration") + 0.05, { x: 14, y: 0, dur: 0.3 });
    Rv.hit(s, Rv.mark(changed, "handle.claim"), c("c3", "Handle")); Rv.hit(s, Rv.mark(changed, "budget"), c("c3", "budget")); Rv.hit(s, Rv.mark(changed, "description"), c("c3", "description"));
    // c4: what it unproved. One stale, the other six stand.
    const stale = Rv.rows(s, "#st-now", /^stale handle\.claim$/), stand = Rv.rows(s, "#st-now", /^proven /);
    Rv.lit(s, "#st-now", stale, c("c4", "unproved")); s.in(Rv.label(stale[0], "no longer proven"), c("c4", "unproved") + 0.05, { x: 14, y: 0, dur: 0.3 });
    Rv.set(s, "review-impact", c("c4", "One operation"));
    Rv.lit(s, "#st-now", [...stale, ...stand], c("c4", "six"));
    Rv.pulse(s, Rv.impact(s.D, "review-impact").proven, c("c4", "six"));
  },
});
