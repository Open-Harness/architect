// Sheet 5. For the app: a reference to a thing (state, the fields this caller may see, the moves open now), and for a thing that is
// waiting, what it needs.
Film.scene("app", {
  step: "app",
  html: (D) => `<style>
      #scene-app .card { left: 1150px; top: 318px; width: 620px; padding: 26px 30px 30px; border-color: var(--paper); } #scene-app .as { left: 1150px; top: 262px; height: 40px; }
      #scene-app .as .kpill { position: absolute; left: 110px; top: 0; font-family: var(--sans); font-size: 22px; border-radius: 999px; padding: 4px 16px; color: var(--paper); }
      #scene-app .st { margin: 10px 0 16px; } #scene-app .st span { display: inline-block; font-family: var(--mono); font-size: 26px; padding: 4px 16px; border: 2px solid var(--cyan); color: var(--cyan); }
      #scene-app .kv { font-family: var(--mono); font-size: 23px; line-height: 1.8; color: var(--text2); } #scene-app .kv b { color: var(--paper); font-weight: 500; }
      #scene-app .btns { position: relative; height: 62px; margin-top: 20px; } #scene-app .btns span { position: absolute; left: 0; top: 0; font-size: 26px; font-weight: 600; padding: 12px 30px; background: var(--paper); color: var(--bg); }
      #scene-app .from { left: 1150px; top: 716px; width: 620px; font-size: 25px; color: var(--text2); }
      #scene-app .need { margin-top: 16px; padding: 14px 18px; border: 1px solid var(--rule2); background: rgba(8,17,31,.5); } #scene-app .need b { display: block; font-size: 28px; font-weight: 500; color: var(--paper); line-height: 1.3; }
      #scene-app .asks { left: 1150px; top: 760px; width: 620px; font-size: 25px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Falls out · for the app</div><div class="hl">Each thing gives you a reference to it.</div></div>
    ${Kit.ed(D, { id: "e-ref", file: "falls-out/panel.tsx", from: 1, x: 96, y: 262, w: 1010, tag: '<span class="tag am">proposed</span>' })}
    ${Kit.ed(D, { id: "e-needs", file: "falls-out/needs.tsx", from: 1, x: 96, y: 262, w: 1010, tag: '<span class="tag am">proposed</span>' })}
    <div class="abs as"><span class="lbl">seen by</span><span class="kpill v0">Ada, the holder</span><span class="kpill v1">Bob, an owner</span></div>
    <div class="panel card bud"><div class="lbl">a budget</div><div class="st"><span>active</span></div>
      <div class="kv">limit <b>1,000</b><br>left <b>600</b></div>
      <div class="btns"><span class="b0">Spend</span><span class="b1">Revoke</span></div></div>
    <div class="abs from">Nobody declared the buttons. They are the moves out of this state, for this caller.</div>
    <div class="panel card pro"><div class="lbl">a proposal · a budget for Dan</div><div class="st"><span>open</span></div>
      <div class="kv">approvals <b>1 of 2</b></div>
      <div class="need"><div class="lbl">needs</div><b class="n0">one more owner</b><b class="n1">within 6 days</b></div>
      <div class="btns"><span class="b2">Approve</span></div></div>
    <div class="abs asks">Nobody wrote "ask Bob". The proposal's machine says what it is waiting for.</div>`,
  build(s) {
    const c = s.cue, D = s.D, L = (re) => Kit.line(D, "falls-out/panel.tsx", re), N = (re) => Kit.line(D, "falls-out/needs.tsx", re), body = s.$("#e-ref .code"), nb = s.$("#e-needs .code");
    s.in(".head", s.start + 0.3); s.in("#e-ref", c("h1") - 0.1, { y: 14 }); s.in(".bud", c("h1") + 0.2, { x: 20, y: 0 });
    s.tl.set(s.$$(".b1, .v1"), { autoAlpha: 0 }, 0); s.in(".as .lbl, .v0", c("h1") + 0.3, { y: 0 });
    s.focus(body, [L(/budget\.state/), L(/budget\.state/)], c("h1", "state")); s.focus(body, [L(/budget\.fields/), L(/budget\.left/)], c("h1", "fields")); s.focus(body, [L(/budget\.can/), L(/budget\.can/)], c("h1", "moves"));
    s.focus(body, [L(/const budget/), L(/const budget/)], c("h2", "hook")); s.focus(body, [L(/<Budget\.Root/), L(/<\/Budget\.Root/)], c("h2", "headless")); s.in(".from", c("h2", "headless") + 0.3);
    s.focus(body, null, c("h3") - 0.1);
    const swap = (hide, show, t) => { s.to(hide, { autoAlpha: 0, duration: 0.2 }, t); s.to(show, { autoAlpha: 1, duration: 0.25 }, t + 0.15); };
    s.fromTo(".b0", { scale: 1 }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1, transformOrigin: "0 50%" }, c("h3", "spend"));
    swap(".v0, .b0", ".v1, .b1", c("h3", "Bob"));
    // A thing that is waiting: the same reference, with what it needs.
    const t = c("h4") - 0.1;
    s.out("#e-ref, .bud, .from", t, { dur: 0.3 }); s.in("#e-needs", t + 0.3, { y: 14 }); s.in(".pro", c("h4", "waiting"), { x: 20, y: 0 });
    s.tl.set(s.$$(".n0, .n1"), { autoAlpha: 0 }, 0);
    s.focus(nb, [N(/proposal\.needs/), N(/proposal\.needs/)], c("h4", "needs"));
    s.fromTo(".v1", { scale: 1 }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1 }, c("h4", "Bob opens"));
    s.focus(nb, [N(/<Proposal\.Needs/), N(/<Proposal\.Needs/)], c("h4", "tells him"));
    s.to(".n0", { autoAlpha: 1, duration: 0.3 }, c("h4", "one more owner")); s.to(".n1", { autoAlpha: 1, duration: 0.3 }, c("h4", "six days")); s.in(".asks", c("h4", "six days") + 0.3);
  },
});
