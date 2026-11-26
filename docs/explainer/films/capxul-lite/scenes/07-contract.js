// Sheet 7. What falls out on the chain: a generated frame that checks in the server's order, and the handler you write in Solidity.
Film.scene("contract", {
  step: "falls out",
  html: (D) => {
    const base = "falls-out/TreasuryBase.sol", from = Kit.line(D, base, /function _spend_/), to = Kit.line(D, base, /emit BudgetSpent\(id/) + 1;
    return `<style>
      #scene-contract .order { left: 96px; top: 574px; display: flex; gap: 10px; align-items: center; } #scene-contract .order .kpill { font-family: var(--sans); font-size: 23px; }
      #scene-contract .same { left: 1210px; top: 632px; width: 614px; } #scene-contract .door { display: flex; justify-content: space-between; gap: 12px; padding: 12px 18px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); margin-top: 10px; font-family: var(--mono); font-size: 19px; } #scene-contract .door b { color: var(--red); font-weight: 500; } #scene-contract .door i { font-style: normal; color: var(--cyan); }
    </style>
    <div class="head"><div class="eyebrow">Falls out · on the chain</div><div class="hl">A contract. The frame is generated; the behaviour is yours.</div></div>
    ${Kit.ed(D, { id: "e-base", file: base, from, to, x: 96, y: 262, w: 1728, size: "small", tag: '<span class="tag cy">generated · a sketch</span>' })}
    <div class="abs order"><span class="lbl">the same order as the server</span>${["the row", "the role", "the machine", "your handler", "the rules", "the event"].map((t, k) => `<span class="kpill s${k}"${k === 3 ? ' style="border-color:var(--amber);color:var(--amber)"' : ""}>${t}</span>`).join('<span class="mu">→</span>')}</div>
    ${Kit.ed(D, { id: "e-hand", file: "src/Treasury.sol", from: 2, x: 96, y: 632, w: 1090, size: "small", tag: '<span class="tag am">yours · Solidity · scaffolded once</span>', cls: "hand" })}
    <div class="abs same"><div class="lbl">one refusal, one code, every way in</div>${["the contract", "the SDK", "the command line", "the app"].map((d) => `<div class="door"><span>${d}</span><span><b>BudgetExceeded</b> <i>BU-001</i></span></div>`).join("")}</div>`;
  },
  build(s) {
    const c = s.cue, D = s.D, L = (f, re) => Kit.line(D, f, re), base = "falls-out/TreasuryBase.sol", body = s.$("#e-base .code"), hb = s.$("#e-hand .code");
    s.in(".head", s.start + 0.3); s.in("#e-base", c("f1", "contract") - 0.3, { y: 14 });
    s.in(".order .lbl", c("f2", "it checks") - 0.3);
    [["row", /_budget\(id\)/, 0], ["role", /hasRole/, 1], ["machine", /BudgetNotActive/, 2], ["handler", /= _spend\(/, 3], ["rules", /revert BudgetExceeded/, 4], ["event", /emit BudgetSpent\(id/, 5]].forEach(([w, re, k]) => {
      const n = L(base, re); s.focus(body, [n, n], c("f2", w), 0.3); s.in(".s" + k, c("f2", w), { y: 6, dur: 0.3 }); s.in(s.$$(".order .mu")[Math.max(0, k - 1)], c("f2", w), { y: 0, dur: 0.2 });
    });
    s.focus(body, null, c("f3")); s.fromTo(".order .kpill", { scale: 1 }, { scale: 1.06, duration: 0.2, yoyo: true, repeat: 1, stagger: 0.06 }, c("f3", "same order"));
    s.to("#e-base", { borderColor: "#62c6ff", duration: 0.3 }, c("f3", "enforcer"));
    s.in("#e-hand", c("f4") - 0.1, { y: 14 }); s.focus(hb, [L("src/Treasury.sol", /budget\.spent \+=/), L("src/Treasury.sol", /budget\.spent \+=/)], c("f4", "add")); s.focus(hb, [L("src/Treasury.sol", /_pay\(/), L("src/Treasury.sol", /_pay\(/)], c("f4", "pay"));
    s.focus(hb, [L("src/Treasury.sol", /bool done/), L("src/Treasury.sol", /return done/)], c("f4", "which state")); s.focus(hb, null, c("f5") - 0.2);
    s.in(".same .lbl", c("f5", "refusal") - 0.2); s.in(".door", c("f5", "contract"), { x: 16, y: 0, stagger: 0.45, dur: 0.3 });
  },
});
