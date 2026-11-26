// Sheet 9. One sealed spend as a sequence: five parties across, time running down, and the call's own state beside it.
// Then the other ending: a payment made around the app leaves a seal with no reason behind it.
Film.scene("flow", {
  step: "join",
  html: () => {
    const X = { app: 480, wal: 750, srv: 1040, con: 1370, idx: 1700 };
    const heads = [["app", "Ada's app", "her device"], ["wal", "Ada's wallet", "her device"], ["srv", "Our server", "relayer · reasons · books"], ["con", "Treasury contract", "her company's own"], ["idx", "The indexer", "ours · an actor"]];
    // An arrow from one lifeline to another at a height: its line, its head, and its label above.
    const arrow = (id, from, to, y, label, o = {}) => {
      const a = X[from], b = X[to], right = b > a, tip = right ? b - 2 : b + 2, end = right ? tip - 14 : tip + 14, cls = (o.cls ?? "") + (o.dash ? " dash" : "");
      const lx = o.lx ?? (right ? a + 14 : a - 14), anchor = o.anchor ?? (right ? "start" : "end");
      return `<path class="ar ${id} ${cls}" d="M${a} ${y}H${end}"/><path class="hd ${id}h ${o.cls === "am" ? "fillam" : "fillpaper"}" d="M${tip} ${y}l${right ? -16 : 16}-8v16z"/>
        <text class="lab ${id}t ${o.cls === "am" ? "amt" : ""}" x="${lx}" y="${y - 12}" text-anchor="${anchor}">${label}</text>`;
    };
    const note = (id, x, y, text, anchor = "start") => `<text class="sub ${id}" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
    const states = [["tried", 386, 90, "free · nothing sent"], ["signed", 476, 90, "once, for both halves"], ["submitted", 566, 296, "waiting for the chain"], ["confirmed", 862, 94, "in the books"]];
    return `${Kit.css}<style>
      #scene-flow .lh { position: absolute; top: 262px; width: 236px; height: 58px; display: grid; place-items: center; border: 1.5px solid var(--paper); background: var(--bg2); font-size: 26px; font-weight: 500; color: var(--paper); white-space: nowrap; }
      #scene-flow .ls { position: absolute; top: 328px; width: 300px; text-align: center; font: 600 20px var(--label); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
      #scene-flow .cap { left: 96px; top: 344px; font: 600 21px var(--label); letter-spacing: .13em; text-transform: uppercase; color: var(--muted); }
      #scene-flow .st { position: absolute; left: 96px; width: 240px; border: 1.5px solid var(--rule2); background: rgba(14,28,48,.9); padding: 12px 16px; opacity: .3; } #scene-flow .st b { display: block; font: 500 27px var(--mono); color: var(--paper); } #scene-flow .st span { font-size: 21px; color: var(--text2); }
      #scene-flow svg.ink .life { stroke: var(--rule2); stroke-dasharray: 5 7; stroke-width: 1.5; } #scene-flow svg.ink .ar { stroke-width: 2.2; }
      #scene-flow svg.ink text.lab { font-family: var(--sans); font-size: 23px; letter-spacing: 0; text-transform: none; fill: var(--paper); paint-order: stroke; stroke: #0a1525; stroke-width: 9px; stroke-linejoin: round; }
      #scene-flow svg.ink text.sub { font-family: var(--sans); font-size: 21px; letter-spacing: 0; text-transform: none; fill: var(--text2); paint-order: stroke; stroke: #0a1525; stroke-width: 9px; stroke-linejoin: round; }
      #scene-flow svg.ink text.amt { fill: var(--amber); } #scene-flow svg.ink .waitb { stroke: var(--muted); stroke-dasharray: 4 4; fill: #0a1525; }
      #scene-flow .veil { left: 37px; right: 37px; top: 250px; bottom: 80px; background: rgba(8,17,31,.9); }
      #scene-flow .alt { position: absolute; top: 470px; width: 470px; height: 236px; border: 1.5px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.96), rgba(12,24,42,.97)); padding: 20px 24px; }
      #scene-flow .alt .big { font-size: 32px; font-weight: 500; color: var(--paper); line-height: 1.2; margin-top: 4px; } #scene-flow .alt .mono { font-size: 25px; color: var(--amber); margin-top: 14px; } #scene-flow .alt .bad { font-size: 24px; color: var(--red); margin-top: 6px; }
      #scene-flow .alt .state { display: inline-block; margin-top: 16px; font: 500 30px var(--mono); color: var(--red); border: 2px solid var(--red); padding: 4px 16px; } #scene-flow .alt .v { font-size: 25px; margin-top: 10px; color: var(--text2); } #scene-flow .alt .v b { font-weight: 500; }
      #scene-flow .altarr { position: absolute; top: 560px; width: 64px; text-align: center; font-size: 40px; color: var(--muted); } #scene-flow .althead { left: 96px; right: 96px; top: 380px; text-align: center; font-size: 40px; font-weight: 500; color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">One spend, followed through</div><div class="hl">Tried, signed once, sent, confirmed.</div></div>
    <div class="abs cap">the call is</div>
    ${states.map(([name, top, h, sub], k) => `<div class="st s${k}" style="top:${top}px;height:${h}px"><b>${name}</b><span>${sub}</span></div>`).join("")}
    ${heads.map(([id, name, sub]) => `<div class="lh" style="left:${X[id] - 118}px">${name}</div><div class="ls" style="left:${X[id] - 150}px">${sub}</div>`).join("")}
    <svg class="ink seq" viewBox="0 0 1920 1080">
      ${Object.values(X).map((x) => `<path class="life" d="M${x} 366V956"/>`).join("")}
      ${arrow("a1", "app", "con", 410, "try budget.spend, without sending", { dash: true })}
      ${arrow("a2", "con", "app", 448, "would pass · or BudgetExceeded, and nothing is signed", { dash: true })}
      ${arrow("a3", "app", "wal", 524, "sign once: the money, and the reason's seal", { cls: "am" })}
      ${note("n3", X.app + 14, 554, "it shows the operation's own description")}
      ${arrow("a4", "app", "srv", 610, "the signed call, and the reason", { cls: "am" })}
      ${note("n4", X.srv + 12, 640, "keeps the reason under its seal")}
      ${arrow("a5", "srv", "con", 712, "spendBySig", { lx: (X.srv + X.con) / 2, anchor: "middle" })}
      ${note("n5", (X.srv + X.con) / 2, 742, "and pays the gas", "middle")}
      ${note("n6", X.con + 12, 742, "role · machine · rule ✓")}${note("n7", X.con + 12, 770, "pays · emits the event")}
      ${arrow("a6", "con", "idx", 812, "BudgetSpent, with the seal", { dash: true, lx: (X.con + X.idx) / 2, anchor: "middle" })}
      <rect class="waitb" x="${X.idx - 11}" y="822" width="22" height="54"/>${note("n8", X.idx - 22, 846, "knows it from the blueprint", "end")}${note("n9", X.idx - 22, 872, "waits 3 blocks", "end")}
      ${arrow("a7", "idx", "srv", 898, "confirmed", { lx: X.con - 14, anchor: "end" })}
      ${note("n10", X.srv + 12, 926, "the seal matches: the spend is recorded with its reason,")}${note("n11", X.srv + 12, 952, "and the books are written, in one commit")}
    </svg>
    <div class="abs veil hidden0"></div>
    <div class="abs althead hidden0">And if someone pays around the app?</div>
    <div class="alt al0 hidden0" style="left:96px"><div class="lbl">a call straight from a wallet</div><div class="big">The money moves.</div><div class="mono">seal 0x51d0…7a</div><div class="bad">no reason behind it</div></div>
    <div class="altarr aa0 hidden0" style="left:566px">→</div>
    <div class="alt al1 hidden0" style="left:630px"><div class="lbl">in the books</div><div class="big">The spend is marked</div><div class="state">unexplained</div></div>
    <div class="altarr aa1 hidden0" style="left:1100px">→</div>
    <div class="alt al2 hidden0" style="left:1164px;width:660px"><div class="lbl">an explanation</div><div class="big">It has to match what was signed.</div><div class="v"><b class="gr">matches the seal ✔</b> &nbsp;the spend is paid</div><div class="v"><b class="rd">doesn't ✘</b> &nbsp;refused</div></div>${Kit.legend}`;
  },
  build(s) {
    const c = s.cue, tl = s.tl;
    s.in(".head", s.start + 0.3); s.in(".klegend", s.start + 0.9);
    tl.set(s.$$("svg.seq .ar, svg.seq .hd, svg.seq text, svg.seq .waitb"), { autoAlpha: 0 }, 0);
    s.in(".lh", c("p1") - 0.2, { y: 12, stagger: 0.1, dur: 0.35 }); s.in(".ls", c("p1") + 0.2, { y: 6, stagger: 0.1, dur: 0.3 }); s.fromTo(".life", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, c("p1") + 0.3); s.in(".cap", c("p1") + 0.4, { y: 0 });
    tl.fromTo(s.$$(".st"), { autoAlpha: 0 }, { autoAlpha: 0.3, duration: 0.4, stagger: 0.08 }, c("p1") + 0.4);
    // A solid arrow is drawn; a dashed one fades in, so its dashes survive.
    const go = (id, t, dash) => { if (dash) s.in("." + id, t, { x: -14, y: 0, dur: 0.45 }); else s.draw("." + id, t, 0.5); s.in(`.${id}h, .${id}t`, t + (dash ? 0.15 : 0.4), { y: 0, dur: 0.25 }); };
    const state = (k, t) => { tl.to(s.$(".s" + k), { autoAlpha: 1, borderColor: "#62c6ff", duration: 0.3 }, t); if (k) tl.to(s.$(".s" + (k - 1)), { autoAlpha: 0.6, borderColor: "rgba(132,170,222,.36)", duration: 0.3 }, t); };
    const say = (id, t) => s.in("." + id, t, { y: 6, dur: 0.3 });
    go("a1", c("p2", "tried"), true); state(0, c("p2", "tried")); go("a2", c("p2", "refused") - 0.3, true);
    go("a3", c("p3", "wallet")); say("n3", c("p3", "description") - 0.4); state(1, c("p3", "signs"));
    go("a4", c("p4", "signed call")); say("n4", c("p4", "keeps")); go("a5", c("p4", "sends the call")); state(2, c("p4", "sends the call")); say("n5", c("p4", "pays"));
    say("n6", c("p5", "checks")); say("n7", c("p5", "pays")); go("a6", c("p5", "emits"), true);
    say("n8", c("p6", "knows")); s.in(".waitb", c("p6", "waits"), { y: 0, dur: 0.3 }); say("n9", c("p6", "waits")); go("a7", c("p6", "hands"));
    say("n10", c("p7", "matches")); say("n11", c("p7", "writes")); state(3, c("p7", "records"));
    const t8 = c("p8");
    s.fromTo(".veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 }, t8 - 0.3); s.in(".althead", t8, { y: 14 });
    s.in(".al0", c("p8", "seal with") - 0.5, { y: 14 }); s.tl.set(s.$$(".al0 .mono, .al0 .bad"), { autoAlpha: 0 }, 0); s.in(".al0 .mono", c("p8", "seal with"), { y: 4, dur: 0.3 }); s.in(".al0 .bad", c("p8", "no reason"), { y: 4, dur: 0.3 });
    s.in(".aa0, .al1", c("p8", "marked") - 0.3, { x: -12, y: 0, stagger: 0.1, dur: 0.35 }); s.fromTo(".al1 .state", { autoAlpha: 0, scale: 1.5 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, c("p8", "unexplained"));
    s.in(".aa1, .al2", c("p8", "explanation") - 0.3, { x: -12, y: 0, stagger: 0.1, dur: 0.35 }); s.tl.set(s.$$(".al2 .v"), { autoAlpha: 0 }, 0); s.in(".al2 .v", c("p8", "match") - 0.1, { y: 6, stagger: 0.35, dur: 0.3 });
  },
});
