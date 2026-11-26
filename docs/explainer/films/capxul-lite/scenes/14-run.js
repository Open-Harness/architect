// Sheet 14. It runs somewhere: an environment binds the store to a network, one command brings it up, and one trace crosses all of it.
Film.scene("run", {
  step: "run",
  html: (D) => {
    const spans = [["spend.draft", "our server", 0, 11, "ours"], ["the relayer sends", "our server", 13, 23, "ours"], ["Treasury.spend", "the chain", 25, 58, "chain"], ["the follower confirms", "our server", 60, 86, "ours"], ["spend.settle", "our server", 88, 100, "ours"]];
    return `<style>
      #scene-run .up { left: 1040px; top: 262px; width: 784px; } #scene-run .up .term { font-family: var(--mono); font-size: 26px; } #scene-run .res { display: flex; justify-content: space-between; padding: 11px 18px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); margin-top: 10px; font-size: 24px; } #scene-run .res span { font-family: var(--mono); font-size: 20px; color: var(--muted); }
      #scene-run .trace { left: 96px; top: 640px; width: 1728px; padding: 16px 22px 20px; } #scene-run .sp { position: relative; height: 34px; margin-top: 8px; font-family: var(--mono); font-size: 18px; line-height: 34px; }
      #scene-run .sp .trk { position: absolute; left: 440px; right: 0; top: 0; bottom: 0; } #scene-run .sp i { position: absolute; top: 0; bottom: 0; transform-origin: 0 50%; border: 1px solid var(--cyan); background: rgba(98,198,255,.2); } #scene-run .sp.chain i { border-color: var(--amber); background: rgba(255,181,92,.2); } #scene-run .sp b { font-weight: 400; white-space: nowrap; } #scene-run .sp em { font-style: normal; color: var(--muted); }
      #scene-run .portal { left: 96px; top: 920px; display: flex; gap: 12px; align-items: center; } #scene-run .portal .kpill { font-family: var(--sans); font-size: 23px; color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">Run</div><div class="hl">From the blueprint to something running.</div></div>
    ${Kit.ed(D, { id: "e-env", file: "blueprint/environments/staging.ts", x: 96, y: 262, w: 920, size: "small", tag: '<span class="tag">you write</span>' })}
    <div class="abs up"><div class="term cmdline"><div class="cmd"><span class="ps">$</span><span class="typed">ortho env up staging</span><span class="cur"></span></div></div>
      <div class="res r0">Treasury, the contract<span>base-sepolia</span></div><div class="res r1">the server<span>a Worker</span></div><div class="res r2">the database<span>D1</span></div></div>
    <div class="panel trace"><div class="lbl">one trace of one payment <span class="rd" style="margin-left:10px">a sketch</span></div>${spans.map(([name, where, a, b, cls]) => `<div class="sp ${cls}"><b>${name} <em>· ${where}</em></b><span class="trk"><i style="left:${a}%;right:${100 - b}%"></i></span></div>`).join("")}</div>
    <div class="abs portal"><span class="lbl">the portal shows</span><span class="kpill">the things</span><span class="kpill">their machines</span><span class="kpill">who may do what</span><span class="kpill">what is happening now</span></div>`;
  },
  build(s) {
    const c = s.cue, D = s.D, e = "blueprint/environments/staging.ts", body = s.$("#e-env .code");
    s.in(".head", s.start + 0.3); s.in("#e-env", c("n1") - 0.1, { y: 14 });
    s.focus(body, [Kit.line(D, e, /stores:/), Kit.line(D, e, /stores:/)], c("n1", "store")); s.focus(body, [Kit.line(D, e, /cloud:/), Kit.line(D, e, /deploy:/)], c("n1", "server")); s.focus(body, null, c("n2") - 0.1);
    s.run(s.$(".cmdline"), c("n2", "One command") - 0.2, { type: 0.7 });
    ["contract", "server", "database"].forEach((w, k) => s.in(".r" + k, c("n2", w), { x: 16, y: 0, dur: 0.3 }));
    s.in(".trace", c("n2", "One trace") - 0.3, { y: 16 }); s.fromTo(".sp i", { scaleX: 0 }, { scaleX: 1, duration: 0.5, stagger: 0.22, ease: "power2.out" }, c("n2", "One trace")); s.fromTo(".sp b", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.22 }, c("n2", "One trace") + 0.1);
    s.in(".portal .lbl", c("n3", "portal") - 0.2); ["things", "machines", "who may", "happening"].forEach((w, k) => s.in(s.$$(".portal .kpill")[k], c("n3", w), { y: 6, dur: 0.3 }));
  },
});
