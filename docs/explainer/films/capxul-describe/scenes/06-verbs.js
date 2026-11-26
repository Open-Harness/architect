// Sheet 6. The verbs: a spend on the chain, a draft on our server, and the line that joins them.
Film.scene("verbs", {
  step: "describe",
  html: (D) => `<style>
      #scene-verbs .nots { left: 96px; top: 700px; display: flex; gap: 14px; } #scene-verbs .nots .kpill { font-family: var(--sans); font-size: 25px; position: relative; padding: 8px 18px; } #scene-verbs .nots s { position: absolute; left: 10px; right: 10px; top: 52%; height: 3px; background: var(--red); transform-origin: 0 50%; }
      #scene-verbs .last { left: 96px; right: 96px; top: 880px; text-align: center; font-size: 36px; }
    </style>
    <div class="head"><div class="eyebrow">Describe · the verbs</div><div class="hl">Two operations, two places, one join.</div></div>
    ${Kit.ed(D, { id: "e-spend", file: "blueprint/things/budget/verbs/spend.ts", x: 96, y: 262, w: 852, size: "small", tag: '<span class="tag am">on the chain</span>' })}
    ${Kit.ed(D, { id: "e-draft", file: "blueprint/things/spend/verbs/draft.ts", x: 972, y: 262, w: 852, size: "small", tag: '<span class="tag cy">our server</span>' })}
    <div class="abs nots"><span class="kpill n0">a route<s></s></span><span class="kpill n1">signature handling<s></s></span><span class="kpill n2" style="color:var(--paper)">the caller is whoever signed</span></div>
    <svg class="ink" viewBox="0 0 1920 1080"><path class="join am" d="M972 690H960V505H954"/><path class="joinh fillam" d="M948 505l12-8v16z"/></svg>
    <div class="abs last kbig">One press of a button. Two operations. <span class="am">Now the model knows.</span></div>${Kit.legend}`,
  build(s) {
    const c = s.cue, D = s.D, L = (f, re) => Kit.line(D, f, re), sp = "blueprint/things/budget/verbs/spend.ts", dr = "blueprint/things/spend/verbs/draft.ts", a = s.$("#e-spend .code"), b = s.$("#e-draft .code");
    s.in(".head", s.start + 0.3); s.in(".klegend", s.start + 0.6); s.in("#e-spend", c("o1") - 0.1, { y: 14 });
    s.focus(a, [L(sp, /payload:/), L(sp, /payload:/)], c("o1", "comes in")); s.focus(a, [L(sp, /move:/), L(sp, /move:/)], c("o1", "move")); s.focus(a, [L(sp, /allowed:/), L(sp, /allowed:/)], c("o1", "who may"));
    s.focus(a, null, c("o2")); s.in(".n0", c("o2", "route"), { y: 8, dur: 0.3 }); s.fromTo(".n0 s", { scaleX: 0 }, { scaleX: 1, duration: 0.3 }, c("o2", "route") + 0.25);
    s.in(".n1", c("o2", "signature"), { y: 8, dur: 0.3 }); s.fromTo(".n1 s", { scaleX: 0 }, { scaleX: 1, duration: 0.3 }, c("o2", "signature") + 0.3); s.in(".n2", c("o2", "whoever"), { y: 8, dur: 0.3 });
    s.in("#e-draft", c("o3") - 0.1, { y: 14 }); s.focus(b, [L(dr, /payload:/), L(dr, /payload:/)], c("o3", "reason")); s.focus(b, [L(dr, /steps:/), L(dr, /steps:/)], c("o3", "server"));
    s.out(".nots", c("o4") - 0.3, { dur: 0.3 });
    s.focus(b, [L(dr, /next: Blueprint/) - 1, L(dr, /next: Blueprint/) + 1], c("o4", "what comes next")); s.draw(".join", c("o4", "payment"), 0.7); s.in(".joinh", c("o4", "payment") + 0.65, { y: 0, dur: 0.2 });
    s.focus(a, [L(sp, /payload:/), L(sp, /payload:/)], c("o4", "id carried"));
    s.in(".last", c("o5") + 0.1);
  },
});
