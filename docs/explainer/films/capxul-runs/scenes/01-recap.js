// Sheet 1. From one description: the blueprint on the left, and the eight things this film shows being made from it.
Film.scene("recap", {
  html: () => {
    const outs = [["the contract", "generated/solidity"], ["the server", "generated/server"], ["two actors", "Relayer · Indexer"], ["the SDK", "generated/sdk"],
      ["the command line", "generated/cli"], ["an agent's tools", "generated/mcp"], ["the app", "generated/web"], ["the infrastructure", "generated/infra"]];
    const y = (k) => 286 + k * 82;
    return `${Kit.css}${Loc.css}<style>
      #scene-recap .bp { left: 96px; top: 330px; width: 600px; border: 2px solid var(--paper); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); padding: 26px 30px 14px; }
      #scene-recap .bp .nm { font-size: 44px; font-weight: 500; margin: 4px 0 20px; } #scene-recap .bp .line { font-size: 28px; line-height: 1.3; padding: 15px 0; border-top: 1px solid var(--rule2); color: var(--paper); } #scene-recap .bp .line span { display: block; font-size: 23px; color: var(--text2); }
      #scene-recap .made { position: absolute; left: 1150px; width: 674px; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; border: 1px solid rgba(98,198,255,.7); background: rgba(14,28,48,.92); font-size: 28px; color: var(--paper); } #scene-recap .made em { font: 400 20px var(--mono); font-style: normal; color: var(--cyan); }
      #scene-recap .instep { left: 1150px; top: 950px; width: 674px; text-align: right; color: var(--cyan); }
    </style>
    <div class="head"><div class="eyebrow">Part two</div><div class="hl">One description. Everything else is made from it.</div></div>
    <div class="abs bp"><div class="lbl">you write · the blueprint</div><div class="nm">Capxul Lite</div>
      <div class="line b0">a treasury, with budgets<span>on a chain, in a contract of its own</span></div>
      <div class="line b1">the reasons, and the books<span>on our server</span></div>
      <div class="line b2">who may do what, and what must stay true<span>roles, rules, machines, events</span></div></div>
    <svg class="ink">${outs.map((_, k) => `<path class="cy" d="M696 590 C 930 590, 930 ${y(k) + 32}, 1150 ${y(k) + 32}"/>`).join("")}</svg>
    ${outs.map(([name, where], k) => `<div class="made" style="top:${y(k)}px"><span>${name}</span><em>${where}</em></div>`).join("")}
    <div class="abs instep lnote">made from it · kept in step with it</div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3); s.in(".bp", s.start + 0.5, { y: 14 });
    s.in(".b0", c("r1", "treasury"), { y: 8, dur: 0.35 }); s.in(".b1", c("r1", "server"), { y: 8, dur: 0.35 }); s.in(".b2", c("r1", "books") + 0.5, { y: 8, dur: 0.35 });
    const t = c("r2", "falls out");
    s.$$("svg path").forEach((p, k) => s.draw([p], t + k * 0.22, 0.5));
    s.in(".made", t + 0.3, { x: 16, y: 0, stagger: 0.22, dur: 0.35 });
    s.in(".instep", c("r2", "stays in step") - 0.2);
    s.to(".made", { borderColor: "#62c6ff", boxShadow: "0 0 0 4px rgba(98,198,255,.14)", duration: 0.3, stagger: 0.05 }, c("r2", "stays in step"));
  },
});
