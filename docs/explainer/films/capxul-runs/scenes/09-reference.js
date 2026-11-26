// Sheet 9. A thing as a caller sees it: state, fields, and the moves open now. The hook and the headless parts are two faces of it.
Film.scene("reference", {
  step: "falls out",
  html: (D) => `<style>
      #scene-reference .card { left: 1150px; top: 318px; width: 620px; padding: 26px 30px 30px; border-color: var(--paper); } #scene-reference .as { left: 1150px; top: 262px; display: flex; gap: 10px; align-items: center; }
      #scene-reference .as { height: 40px; } #scene-reference .as .kpill { position: absolute; left: 110px; top: 0; font-family: var(--sans); font-size: 22px; border-radius: 999px; padding: 4px 16px; color: var(--paper); } #scene-reference .st { position: relative; height: 48px; margin: 10px 0 16px; } #scene-reference .st span { position: absolute; left: 0; top: 0; font-family: var(--mono); font-size: 26px; padding: 4px 16px; border: 2px solid var(--cyan); color: var(--cyan); } #scene-reference .st .ex { border-color: var(--amber); color: var(--amber); }
      #scene-reference .kv { font-family: var(--mono); font-size: 23px; line-height: 1.8; color: var(--text2); } #scene-reference .kv b { color: var(--paper); font-weight: 500; } #scene-reference .btns { position: relative; height: 62px; margin-top: 20px; } #scene-reference .btns span { position: absolute; left: 0; top: 0; font-size: 26px; font-weight: 600; padding: 12px 30px; background: var(--paper); color: var(--bg); } #scene-reference .btns .none { background: transparent; color: var(--muted); font-weight: 400; padding-left: 0; }
      #scene-reference .from { left: 1150px; top: 716px; width: 620px; font-size: 25px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Falls out · for the app</div><div class="hl">Each thing gives you a reference to it.</div></div>
    ${Kit.ed(D, { id: "e-ref", file: "falls-out/panel.tsx", from: 1, x: 96, y: 262, w: 1010, tag: '<span class="tag am">proposed</span>' })}
    <div class="abs as"><span class="lbl">seen by</span><span class="kpill v0">Ada, the holder</span><span class="kpill v1">Bob, an owner</span></div>
    <div class="panel card"><div class="lbl">a budget</div><div class="st"><span class="a">active</span><span class="ex">exhausted</span></div>
      <div class="kv">limit <b>1,000</b><br>left <b class="l0">600</b><b class="l1">0</b></div>
      <div class="btns"><span class="b0">Spend</span><span class="b1">Revoke</span><span class="none">Nothing is open to you.</span></div></div>
    <div class="abs from">Nobody declared the buttons. They are the moves out of this state, for this caller.</div>`,
  build(s) {
    const c = s.cue, D = s.D, L = (re) => Kit.line(D, "falls-out/panel.tsx", re), body = s.$("#e-ref .code");
    s.in(".head", s.start + 0.3); s.in("#e-ref", c("r1") - 0.1, { y: 14 }); s.in(".card", c("r1") + 0.2, { x: 20, y: 0 });
    s.tl.set(s.$$(".ex, .l1, .b1, .none, .v1"), { autoAlpha: 0 }, 0); s.tl.set(s.$$(".a, .l0, .b0"), { autoAlpha: 1 }, 0); s.in(".as .lbl, .v0", c("r1") + 0.3, { y: 0 });
    s.focus(body, [L(/budget\.state/), L(/budget\.state/)], c("r1", "state")); s.focus(body, [L(/budget\.fields/), L(/budget\.left/)], c("r1", "fields")); s.focus(body, [L(/budget\.can/), L(/budget\.can/)], c("r1", "moves"));
    s.focus(body, [L(/const budget/), L(/const budget/)], c("r2", "hook")); s.focus(body, [L(/<Budget\.Root/), L(/<\/Budget\.Root/)], c("r2", "headless")); s.in(".from", c("r2", "never"));
    s.focus(body, null, c("r3") - 0.1);
    const swap = (hide, show, t) => { s.to(hide, { autoAlpha: 0, duration: 0.2 }, t); s.to(show, { autoAlpha: 1, duration: 0.25 }, t + 0.15); };
    s.fromTo(".b0", { scale: 1 }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1, transformOrigin: "0 50%" }, c("r3", "spend"));
    swap(".v0, .b0", ".v1, .b1", c("r3", "Bob"));
    swap(".v1, .b1, .a, .l0", ".v0, .none, .ex, .l1", c("r3", "exhausted"));
  },
});
