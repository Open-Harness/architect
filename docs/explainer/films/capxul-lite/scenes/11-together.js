// Sheet 11. Owners together: one word in `allowed`, and a proposal with its approvals falls out.
Film.scene("together", {
  step: "flow",
  html: (D) => `<style>
      #scene-together .prop { left: 1090px; top: 262px; width: 734px; padding: 24px 28px 28px; border-color: var(--paper); } #scene-together .prop b { display: block; font-size: 34px; font-weight: 500; margin: 4px 0 18px; }
      #scene-together .ow { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border: 1px solid var(--rule2); margin-top: 10px; font-size: 26px; } #scene-together .ow .ok { margin-left: auto; color: var(--green); font-family: var(--mono); } #scene-together .ow .btn { margin-left: auto; font-size: 20px; font-weight: 600; padding: 6px 18px; background: var(--paper); color: var(--bg); }
      #scene-together .ow .pair { position: relative; margin-left: auto; width: 220px; height: 38px; white-space: nowrap; } #scene-together .ow .pair > * { position: absolute; right: 0; top: 0; margin: 0; }
      #scene-together .count { margin-top: 20px; font-family: var(--mono); font-size: 26px; color: var(--text2); display: flex; justify-content: space-between; align-items: center; } #scene-together .done { font: 600 26px var(--mono); color: var(--green); border: 3px solid var(--green); padding: 4px 18px; }
    </style>
    <div class="head"><div class="eyebrow">Owners together</div><div class="hl">One word in the blueprint. A proposal falls out.</div></div>
    ${Kit.ed(D, { id: "e-grant", file: "blueprint/things/budget/verbs/grant.ts", x: 96, y: 262, w: 960, size: "small", tag: '<span class="tag am">on the chain</span>' })}
    <div class="panel prop"><div class="lbl">a proposal · made for you</div><b>Grant Ada 1,000 a month</b>
      ${[["Bob", 0], ["Carol", 1], ["Dan", 2]].map(([n, k]) => `<div class="ow o${k}">${n}, an owner<div class="pair"><span class="btn b${k}">Approve</span><span class="ok k${k}">approved ✔</span></div></div>`).join("")}
      <div class="count"><span><span class="num">0</span> of 3 · needs 2</span><span class="done hidden0">granted</span></div></div>${Kit.legend}`,
  build(s) {
    const c = s.cue, D = s.D, f = "blueprint/things/budget/verbs/grant.ts", body = s.$("#e-grant .code"), n = s.$(".count .num"), tick = { v: 0 };
    s.in(".head", s.start + 0.3); s.in(".klegend", s.start + 0.6); s.in("#e-grant", c("g1") - 0.1, { y: 14 });
    s.focus(body, [Kit.line(D, f, /allowed:/), Kit.line(D, f, /allowed:/)], c("g1", "two of"));
    s.tl.set(s.$$(".ok"), { autoAlpha: 0 }, 0);
    s.in(".prop", c("g2", "proposal") - 0.3, { x: 20, y: 0 }); s.in(".ow", c("g2", "approve button") - 0.2, { y: 8, stagger: 0.12, dur: 0.3 });
    const approve = (k, t, to) => { s.to(".b" + k, { autoAlpha: 0, duration: 0.15 }, t); s.to(".k" + k, { autoAlpha: 1, duration: 0.2 }, t + 0.1); s.tl.to(tick, { v: to, duration: 0.01, onUpdate: () => { n.textContent = Math.round(tick.v); } }, t + 0.1); };
    approve(0, c("g2", "each owner") + 0.1, 1); approve(1, c("g2", "threshold") - 0.9, 2);
    s.fromTo(".done", { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, c("g2", "threshold"));
  },
});
