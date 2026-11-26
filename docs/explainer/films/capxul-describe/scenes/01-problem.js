// Sheet 1. The viewer has built this before: the same three facts written in six places, and the question nobody can answer by looking.
Film.scene("problem", {
  step: "problem",
  html: () => {
    const facts = ["Who may spend", "What the limit is", "What “paid” means"], places = ["the contract", "the server", "the database", "the app", "the SDK", "the agent's tools"];
    return `${Kit.css}<style>
      #scene-problem .asks { left: 96px; top: 244px; display: flex; gap: 14px; } #scene-problem .asks .kpill { font-family: var(--sans); font-size: 26px; color: var(--paper); padding: 8px 18px; }
      #scene-problem .grid { left: 96px; top: 372px; width: 1728px; display: grid; grid-template-columns: 318px repeat(6, 1fr); gap: 12px 12px; }
      #scene-problem .ph { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--muted); text-align: center; padding-bottom: 6px; }
      #scene-problem .fact { font-size: 32px; font-weight: 500; display: flex; align-items: center; } #scene-problem .cell { height: 86px; border: 1px solid var(--rule2); background: rgba(19,37,62,.7); display: grid; place-items: center; font-family: var(--mono); font-size: 19px; color: var(--text2); }
      #scene-problem .cell b { font-weight: 400; } #scene-problem .cell .q { position: absolute; font-size: 44px; color: var(--red); opacity: 0; } #scene-problem .cell { position: relative; }
      #scene-problem .aft { left: 96px; top: 752px; } #scene-problem .ask2 { left: 96px; right: 96px; top: 800px; }
    </style>
    <div class="head"><div class="eyebrow">A treasury, on chain</div><div class="hl">You've built this before.</div></div>
    <div class="abs asks">${["money on chain", "owners who sign together", "budgets people spend alone", "books that agree with all of it"].map((t) => `<span class="kpill">${t}</span>`).join("")}</div>
    <div class="abs grid"><div></div>${places.map((p, k) => `<div class="ph p${k}">${p}</div>`).join("")}
      ${facts.map((f, r) => `<div class="fact f${r}">${f}</div>${places.map((_, k) => `<div class="cell r${r} c${k}"><b>written here</b><span class="q">?</span></div>`).join("")}`).join("")}</div>
    <div class="abs aft kpill" style="border-color:var(--cyan);color:var(--cyan);font-family:var(--sans);font-size:24px">written by an agent, in an afternoon</div>
    <div class="abs ask2 kbig"><span class="q1">Is it right?</span> <span class="q2" style="color:var(--text2)">And when one rule changes, what else has to?</span></div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head .eyebrow", s.start + 0.4); s.in(".head .hl", c("a1") - 0.1);
    ["money", "Owners", "Budgets", "books"].forEach((w, k) => s.in(s.$$(".asks .kpill")[k], c("a1", w), { y: 10, dur: 0.4 }));
    ["Who may", "What the limit", "What paid"].forEach((w, r) => s.in(".f" + r, c("a2", w), { x: -16, y: 0 }));
    ["contract", "server", "database", "app", "SDK", "agent"].forEach((w, k) => { s.in(".p" + k, c("a3", w), { y: 8, dur: 0.3 }); s.in(".c" + k, c("a3", w) + 0.05, { y: 10, dur: 0.35, stagger: 0.06 }); });
    s.in(".aft", c("a4", "afternoon") - 0.5, { y: 8 }); s.to(".cell", { borderColor: "rgba(98,198,255,.6)", duration: 0.3, stagger: 0.02 }, c("a4", "afternoon") - 0.4);
    s.to(".aft", { autoAlpha: 0, duration: 0.3 }, c("a5") - 0.2);
    s.in(".q1", c("a5", "Is it right"), { y: 12 });
    const change = c("a5", "one rule");
    s.to(".r1.c0", { borderColor: "#ffb55c", backgroundColor: "rgba(255,181,92,.14)", color: "#ffb55c", duration: 0.3 }, change); s.to(".r1.c0 b", { opacity: 1, duration: 0.01 }, change);
    s.in(".q2", change, { y: 12 });
    s.to(".r0 b, .r2 b", { opacity: 0.25, duration: 0.3 }, c("a5", "what else")); s.to(".r1:not(.c0) b", { opacity: 0, duration: 0.3 }, c("a5", "what else")); s.to(".r1:not(.c0) .q", { opacity: 1, duration: 0.25, stagger: 0.09 }, c("a5", "what else"));
    s.to(".r1:not(.c0)", { borderColor: "#ff7373", duration: 0.25, stagger: 0.09 }, c("a5", "what else"));
  },
});
