// Sheet 2. On the chain: a generated frame that checks in the server's order, and the handler you write in Solidity. The reason is in
// neither: the frame takes its seal and puts it in the event.
Film.scene("contract", {
  step: "contract",
  html: (D) => {
    const base = "falls-out/TreasuryBase.sol", from = Kit.line(D, base, /function _spend_/), to = Kit.line(D, base, /emit BudgetSpent\(id/) + 1;
    const frame = Kit.ed(D, { id: "e-base", file: base, from, to, x: 96, y: 262, w: 1728, size: "small", tag: '<span class="tag cy">generated · a sketch</span>' })
      .replace(/reasonSeal(?![\s\S]*reasonSeal)/, '<span class="seal">reasonSeal</span>');
    return `<style>
      #scene-contract .order { left: 96px; top: 594px; display: flex; gap: 10px; align-items: center; } #scene-contract .order .kpill { font-family: var(--sans); font-size: 23px; }
      #scene-contract .seal { padding: 1px 4px; margin: 0 -4px; border-radius: 2px; }
      #scene-contract .where { left: 1210px; top: 650px; width: 614px; } #scene-contract .pair { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 18px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); margin-top: 12px; font-size: 22px; color: var(--text2); }
      #scene-contract .pair b { font-family: var(--mono); font-size: 21px; font-weight: 400; color: var(--paper); white-space: nowrap; } #scene-contract .pair.onchain { border-color: var(--cyan); } #scene-contract .pair.onchain b { color: var(--cyan); }
      #scene-contract .none { left: 1210px; top: 870px; width: 614px; font-size: 24px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Falls out · on the chain</div><div class="hl">A contract. The frame is generated; the behaviour is yours.</div></div>
    ${frame}
    <div class="abs order"><span class="lbl">the same order as the server</span>${["the row", "the role", "the machine", "your handler", "the rules", "the event"].map((t, k) => `<span class="kpill s${k}"${k === 3 ? ' style="border-color:var(--amber);color:var(--amber)"' : ""}>${t}</span>`).join('<span class="mu">→</span>')}</div>
    ${Kit.ed(D, { id: "e-hand", file: "src/Treasury.sol", from: 3, to: 9, x: 96, y: 650, w: 1090, size: "small", tag: '<span class="tag am">yours · Solidity · scaffolded once</span>' })}
    <div class="abs where"><div class="lbl">where the reason goes</div>
      <div class="pair p0"><b>"Design work, March"</b><span>stays with our server</span></div>
      <div class="pair onchain p1"><b>reasonSeal 0x5e…a1</b><span>in the event</span></div></div>
    <div class="abs none">The handler never sees it.</div>`;
  },
  build(s) {
    const c = s.cue, D = s.D, L = (f, re) => Kit.line(D, f, re), base = "falls-out/TreasuryBase.sol", hand = "src/Treasury.sol", body = s.$("#e-base .code"), hb = s.$("#e-hand .code");
    s.in(".head", s.start + 0.3); s.in("#e-base", c("f1", "contract") - 0.3, { y: 14 });
    s.in(".order .lbl", c("f2", "it checks") - 0.3);
    [["row", /_budget\(id\)/, 0], ["role", /hasRole/, 1], ["machine", /BudgetNotActive/, 2], ["handler", /= _spend\(/, 3], ["rules", /revert BudgetExceeded/, 4], ["event", /emit BudgetSpent\(id/, 5]].forEach(([w, re, k]) => {
      const n = L(base, re); s.focus(body, [n, n], c("f2", w), 0.3); s.in(".s" + k, c("f2", w), { y: 6, dur: 0.3 }); s.in(s.$$(".order .mu")[Math.max(0, k - 1)], c("f2", w), { y: 0, dur: 0.2 });
    });
    s.focus(body, null, c("f3")); s.fromTo(".order .kpill", { scale: 1 }, { scale: 1.06, duration: 0.2, yoyo: true, repeat: 1, stagger: 0.06 }, c("f3", "same order"));
    s.to("#e-base", { borderColor: "#62c6ff", duration: 0.3 }, c("f3", "enforcer"));
    s.in("#e-hand", c("f4") - 0.1, { y: 14 });
    s.focus(hb, [L(hand, /budget\.spent \+=/), L(hand, /budget\.spent \+=/)], c("f4", "add")); s.focus(hb, [L(hand, /_pay\(/), L(hand, /_pay\(/)], c("f4", "pay"));
    s.focus(hb, [L(hand, /bool done/), L(hand, /return done/)], c("f4", "which state"));
    // The reason: not in the handler's arguments, and only as a seal in the frame's event.
    s.focus(hb, [L(hand, /function _spend\(/), L(hand, /function _spend\(/)], c("f5", "reason"));
    s.in(".where .lbl", c("f5", "reason") - 0.1); s.in(".p0", c("f5", "reason") + 0.1, { x: 16, y: 0, dur: 0.3 }); s.in(".none", c("f5", "never"), { y: 8 });
    const n = L(base, /emit BudgetSpent\(id/); s.focus(body, [n, n], c("f5", "seal"), 0.3);
    s.to(".seal", { backgroundColor: "rgba(98,198,255,.28)", color: "#e9f0fa", duration: 0.3 }, c("f5", "seal")); s.in(".p1", c("f5", "event"), { x: 16, y: 0, dur: 0.3 });
  },
});
