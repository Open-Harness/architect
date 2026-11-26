// Sheet 12. Proof: a journey in a world with a chain, a server, a cast with wallets and a clock; then the check that finds a hole in a machine.
Film.scene("prove", {
  step: "prove",
  html: (D) => {
    const j = "journeys/ada-spends-from-her-budget.ts", rows = D.src[j].split("\n"), from = rows.findIndex((l) => /s\.step\(/.test(l)) + 1, to = rows.findIndex((l) => /^\s*\],$/.test(l));
    return `<style>
      #scene-prove .world { right: 96px; top: 150px; display: flex; gap: 10px; align-items: center; } #scene-prove .world .kpill { font-family: var(--sans); font-size: 22px; color: var(--paper); padding: 6px 14px; }
      #scene-prove .veil { inset: 250px 37px 37px 37px; background: rgba(8,17,31,.82); } #scene-prove .chk { left: 250px; top: 560px; width: 1420px; border-color: var(--red); }
      #scene-prove .chk .o { visibility: visible; opacity: 1; }
    </style>
    <div class="head"><div class="eyebrow">Proof</div><div class="hl">Journeys, in a world with a chain in it.</div></div>
    <div class="abs world"><span class="lbl">a world</span><span class="kpill">a local chain</span><span class="kpill">a local server</span><span class="kpill">a cast with wallets</span><span class="kpill">its own clock</span></div>
    ${Kit.ed(D, { id: "e-j", file: j, from, to, x: 96, y: 262, w: 1728, size: "small", tag: '<span class="tag wr">written first, by another agent</span>' })}
    <div class="abs veil hidden0"></div>
    <div class="panel term chk hidden0"><div class="bar"><span class="dots"></span><span>ortho check</span><span class="tag rd">designed output, not a real run</span></div><div class="screen">${D.src["falls-out/check-waiting.txt"].trimEnd().split("\n").map((l) => `<div class="o">${Film.esc(l).replace(/✘/g, '<span class="no">✘</span>').replace(/nothing/g, '<span class="no">nothing</span>') || " "}</div>`).join("")}</div></div>${Kit.legend}`;
  },
  build(s) {
    const c = s.cue, D = s.D, j = "journeys/ada-spends-from-her-budget.ts", rows = D.src[j].split("\n"), body = s.$("#e-j .code");
    const starts = rows.map((l, k) => (/s\.step\(/.test(l) ? k + 1 : 0)).filter(Boolean), end = rows.findIndex((l) => /^\s*\],$/.test(l));
    s.in(".head", s.start + 0.3); s.in(".klegend", s.start + 0.6); s.in("#e-j", c("v1", "journeys") - 0.3, { y: 14 });
    s.in(".world .lbl", c("v2", "world") - 0.2); ["local chain", "local server", "cast"].forEach((w, k) => s.in(s.$$(".world .kpill")[k], c("v2", w), { y: 6, dur: 0.3 })); s.in(s.$$(".world .kpill")[3], c("v3", "month passes") - 0.2, { y: 6, dur: 0.3 });
    s.focus(body, [starts[0], starts[1] - 1], c("v3", "Ada drafts")); s.focus(body, [starts[1], starts[2] - 1], c("v3", "over her limit")); s.focus(body, [starts[2], end], c("v3", "month passes"));
    s.focus(body, null, c("v4") - 0.1); s.fromTo(".wr", { color: "#7389a6" }, { color: "#62c6ff", duration: 0.3 }, c("v4", "different agent"));
    const hole = c("v5", "check can") - 0.3;
    s.fromTo(".veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, hole); s.in(".chk", hole + 0.1, { y: 20 });
    s.to(s.$$(".chk .o")[2], { backgroundColor: "rgba(255,115,115,.14)", color: "#e9f0fa", duration: 0.3 }, c("v5", "sit in"));
  },
});
