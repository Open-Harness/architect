// Sheet 5. Who is who: a person on our server, an account on a chain, the one signature that links them, and what crosses after.
Film.scene("who", {
  step: "who",
  html: (D) => {
    const env = "blueprint/environments/staging.ts", bud = "blueprint/things/budget/thing.ts", a = Kit.line(D, env, /identity:/), b = Kit.line(D, bud, /holder: Blueprint\.account/);
    const box = (k, lbl, main, extra = "") => `<div class="step b${k} ${extra}" style="left:${96 + k * 357}px"><div class="lbl">${lbl}</div><div class="main">${main}</div></div>`;
    return `${Kit.css}<style>
      #scene-who .side { top: 262px; width: 640px; height: 178px; } #scene-who .side .big { font-size: 46px; font-weight: 500; line-height: 1.15; margin-top: 4px; } #scene-who .side .kpill { position: absolute; right: 22px; bottom: 22px; font-family: var(--sans); font-size: 25px; color: var(--paper); }
      #scene-who svg.ink text { font-size: 22px; fill: var(--paper); } #scene-who .linked { left: 860px; top: 404px; width: 200px; text-align: center; font: 600 22px var(--label); letter-spacing: .13em; text-transform: uppercase; color: var(--bg); background: var(--paper); padding: 6px 0; }
      #scene-who .step { position: absolute; top: 650px; width: 300px; height: 104px; border: 1px solid var(--rule2); background: rgba(14,28,48,.92); padding: 12px 18px; } #scene-who .step .main { font-size: 30px; font-weight: 500; color: var(--paper); margin-top: 2px; white-space: nowrap; }
      #scene-who .step.mono .main { font-family: var(--mono); font-size: 26px; } #scene-who .arr { position: absolute; top: 678px; width: 57px; text-align: center; font-size: 34px; color: var(--muted); }
      #scene-who .btn { display: inline-block; font-size: 26px; font-weight: 600; padding: 4px 26px; background: var(--paper); color: var(--bg); }
      #scene-who .ag { top: 806px; } #scene-who .never { left: 1167px; top: 806px; width: 657px; height: 104px; display: flex; align-items: center; font-size: 28px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Describe · who is who</div><div class="hl">A person here. An account there. Linked once.</div></div>
    <div class="kbox ours side" style="left:96px"><div class="lbl">on our server · a person</div><div class="big">Ada</div><span class="kpill">signs in</span></div>
    <div class="kbox chain side" style="left:1184px"><div class="lbl">on a chain · an account</div><div class="big mono" style="font-size:40px">0xA11c…e7</div><span class="kpill">whoever holds its key</span></div>
    ${Kit.ed(D, { id: "e-env", file: env, x: 96, y: 458, w: 640, from: a, to: a, size: "small" })}
    ${Kit.ed(D, { id: "e-holder", file: bud, x: 1184, y: 458, w: 640, from: b, to: b, size: "small" })}
    <svg class="ink" viewBox="0 0 1920 1080"><path class="l1" d="M750 316H1160"/><path class="h1 fillpaper" d="M1174 316l-16-8v16z"/><text class="x1" x="960" y="300" text-anchor="middle">a challenge</text>
      <path class="l2" d="M1170 374H760"/><path class="h2 fillpaper" d="M746 374l16-8v16z"/><text class="x2" x="960" y="358" text-anchor="middle">her wallet signs it</text></svg>
    <div class="abs linked">linked</div>
    ${box(0, "a person", "Ada")}${box(1, "the link", "signed, once")}${box(2, "her account", "0xA11c…e7", "mono")}${box(3, "the budget's role", "holder", "mono")}${box(4, "so the budget offers", '<span class="btn">Spend</span>')}
    ${[0, 1, 2, 3].map((k) => `<div class="arr a${k}" style="left:${396 + k * 357}px">→</div>`).join("")}
    <div class="step ag g0" style="left:96px"><div class="lbl">an agent</div><div class="main">never a person</div></div><div class="step ag g1" style="left:453px"><div class="lbl">a key</div><div class="main">of its own</div></div><div class="step ag g2" style="left:810px"><div class="lbl">a budget</div><div class="main">of its own</div></div>
    <div class="abs never">It never links. The contract holds its limit.</div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3);
    s.in(".ours.side", c("w1", "On our server") - 0.2, { x: -16, y: 0 }); s.in(".ours .kpill", c("w1", "signs in"), { y: 6, dur: 0.3 }); s.in("#e-env", c("w1", "environment") - 0.3, { y: 12 });
    s.in(".chain.side", c("w2", "On a chain") - 0.2, { x: 16, y: 0 }); s.tl.set(s.$$(".chain .big, .chain .kpill"), { autoAlpha: 0 }, 0); s.in(".chain .big", c("w2", "accounts"), { y: 8, dur: 0.35 });
    s.in(".chain .kpill", c("w2", "whoever"), { y: 6, dur: 0.3 }); s.in("#e-holder", c("w2", "whoever") + 0.5, { y: 12 });
    s.draw(".l1", c("w3", "challenge") - 0.3, 0.6); s.in(".h1, .x1", c("w3", "challenge"), { y: 0, dur: 0.25 });
    s.draw(".l2", c("w3", "signs it") - 0.2, 0.6); s.in(".h2, .x2", c("w3", "signs it") + 0.2, { y: 0, dur: 0.25 }); s.fromTo(".linked", { autoAlpha: 0, scale: 1.5 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, c("w3", "wallet") + 0.3);
    s.in(".b0, .a0, .b1, .a1, .b2", c("w4", "role can") - 0.3, { x: -12, y: 0, stagger: 0.12, dur: 0.3 }); s.in(".a2, .b3", c("w4", "holder") - 0.1, { x: -12, y: 0, stagger: 0.1, dur: 0.3 });
    s.fromTo(".b2", { boxShadow: "0 0 0 0px rgba(233,240,250,0)" }, { boxShadow: "0 0 0 6px rgba(233,240,250,.18)", duration: 0.3, yoyo: true, repeat: 1 }, c("w4", "That account"));
    s.in(".a3, .b4", c("w4", "offers") - 0.2, { x: -12, y: 0, stagger: 0.1, dur: 0.3 }); s.fromTo(".b4 .btn", { scale: 0.6 }, { scale: 1, duration: 0.35, ease: "back.out(2.5)" }, c("w4", "Spend"));
    s.in(".g0", c("w5") - 0.1, { x: -12, y: 0, dur: 0.3 }); s.in(".never", c("w5", "never links"), { x: 12, y: 0, dur: 0.35 }); s.in(".g1", c("w5", "key"), { x: -12, y: 0, dur: 0.3 }); s.in(".g2", c("w5", "budget of"), { x: -12, y: 0, dur: 0.3 });
  },
});
