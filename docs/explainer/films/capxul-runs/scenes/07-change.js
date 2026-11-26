// Sheet 13. A rule changes. One line in the blueprint, and the model names what that line touched.
Film.scene("change", {
  step: "change",
  html: (D) => {
    const touched = ["the contract", "the client", "the app: what's left", "the docs", "the journeys using it"], kept = ["spend.draft", "spend.settle", "budget.grant", "budget.revoke", "the books", "who may do what"];
    return `<style>
      #scene-change .swap { position: relative; display: inline-block; text-indent: 0; } #scene-change .swap .b { position: absolute; left: 0; top: 0; color: var(--green); opacity: 0; white-space: nowrap; }
      #scene-change .col { left: 1330px; width: 494px; } #scene-change .it { display: flex; justify-content: space-between; align-items: center; padding: 11px 18px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); margin-top: 10px; font-size: 25px; }
      #scene-change .it em { font: 600 17px var(--label); font-style: normal; text-transform: uppercase; letter-spacing: .13em; } #scene-change .it.tch { border-color: var(--amber); } #scene-change .it.tch em { color: var(--amber); }
      #scene-change .keep { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; } #scene-change .keep .kpill { color: var(--green); border-color: var(--green); font-size: 19px; padding: 4px 12px; }
    </style>
    <div class="head"><div class="eyebrow">A rule changes</div><div class="hl">One line. The model says what it touched.</div></div>
    ${Kit.ed(D, { id: "e-m", file: "blueprint/things/budget/machine.ts", x: 96, y: 262, w: 1200, size: "small", tag: '<span class="tag">you write</span>' }).replace('<span class="s">"1 month"</span>', '<span class="swap"><span class="s a">"1 month"</span><span class="b">"1 week"</span></span>')}
    <div class="abs col" style="top:262px"><div class="lbl am">stale: to be made and proved again</div>${touched.map((t, k) => `<div class="it tch tch${k}"><span>${t}</span><em>stale</em></div>`).join("")}</div>
    <div class="abs col" style="top:680px"><div class="lbl gr">still proven</div><div class="keep">${kept.map((t) => `<span class="kpill">${t}</span>`).join("")}</div></div>`;
  },
  build(s) {
    const c = s.cue, D = s.D, m = "blueprint/things/budget/machine.ts", body = s.$("#e-m .code"), n = Kit.line(D, m, /by: Blueprint\.time/);
    s.in(".head", s.start + 0.3); s.in("#e-m", s.start + 0.4, { y: 14 });
    s.focus(body, [n - 1, n], c("c1", "rule changes")); s.to(".swap .a", { opacity: 0, duration: 0.25 }, c("c1", "every week")); s.to(".swap .b", { opacity: 1, duration: 0.3 }, c("c1", "every week") + 0.1); s.fromTo(".swap", { backgroundColor: "rgba(84,216,152,0)" }, { backgroundColor: "rgba(84,216,152,.22)", duration: 0.3 }, c("c1", "every week"));
    s.in(".col .lbl.am", c("c2", "model says") - 0.2);
    ["contract", "client", "left to spend", "docs", "journeys"].forEach((w, k) => s.in(".tch" + k, c("c2", w), { x: 16, y: 0, dur: 0.35 }));
    s.in(".col .lbl.gr", c("c3") - 0.1); s.in(".keep .kpill", c("c3"), { y: 8, stagger: 0.08, dur: 0.3 });
  },
});
