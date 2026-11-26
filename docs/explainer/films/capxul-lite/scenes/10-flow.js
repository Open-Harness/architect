// Sheet 10. One payment, hop by hop, across the three places that decide. The spend's own states are on the right.
Film.scene("flow", {
  step: "flow",
  html: () => {
    const lanes = [["Our server", 96, "ours"], ["Ada's wallet", 660, "dev"], ["The chain", 1124, "chain"]], w = [540, 440, 420];
    const steps = [[0, "spend.draft", "the reason is recorded"], [2, "budget.spend, tried only", "not sent, nothing to pay"], [1, "sign", "it shows the operation's own description"], [0, "the relayer sends it", "she never needs gas"], [2, "the contract", "checks, pays, emits BudgetSpent(note)"], [0, "the follower waits", "until the chain won't take it back"], [0, "spend.settle", "the entry is written, in one commit"]];
    return `<style>
      #scene-flow .lane { position: absolute; top: 250px; bottom: 96px; border-left: 1px dashed var(--rule2); } #scene-flow .lane .lbl { position: absolute; left: 14px; top: 0; font-size: 22px; white-space: nowrap; }
      #scene-flow .st { position: absolute; height: 76px; padding: 9px 16px; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.96), rgba(12,24,42,.97)); } #scene-flow .st b { display: block; font-family: var(--mono); font-size: 22px; font-weight: 500; } #scene-flow .st span { font-size: 18.5px; color: var(--text2); white-space: nowrap; }
      #scene-flow .st.ours { border-color: rgba(98,198,255,.7); } #scene-flow .st.dev { border-color: rgba(84,216,152,.7); } #scene-flow .st.chain { border-color: rgba(255,181,92,.7); } #scene-flow .st.try { border-style: dashed; }
      #scene-flow .no { position: absolute; left: 1124px; top: 474px; width: 420px; font-size: 20px; color: var(--red); }
      #scene-flow .track { left: 1570px; top: 250px; width: 254px; } #scene-flow .track .kpill { display: block; margin-top: 14px; text-align: center; font-size: 24px; } #scene-flow .track .w { font-family: var(--label); text-transform: uppercase; letter-spacing: .12em; font-size: 16px; font-weight: 600; color: var(--amber); text-align: center; margin-top: 4px; }
    </style>
    <div class="head"><div class="eyebrow">One payment</div><div class="hl">Three places decide. The machine names every wait.</div></div>
    ${lanes.map(([name, x, cls]) => `<div class="lane" style="left:${x - 14}px"><span class="lbl ${cls === "ours" ? "cy" : cls === "dev" ? "gr" : "am"}">${name}</span></div>`).join("")}
    ${steps.map(([lane, name, what], k) => `<div class="st st${k} ${lanes[lane][2]}${k === 1 ? " try" : ""}" style="left:${lanes[lane][1]}px;top:${300 + k * 92}px;width:${w[lane]}px"><b>${k + 1} · ${name}</b><span>${what}</span></div>`).join("")}
    <div class="no hidden0">over her limit? refused here, for free, before anyone signs</div>
    <div class="abs track"><div class="lbl">the spend is</div><span class="kpill p0">drafted</span><div class="w w0 hidden0">waiting on her wallet</div><span class="kpill p1">sent</span><div class="w w1 hidden0">waiting on the chain</div><span class="kpill p2">paid</span></div>`;
  },
  build(s) {
    const c = s.cue, lit = { borderColor: "#62c6ff", color: "#62c6ff", backgroundColor: "rgba(98,198,255,.12)", duration: 0.3 }, dim = { borderColor: "rgba(132,170,222,.36)", color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: 0.3 };
    s.in(".head", s.start + 0.3); s.in(".lane", c("p1"), { y: 0, stagger: 0.12 }); s.in(".track", c("p1") + 0.3, { x: 16, y: 0 });
    const step = (k, t) => s.in(".st" + k, t, { y: 16, dur: 0.45 });
    step(0, c("p2", "drafted") - 0.9); s.to(".p0", lit, c("p2", "drafted"));
    step(1, c("p3", "tried") - 0.3); s.in(".no", c("p3", "over her limit"), { y: 6 }); s.to(".no", { autoAlpha: 0.45, duration: 0.3 }, c("p4") - 0.2);
    step(2, c("p4", "wallet") - 0.3);
    step(3, c("p5", "relayer") - 0.2); s.to(".p0", dim, c("p5", "relayer") + 0.2); s.to(".p1", lit, c("p5", "relayer") + 0.2);
    step(4, c("p5", "contract") - 0.2);
    step(5, c("p6", "follower") - 0.2);
    step(6, c("p6", "paid") - 0.3); s.to(".p1", dim, c("p6", "paid")); s.to(".p2", { borderColor: "#54d898", color: "#54d898", backgroundColor: "rgba(84,216,152,.12)", duration: 0.3 }, c("p6", "paid"));
    s.in(".w0", c("p7", "waiting state"), { y: 0 }); s.in(".w1", c("p7", "waiting state") + 0.3, { y: 0 });
    s.to(".p0, .p1", { borderColor: "#ffb55c", color: "#ffb55c", duration: 0.3, stagger: 0.3 }, c("p7", "waiting state"));
  },
});
