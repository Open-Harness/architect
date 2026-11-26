// Sheet 3. The whole pipeline on one sheet: what you write, the one model, what is projected from it, and proof coming back.
Film.scene("map", {
  html: () => {
    const outs = [["server", 3, 0], ["HTTP API", 0, 0], ["SDK", 1, 0], ["CLI", 2, 0], ["MCP tools", 0, 1], ["docs", 1, 1], ["portal", 2, 1], ["infra", 3, 1]];
    return `<style>
      #scene-map .bp { left: 96px; top: 300px; width: 410px; padding: 20px 22px 24px; }
      #scene-map .bp .chip { display: flex; margin-top: 12px; font-size: 20px; } #scene-map .bp .lbl { color: var(--paper); }
      #scene-map .model { left: 735px; top: 350px; width: 210px; height: 210px; display: grid; place-content: center; text-align: center; }
      #scene-map .model b { font-family: var(--mono); font-size: 30px; font-weight: 500; } #scene-map .model span { font-family: var(--label); text-transform: uppercase; letter-spacing: 0.13em; font-size: 19px; color: var(--cyan); margin-top: 4px; }
      #scene-map .o { position: absolute; width: 284px; height: 62px; justify-content: center; color: var(--cyan); border-color: rgba(98,198,255,.55); font-size: 23px; }
      #scene-map .hand { left: 1222px; top: 690px; width: 400px; padding: 12px 18px 14px; border: 1.5px solid var(--amber); background: rgba(255,181,92,.08); font-family: var(--mono); font-size: 21px; color: var(--amber); }
      #scene-map .hand .lbl { color: var(--amber); margin-bottom: 2px; }
      #scene-map .cap { font-family: var(--label); text-transform: uppercase; letter-spacing: 0.14em; font-size: 22px; font-weight: 600; }
      #scene-map .back { top: 852px; height: 58px; }
      #scene-map .one { right: 96px; top: 168px; text-align: right; }
    </style>
    <div class="head"><div class="eyebrow">The whole idea</div><div class="hl">One description in. Everything else out.</div></div>
    <svg class="ink" viewBox="0 0 1920 1080">
      <path class="a1" d="M506 455H722"/><path class="h1 fillpaper" d="M735 455l-16-8v16z"/>
      <circle class="ring cy" cx="840" cy="455" r="105"/><circle class="ring2 cy dash" cx="840" cy="455" r="122"/>
      <path class="a2 cy" d="M962 455H1180"/><path class="a2 cy" d="M1180 331V565"/>
      ${[0, 1, 2, 3].map((r) => `<path class="a2 cy" d="M1180 ${331 + r * 78}H1222"/>`).join("")}
      <path class="plug am" d="M1364 690V596"/><circle class="plugdot fillam" cx="1364" cy="596" r="6"/>
      <path class="loop gr" d="M1680 596V880H300V640"/><path class="looph fillgr" d="M300 626l-8 16h16z"/>
      <circle class="pulse fillpaper" cx="300" cy="455" r="9"/>
    </svg>
    <div class="abs cap w1" style="left:96px;top:258px">You write</div>
    <div class="panel bp"><div class="lbl mono" style="text-transform:none;letter-spacing:0;font-family:var(--mono)">blueprint/</div>
      ${["things/handle/thing.ts", "things/handle/machine.ts", "things/handle/verbs/claim.ts", "things/handle/invariants.ts"].map((f) => `<div class="chip">${f}</div>`).join("")}</div>
    <div class="abs lbl l1" style="left:506px;width:216px;top:412px;text-align:center">ortho check</div>
    <div class="abs model"><b>model</b><span>one file</span></div>
    <div class="abs lbl l2" style="left:962px;width:218px;top:414px;text-align:center;color:var(--cyan)">ortho generate</div>
    <div class="abs cap cy w2" style="left:1222px;top:258px">Orthograph makes</div>
    ${outs.map(([name, row, col]) => `<div class="chip o o-${name.split(" ")[0].toLowerCase()}" style="left:${1222 + col * 306}px;top:${300 + row * 78}px">${name}</div>`).join("")}
    <div class="abs hand"><div class="lbl">behaviour, by hand</div>one handler per operation</div>
    <div class="abs chip back j1" style="left:1090px"><span class="mu">journeys</span> stories through real operations</div>
    <div class="abs chip back j2" style="left:760px">ortho prove</div>
    <div class="abs chip back j3 gr" style="left:440px;border-color:var(--green)">verdict ✔</div>
    <div class="abs one note"><span class="chip" style="border-color:var(--paper)">handle.claim</span> &nbsp;one feature, all the way through</div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3);
    s.in(".w1", c("m2", "left")); s.in(".bp", c("m2", "left") + 0.1); s.in(".bp .chip", c("m2", "Small"), { stagger: 0.12, y: 10 });
    const m3 = c("m3", "compiles");
    s.in(".l1", m3); s.draw(".a1", m3, 0.6); s.in(".h1", m3 + 0.5, { y: 0, dur: 0.2 });
    s.draw(".ring", m3 + 0.5, 0.8); s.in(".model", c("m3", "one model"), { scale: 0.85, y: 0 }); s.fromTo(".ring2", { autoAlpha: 0 }, { autoAlpha: 0.5, duration: 0.6 }, c("m3", "one model") + 0.2);
    const m4 = c("m4", "generates");
    s.in(".l2", m4); s.in(".w2", m4); s.draw(".a2", m4, 0.7);
    [["server", "server"], ["http", "HTTP"], ["sdk", "SDK"], ["cli", "command"], ["mcp", "MCP"], ["docs", "docs"]].forEach(([k, w]) => s.in(".o-" + k, c("m4", w), { x: -14, y: 0, dur: 0.4 }));
    s.in(".o-portal, .o-infra", c("m4", "more"), { x: -14, y: 0, dur: 0.4, stagger: 0.12 });
    const m5 = c("m5", "behav");
    s.in(".hand", m5, { y: 20 }); s.draw(".plug", m5 + 0.35, 0.45); s.in(".plugdot", m5 + 0.75, { y: 0, dur: 0.2 });
    s.to(".o-server", { borderColor: "#ffb55c", duration: 0.3 }, m5 + 0.75);
    const m6 = c("m6", "Stories");
    s.in(".j1", m6, { y: 12 }); s.draw(".loop", m6 + 0.1, 2.4); s.in(".j2", c("m6", "real system"), { y: 12 });
    s.in(".j3", c("m6", "verdict"), { y: 12 }); s.in(".looph", c("m6", "verdict") + 0.3, { y: 0, dur: 0.2 });
    const m7 = c("m7");
    s.in(".one", m7 + 0.2);
    s.fromTo(".pulse", { autoAlpha: 0, attr: { cx: 300 } }, { autoAlpha: 1, duration: 0.2 }, m7 + 0.4);
    s.to(".pulse", { attr: { cx: 840 }, duration: 0.8, ease: "power2.inOut" }, m7 + 0.6); s.to(".pulse", { attr: { cx: 1364 }, duration: 0.8, ease: "power2.inOut" }, m7 + 1.4);
    s.to(".pulse", { autoAlpha: 0, duration: 0.3 }, m7 + 2.2);
  },
});
