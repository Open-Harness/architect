// Sheet 4. Three parties, three jobs: one column for each, and in each the same stack with that party's layer lit.
Film.scene("who", {
  step: "who",
  html: () => {
    const col = (k, who, rows) => `<div class="party pa${k}" style="left:${96 + k * 584}px"><div class="chipline">${who}</div>
      ${Loc.stack({ id: "wh-stack" + k, x: 24, y: 84, w: 512, h: [56, 104, 140], gap: 10, subs: false, cls: "mini" })}
      <div class="jobs">${rows.map(([text, small], n) => `<div class="job j${k}${n} hidden0">${text}${small ? ` <span>${small}</span>` : ""}</div>`).join("")}</div></div>`;
    return `${Kit.css}${Loc.css("who")}<style>
      #scene-who .party { position: absolute; top: 280px; width: 560px; height: 692px; border: 1.5px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.6), rgba(12,24,42,.7)); }
      #scene-who .chipline { position: absolute; left: 24px; top: 22px; opacity: .55; } #scene-who .kwho.fw { color: var(--cyan); } #scene-who .kwho.fw::before { border-radius: 0; }
      #scene-who .jobs { position: absolute; left: 28px; right: 20px; top: 426px; } #scene-who .job { font-size: 36px; line-height: 50px; font-weight: 500; letter-spacing: -.01em; white-space: nowrap; }
      #scene-who .job span { font-size: 28px; font-weight: 400; color: var(--text2); letter-spacing: 0; }
    </style>
    <div class="head"><div class="eyebrow">Who does what</div><div class="hl">Three parties. Three jobs.</div></div>
    ${col(0, Kit.who("you"), [["decide the system"], ["read the blueprint"], ["and the stories"]])}
    ${col(1, Kit.who("agent", "your agents"), [["plan", "with you"], ["write the stories"], ["build", "the behaviour"], ["review", "each other"]])}
    ${col(2, '<span class="kwho fw">the framework</span>', [["makes the server"], ["the API"], ["the SDK"], ["the command line"], ["and proves them"]])}`;
  },
  build(s) {
    const c = s.cue, layer = ["top", "mid", "low"];
    s.in(".head", s.start + 0.3); s.in(".party", s.start + 0.45, { y: 14, stagger: 0.1 });
    // Each party on its line: its column comes forward and its layer of the stack lights.
    const on = (k, t) => { s.to(".pa" + k, { borderColor: k ? "#62c6ff" : "#e9f0fa", duration: 0.4 }, t); s.to(".pa" + k + " .chipline", { opacity: 1, duration: 0.3 }, t); Loc.light(s, s.$("#wh-stack" + k + " ." + layer[k]), t + 0.05); };
    const job = (k, n, t) => s.in(".j" + k + n, t, { y: 10, dur: 0.35 });
    // w2: you.
    on(0, c("w2")); job(0, 0, c("w2", "decide")); job(0, 1, c("w2", "read")); job(0, 2, c("w2", "stories"));
    // w3: your agents.
    on(1, c("w3")); job(1, 0, c("w3", "plan")); job(1, 1, c("w3", "Write")); job(1, 2, c("w3", "build")); job(1, 3, c("w3", "review"));
    // w4: the framework.
    on(2, c("w4")); job(2, 0, c("w4", "makes")); job(2, 1, c("w4", "API")); job(2, 2, c("w4", "SDK")); job(2, 3, c("w4", "command")); job(2, 4, c("w4", "proves"));
  },
});
