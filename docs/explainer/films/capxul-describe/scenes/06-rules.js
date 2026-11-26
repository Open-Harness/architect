// Sheet 6. How a budget behaves: its machine, with a move made by time; then roles and a rule, said as data.
Film.scene("rules", {
  step: "rules",
  html: (D) => `<style>
      #scene-rules .node { position: absolute; top: 824px; height: 62px; width: 220px; display: grid; place-items: center; border: 2px solid var(--paper); font-family: var(--mono); font-size: 24px; background: var(--bg2); }
      #scene-rules .both { left: 96px; top: 730px; display: flex; gap: 14px; align-items: center; } #scene-rules .both .kpill { font-family: var(--sans); font-size: 26px; color: var(--paper); padding: 8px 18px; }
    </style>
    <div class="head"><div class="eyebrow">Describe · how a budget behaves</div><div class="hl">A machine, and who may move it.</div></div>
    ${Kit.ed(D, { id: "e-mach", file: "blueprint/things/budget/machine.ts", x: 96, y: 262, w: 1728, tag: '<span class="tag">you write</span>' })}
    <svg class="ink mach" viewBox="0 0 1920 1080"><circle class="dot fillpaper" cx="250" cy="855" r="9"/>
      <path class="v0" d="M265 855H424"/><path class="h0 fillpaper" d="M438 855l-16-8v16z"/><path class="v1" d="M658 855H946"/><path class="h1 fillpaper" d="M960 855l-16-8v16z"/>
      <path class="v2" d="M548 824V790H1608V824"/><path class="h2 fillpaper" d="M1608 824l-8-16h16z"/><path class="v3 am" d="M1070 886V930H548V900"/><path class="h3 fillam" d="M548 886l-8 16h16z"/>
      <text class="x0" x="345" y="840" text-anchor="middle">grant</text><text class="x1" x="800" y="840" text-anchor="middle">spend</text><text class="x2" x="1080" y="776" text-anchor="middle">revoke</text><text class="x3" x="810" y="962" text-anchor="middle" style="fill:var(--amber)">renew · every month</text></svg>
    <div class="node n0 mach" style="left:438px">active</div><div class="node n1 mach" style="left:960px">exhausted</div><div class="node n2 mach" style="left:1498px">revoked</div>
    ${Kit.ed(D, { id: "e-broles", file: "blueprint/things/budget/roles.ts", x: 96, y: 262, w: 852, size: "small", tag: '<span class="tag">you write</span>' })}
    ${Kit.ed(D, { id: "e-troles", file: "blueprint/things/treasury/roles.ts", x: 972, y: 262, w: 852, size: "small", tag: '<span class="tag">you write</span>' })}
    <div class="abs both hidden0"><span class="lbl" style="font-size:22px">data, so it means the same in</span><span class="kpill">TypeScript</span><span class="kpill" style="border-color:var(--amber);color:var(--amber)">Solidity</span></div>${Kit.legend}`,
  build(s) {
    const c = s.cue, D = s.D, L = (f, re) => Kit.line(D, f, re), m = "blueprint/things/budget/machine.ts", mb = s.$("#e-mach .code");
    s.in(".head", s.start + 0.3); s.in("#e-mach", c("m1") - 0.1, { y: 14 }); s.in(".klegend", s.start + 0.6);
    s.focus(mb, [L(m, /states:/), L(m, /states:/)], c("m1", "Active")); s.in(".dot", c("m1", "Active"), { y: 0 }); s.in(".node", c("m1", "Active"), { y: 10, stagger: 0.45, dur: 0.35 });
    s.draw(".v0", c("m1", "Active") + 0.1, 0.4); s.in(".h0, .x0", c("m1", "Active") + 0.4, { y: 0, dur: 0.2 });
    s.focus(mb, [L(m, /spend:/), L(m, /spend:/)], c("m2", "Spending")); s.draw(".v1", c("m2", "two outcomes"), 0.5); s.in(".h1, .x1", c("m2", "two outcomes") + 0.4, { y: 0, dur: 0.2 });
    s.focus(mb, [L(m, /renew:/), L(m, /renew:/) + 1], c("m2", "renewing")); s.draw(".v3", c("m2", "by time"), 0.7); s.in(".h3, .x3", c("m2", "every month"), { y: 0, dur: 0.25 });
    s.draw(".v2", c("m1", "revoked"), 0.6); s.in(".h2, .x2", c("m1", "revoked") + 0.5, { y: 0, dur: 0.2 });
    const t3 = c("m3"), br = "blueprint/things/budget/roles.ts", tr = "blueprint/things/treasury/roles.ts", bb = s.$("#e-broles .code"), tb = s.$("#e-troles .code");
    s.out("#e-mach, .mach", t3 - 0.35, { dur: 0.3 }); s.in("#e-broles", t3, { y: 14 }); s.in("#e-troles", t3 + 0.15, { y: 14 });
    s.focus(bb, [L(br, /export const holder/) - 1, L(br, /export const holder/)], c("m3", "holder")); s.focus(tb, [L(tr, /export const owner /) - 1, L(tr, /export const owner /) + 3], c("m3", "An owner"));
    s.in(".both", c("m4", "data") - 0.2); s.focus(bb, null, c("m4")); s.focus(tb, null, c("m4"));
    s.focus(bb, [L(br, /withinLimit/) - 1, L(br, /withinLimit/) + 3], c("m5", "rules")); s.focus(tb, [L(tr, /export const owner /), L(tr, /export const owner /)], c("m5", "rules"), 0.01); s.to(tb, { opacity: 0.35, duration: 0.3 }, c("m5", "rules"));
  },
});
