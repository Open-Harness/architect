// Sheet 2. A claim is two cells of one row of docs/canon/status.md: the lane and the paths. The two folders drop into the
// app goal's lane, and the recorded count of claims lands on each lane.
Film.scene("claim", {
  step: "claim",
  html: (D) => {
    const R = Agt.row(D, "gap-wide-things"), lane = R.cell("Lane"), touches = R.cell("Touches");
    const goal = (/^goal-(\d+)$/.exec(lane) ?? [])[1]; if (goal !== "16") throw new Error("claim: the narration says goal sixteen holds the row; its lane is " + lane);
    const paths = [...touches.matchAll(/`([^`]+)`/g)].map((m) => m[1]); if (paths.length !== 2) throw new Error("claim: the narration says two folders; the row names " + paths.length);
    Agt.at(D, goal);
    return `${Kit.css}${Agt.css("claim")}<style>
      #scene-claim .st { left: 96px; top: 320px; width: 1500px; }
      #scene-claim #cl-head .code, #scene-claim #cl-row .code { padding: 10px 0; }
      #scene-claim .clab { top: 0; } #scene-claim .clab b { font-family: var(--mono); font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--cyan); }
      #scene-claim .reads { position: absolute; right: 18px; top: 0; bottom: 0; display: flex; align-items: center; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--text2); }
      #scene-claim .none { left: 1240px; top: 300px; width: 584px; }
      #scene-claim .none .num { font-family: var(--mono); font-size: 84px; line-height: 1; color: var(--paper); }
      #scene-claim .none .lbl { font-size: 24px; margin-top: 12px; line-height: 1.4; }
    </style>
    <div class="head"><div class="eyebrow">Claim</div><div class="hl">Claim before you build.</div></div>
    <div class="who">${Kit.who("agent", Agt.goals(D)[Agt.at(D, goal)].n + " · " + Agt.goals(D)[Agt.at(D, goal)].name)}</div>
    <div class="abs st st1 hidden0"><div class="say">Before a goal builds anything, it claims it.</div></div>
    ${Agt.ed(D, { id: "cl-head", path: "docs/canon/status.md", x: 96, y: 262, w: 1728, from: R.h, to: R.h, size: "small", cls: "hidden0", tag: '<span class="tag">the header</span>' })}
    ${Agt.ed(D, { id: "cl-row", path: "docs/canon/status.md", x: 96, y: 386, w: 1728, from: R.n, to: R.n, size: "small", cls: "hidden0", tag: '<span class="tag">one row: one piece of work</span>' })}
    ${Kit.term(D, { id: "cl-term", cap: "agents-claims", x: 96, y: 262, w: 1100, h: 190, title: "the repository's root", cls: "hidden0", tag: '<span class="tag">claims held today</span>' })}
    <div class="abs none hidden0"><div class="num">${Agt.laneCounts(D).none}</div><div class="lbl">rows of the status page whose lane says none</div></div>
    ${Agt.lanes(D, {
      fill: (g) => (g.n === goal ? paths.map((p, k) => `<span class="piece folder f${k} hidden0">${Film.esc(p)}</span>`).join("") : ""),
      dest: (g) => `<div class="badge hidden0 cnt-${g.n}"></div>${g.n === goal ? "" : '<div class="reads hidden0">reads the row first</div>'}`,
    })}`;
  },
  build(s) {
    const c = s.cue, D = s.D, R = Agt.row(D, "gap-wide-things"), goal = "16", root = s.el;
    const head = s.$("#cl-head .ln code"), line = s.$("#cl-row .ln code");
    const hLane = Agt.mark(head, "Lane"), hTouch = Agt.mark(head, "Touches"), cLane = Agt.mark(line, R.cell("Lane")), cTouch = Agt.mark(line, R.cell("Touches"));
    // Labels under the row, each at its cell.
    const rowBox = s.$("#cl-row"), below = rowBox.offsetTop + rowBox.offsetHeight + 14;
    const l1 = Agt.label(root, "the lane: names the goal", Agt.pos(cLane, root).x, below), l2 = Agt.label(root, "the paths it will change", Agt.pos(cTouch, root).x, below + 40);
    // The claims recorded, by lane; a lane with none printed says none.
    const held = Object.fromEntries(D.cap["agents-claims"].out.split("\n").map((l) => { const m = /^ *(\d+) \| (goal-\d+) \|$/.exec(l); if (!m) throw new Error("agents-claims: a line is not a count"); return [m[2], +m[1]]; }));
    if (held["goal-16"] !== 13 || held["goal-18"] !== 1) throw new Error("claim: the narration says thirteen and one; the recording says " + JSON.stringify(held));
    Agt.goals(D).forEach((g) => { const n = held["goal-" + g.n]; s.$(".cnt-" + g.n).textContent = n ? `${n} claim${n > 1 ? "s" : ""}` : "none"; });
    const lanes = Object.fromEntries(Agt.goals(D).map((g) => [g.n, s.$(".lane-" + g.n)]));

    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(".lane", s.start + 0.5, { x: -12, y: 0, stagger: 0.08 });
    // c1
    s.in(".st1", c("c1", "Before"), { y: 12 });
    // c2: the row, and its two cells.
    s.out(".st1", c("c2") - 0.3, { dur: 0.3 });
    s.in("#cl-head", c("c2", "status"), { y: 12 }); s.in("#cl-row", c("c2", "row"), { y: 12 });
    s.to([cLane, cTouch], { color: "#ffffff", duration: 0.3 }, c("c2", "two cells"));
    Agt.glow(s, hLane, c("c2", "lane")); Agt.glow(s, cLane, c("c2", "lane")); s.in(l1, c("c2", "lane") + 0.05, { y: 6, dur: 0.3 });
    Agt.glow(s, hTouch, c("c2", "paths")); Agt.glow(s, cTouch, c("c2", "paths")); s.in(l2, c("c2", "paths") + 0.05, { y: 6, dur: 0.3 });
    // c3: goal sixteen holds it, and its two folders drop into its lane.
    Object.entries(lanes).forEach(([n, el]) => { if (n !== goal) s.to(el, { opacity: 0.45, duration: 0.3 }, c("c3", "16")); });
    s.to(lanes[goal].querySelector(".band"), { borderColor: "#e9f0fa", duration: 0.3 }, c("c3", "16"));
    s.fromTo(".folder.f0", { autoAlpha: 0, y: -300 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" }, c("c3", "two"));
    s.fromTo(".folder.f1", { autoAlpha: 0, y: -300 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" }, c("c3", "folders"));
    Object.entries(lanes).forEach(([n, el]) => { if (n !== goal) { s.to(el, { opacity: 1, duration: 0.3 }, c("c3", "Any")); s.in(el.querySelector(".reads"), c("c3", "reads"), { x: -10, y: 0 }); } });
    // c4: the count, lane by lane.
    s.out("#cl-head, #cl-row, .tlab, .reads", c("c4") - 0.35, { dur: 0.3 });
    const T = s.$("#cl-term"); s.in(T, c("c4"), { y: 12 }); Agt.type(s, T, c("c4", "counted"), 0.9); Agt.print(s, s.$$("#cl-term .o"), c("c4", "today") + 0.1, 0.15);
    const r16 = Agt.orow(T, /goal-16/), r18 = Agt.orow(T, /goal-18/);
    Agt.lit(s, T, [r16], c("c4", "13")); s.in(".cnt-16", c("c4", "13"), { x: 10, y: 0 });
    Agt.lit(s, T, [r16, r18], c("c4", "one")); s.in(".cnt-18", c("c4", "one"), { x: 10, y: 0 });
    Agt.goals(D).filter((g) => !held["goal-" + g.n]).forEach((g) => s.in(".cnt-" + g.n, c("c4", "none"), { x: 10, y: 0 }));
    s.in(".none", c("c4", "every"), { x: 14, y: 0 });
  },
});
