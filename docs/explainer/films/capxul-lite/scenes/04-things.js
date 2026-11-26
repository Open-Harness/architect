// Sheet 4. What exists and where it lives: a chain store, a thing that lives in it, and a thing that can't.
Film.scene("things", {
  step: "describe",
  html: (D) => `<style>
      #scene-things .kbox { left: 96px; width: 380px; } #scene-things .kbox .kpill { display: block; margin-top: 10px; color: var(--paper); } #scene-things .kbox .sub { font-size: 20px; color: var(--text2); margin-top: 10px; }
      #scene-things .last { left: 510px; top: 900px; }
    </style>
    <div class="head"><div class="eyebrow">Describe · what exists, and where</div><div class="hl">Each thing lives where its last word is.</div></div>
    <div class="kbox chain" style="top:262px;height:300px"><div class="lbl">store · treasury · a chain</div><span class="kpill t0">Treasury</span><span class="kpill t0">Seat</span><span class="kpill t1">Budget</span><div class="sub">one contract, every field public</div></div>
    <div class="kbox ours" style="top:590px;height:250px"><div class="lbl">store · the database</div><span class="kpill t2">Spend</span><span class="kpill t2">Entry</span><div class="sub">ours, and private</div></div>
    ${Kit.ed(D, { id: "e-store", file: "blueprint/stores/treasury.ts", x: 510, y: 262, w: 1314, tag: '<span class="tag">you write</span>' })}
    ${Kit.ed(D, { id: "e-budget", file: "blueprint/things/budget/thing.ts", x: 510, y: 262, w: 1314, tag: '<span class="tag am">lives on the chain</span>' })}
    ${Kit.ed(D, { id: "e-spend", file: "blueprint/things/spend/thing.ts", x: 510, y: 262, w: 1314, tag: '<span class="tag cy">lives on our server</span>' })}
    <div class="abs last kbig">Who has the last word on each thing?</div>`,
  build(s) {
    const c = s.cue, D = s.D, L = (f, re) => Kit.line(D, f, re);
    s.in(".head", s.start + 0.3);
    s.in(".chain", c("t2", "chain store") - 0.5, { x: -16, y: 0 }); s.in("#e-store", c("t2") - 0.1, { y: 14 });
    s.focus("#e-store .code", [L("blueprint/stores/treasury.ts", /export default/), L("blueprint/stores/treasury.ts", /export default/)], c("t2", "chain store")); s.in(".t0", c("t2", "Treasury"), { y: 6, stagger: 0.1, dur: 0.3 });
    const t3 = c("t3"), b = "blueprint/things/budget/thing.ts", body = s.$("#e-budget .code");
    s.out("#e-store", t3 - 0.3, { dur: 0.3 }); s.in("#e-budget", t3, { y: 14 }); s.in(".t1", t3 + 0.2, { y: 6, dur: 0.3 });
    s.focus(body, [L(b, /lives: treasury/), L(b, /lives: treasury/)], c("t3", "lives")); s.focus(body, [L(b, /holder:/), L(b, /holder:/)], c("t3", "holder")); s.focus(body, [L(b, /limit:/), L(b, /spent:/)], c("t3", "amounts"));
    s.focus(body, [L(b, /fields: \{/), L(b, /startedAt/) + 1], c("t3", "Every field")); s.in(Kit.call(s, body, L(b, /fields: \{/), "all public"), c("t3", "public"), { x: 16, y: 0 });
    const t4 = c("t4"), f = "blueprint/things/spend/thing.ts", sb = s.$("#e-spend .code");
    s.out("#e-budget", t4 - 0.3, { dur: 0.3 }); s.in("#e-spend", t4, { y: 14 }); s.in(".ours", t4, { x: -16, y: 0 }); s.in(".t2", t4 + 0.3, { y: 6, stagger: 0.12, dur: 0.3 });
    s.focus(sb, [L(f, /to: Blueprint/), L(f, /amount:/)], c("t4", "who was paid")); s.focus(sb, [L(f, /reason:/), L(f, /receipt:/)], c("t4", "private"));
    s.in(Kit.call(s, sb, L(f, /reason:/), "private"), c("t4", "private"), { x: 16, y: 0 }); s.in(Kit.call(s, sb, L(f, /receipt:/), "refused on a chain", "am"), c("t4", "refuse") - 0.3, { x: 16, y: 0 });
    s.focus(sb, null, c("t5")); s.in(".last", c("t5", "who has"));
  },
});
