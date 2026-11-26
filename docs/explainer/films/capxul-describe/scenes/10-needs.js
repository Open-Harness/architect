// Sheet 10. A thing that waits: a grant is a proposal, it says what it needs, the framework asks, and every way out is declared.
Film.scene("needs", {
  step: "needs",
  html: (D) => {
    const out = D.src["falls-out/check-waiting.txt"].trimEnd().split("\n"), paint = (l) => Film.esc(l).replace(/✔/g, '<span class="ok">✔</span>').replace(/\bnothing\b/, '<span class="no">nothing</span>');
    return `${Kit.css}<style>
      #scene-needs .own { left: 96px; top: 262px; right: 96px; display: flex; gap: 12px; align-items: center; } #scene-needs .own .kpill { font-family: var(--sans); font-size: 25px; color: var(--paper); border-radius: 999px; padding: 7px 20px; } #scene-needs .own .need { margin-left: 12px; font-size: 27px; color: var(--paper); }
      #scene-needs .rule { left: 96px; right: 96px; top: 450px; text-align: center; font-size: 66px; line-height: 1.22; font-weight: 500; letter-spacing: -.015em; } #scene-needs .rule .b { color: var(--cyan); }
      #scene-needs .node { position: absolute; height: 58px; width: 170px; display: grid; place-items: center; border: 2px solid var(--paper); font-family: var(--mono); font-size: 24px; background: var(--bg2); color: var(--paper); }
      #scene-needs svg.ink text { font-size: 20px; } #scene-needs svg.ink text.amt { fill: var(--amber); }
      #scene-needs .inbox { position: absolute; top: 560px; width: 334px; height: 190px; border: 1.5px solid var(--paper); background: linear-gradient(180deg, rgba(19,37,62,.96), rgba(12,24,42,.97)); padding: 16px 20px; }
      #scene-needs .inbox .lbl { color: var(--amber); } #scene-needs .inbox b { display: block; font-size: 27px; font-weight: 500; color: var(--paper); line-height: 1.2; margin: 2px 0 14px; }
      #scene-needs .inbox .pair { position: relative; height: 44px; } #scene-needs .inbox .pair > * { position: absolute; left: 0; top: 0; } #scene-needs .inbox .btn { font-size: 23px; font-weight: 600; padding: 6px 22px; background: var(--paper); color: var(--bg); } #scene-needs .inbox .okd { font: 500 24px var(--mono); color: var(--green); padding-top: 6px; }
      #scene-needs .count { left: 1140px; top: 774px; width: 684px; display: flex; align-items: center; gap: 18px; font-family: var(--mono); font-size: 26px; color: var(--text2); } #scene-needs .count .done { font: 600 24px var(--mono); color: var(--green); border: 3px solid var(--green); padding: 3px 16px; }
      #scene-needs .granted { left: 1140px; top: 846px; width: 684px; display: flex; align-items: center; gap: 14px; font-size: 24px; color: var(--text2); } #scene-needs .granted .chip { font-size: 23px; color: var(--paper); border-color: var(--paper); }
      #scene-needs .clock { left: 1140px; top: 590px; width: 684px; } #scene-needs .clock .bar { height: 20px; border: 1.5px solid var(--rule2); background: rgba(14,28,48,.9); margin: 12px 0 10px; } #scene-needs .clock .bar i { display: block; height: 100%; width: 0; background: var(--paper); }
      #scene-needs .clock .days { display: flex; justify-content: space-between; font: 600 20px var(--label); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); } #scene-needs .clock .exp { margin-top: 18px; font-size: 27px; color: var(--paper); }
      #scene-needs .chk { left: 96px; top: 336px; width: 1728px; } #scene-needs .exits { left: 96px; top: 760px; right: 96px; display: flex; gap: 16px; } #scene-needs .exits div { flex: 1; border: 1px solid var(--rule2); background: rgba(14,28,48,.92); padding: 14px 20px; font-size: 26px; color: var(--paper); } #scene-needs .exits .lbl { display: block; margin-bottom: 4px; }
    </style>
    <div class="head"><div class="eyebrow">A thing that waits</div><div class="hl">A grant is a proposal, and it says what it needs.</div></div>
    <div class="abs own"><span class="lbl" style="margin-right:6px">the treasury's owners</span><span class="kpill o0">Bob</span><span class="kpill o1">Carol</span><span class="kpill o2">Dan</span><span class="need">a new budget needs <b style="font-weight:600">two of the three</b></span></div>
    <div class="abs rule"><div class="a">Operations are short.</div><div class="b">If something waits, it's a thing.</div></div>
    ${Kit.ed(D, { id: "e-prop", file: "blueprint/things/proposal/machine.ts", x: 96, y: 336, w: 1010, size: "small", tag: '<span class="tag am">on the chain</span>' })}
    <svg class="ink mach" viewBox="0 0 1920 1080"><path class="v0 am" d="M1330 400H1576"/><path class="h0 fillam" d="M1590 400l-16-8v16z"/><text class="x0 amt" x="1460" y="386" text-anchor="middle">pass · asks its owners</text>
      <path class="v1" d="M1245 430V490H1576"/><path class="h1 fillpaper" d="M1590 490l-16-8v16z"/><text class="x1" x="1410" y="518" text-anchor="middle">expire · 7 days</text></svg>
    <div class="node n0 mach" style="left:1160px;top:371px">open</div><div class="node n1 mach" style="left:1590px;top:371px">passed</div><div class="node n2 mach" style="left:1590px;top:461px">expired</div>
    <div class="inbox ib0" style="left:1140px"><div class="lbl">Bob · needs you</div><b>Approve Ada's budget</b><div class="pair"><span class="btn b0">Approve</span><span class="okd k0">approved ✔</span></div></div>
    <div class="inbox ib1" style="left:1490px"><div class="lbl">Carol · needs you</div><b>Approve Ada's budget</b><div class="pair"><span class="btn b1">Approve</span><span class="okd k1">approved ✔</span></div></div>
    <div class="abs count"><span><span class="num">0</span> of 2 approvals</span><span class="done hidden0">passed</span></div>
    <div class="abs granted"><span class="chip">Budget · Ada · 1,000 a month</span><span>granted in the same transaction</span></div>
    <div class="abs clock hidden0"><div class="lbl">nobody answers</div><div class="bar"><i></i></div><div class="days"><span>opened</span><span>day 7</span></div><div class="exp">A clock closes it: <span class="mono" style="color:var(--paper)">expired</span></div></div>
    <div class="panel term chk hidden0"><div class="bar"><span class="dots"></span><span>ortho check</span><span class="tag rd">designed output, not a real run</span></div><div class="screen">${out.map((l) => `<div class="o">${paint(l) || " "}</div>`).join("")}</div></div>
    <div class="abs exits"><div class="ex0"><span class="lbl">yes</span>enough owners approve</div><div class="ex1"><span class="lbl">no</span>nobody can turn it down yet</div><div class="ex2"><span class="lbl">silence</span>a clock closes it</div></div>${Kit.legend}`;
  },
  build(s) {
    const c = s.cue, D = s.D, f = "blueprint/things/proposal/machine.ts", body = s.$("#e-prop .code"), L = (re) => Kit.line(D, f, re), n = s.$(".count .num"), tick = { v: 0 };
    s.in(".head", s.start + 0.3);
    s.in(".own .lbl, .own .kpill", c("g1", "new budget") - 0.2, { y: 8, stagger: 0.1, dur: 0.3 }); s.in(".own .need", c("g1", "two of"), { x: 12, y: 0 });
    s.in(".rule .a", c("g2", "Operations") - 0.1, { y: 18, dur: 0.6 }); s.in(".rule .b", c("g2", "If something"), { y: 18, dur: 0.6 }); s.out(".rule", c("g3") - 0.45, { dur: 0.35 });
    s.in("#e-prop", c("g3"), { y: 14 }); s.in(".klegend", c("g3") + 0.4);
    s.focus(body, [L(/states:/), L(/states:/)], c("g3", "open")); s.in(".n0", c("g3", "open"), { y: 8, dur: 0.3 }); s.in(".n1", c("g3", "passed"), { y: 8, dur: 0.3 }); s.in(".n2", c("g3", "expired"), { y: 8, dur: 0.3 });
    s.focus(body, [L(/What an open proposal needs/), L(/asks: Blueprint/)], c("g4", "what it needs")); s.draw(".v0", c("g4", "asks") - 0.2, 0.5); s.in(".h0, .x0", c("g4", "asks") + 0.3, { y: 0, dur: 0.25 });
    s.tl.set(s.$$(".okd, .granted, .count"), { autoAlpha: 0 }, 0);
    s.in(".ib0", c("g5", "Bob") - 0.2, { y: 14, dur: 0.4 }); s.in(".ib1", c("g5", "Carol") - 0.1, { y: 14, dur: 0.4 }); s.in(".count", c("g5", "waiting on") - 0.2, { y: 0, dur: 0.3 });
    const approve = (k, t, to) => { s.to(".b" + k, { autoAlpha: 0, duration: 0.15 }, t); s.to(".k" + k, { autoAlpha: 1, duration: 0.2 }, t + 0.1); s.tl.to(tick, { v: to, duration: 0.01, onUpdate: () => { n.textContent = Math.round(tick.v); } }, t + 0.1); };
    approve(0, c("g5", "When the") - 0.3, 1); approve(1, c("g5", "approves") - 0.1, 2);
    s.fromTo(".done", { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, c("g5", "passes")); s.to(".n1", { borderColor: "#54d898", color: "#54d898", duration: 0.3 }, c("g5", "passes"));
    s.in(".granted", c("g5", "granted") - 0.3, { y: 10, dur: 0.4 });
    const t6 = c("g6");
    s.out(".ib0, .ib1, .count, .granted", t6 - 0.4, { dur: 0.3 }); s.to(".n1", { borderColor: "#e9f0fa", color: "#e9f0fa", duration: 0.3 }, t6 - 0.3);
    s.in(".clock", t6, { y: 12 }); s.focus(body, [L(/expire:/), L(/expire:/) + 1], c("g6", "clock")); s.draw(".v1", c("g6", "clock"), 0.5); s.in(".h1, .x1", c("g6", "clock") + 0.4, { y: 0, dur: 0.25 });
    s.fromTo(".clock .bar i", { width: "0%" }, { width: "100%", duration: 1.5, ease: "none" }, c("g6", "clock") + 0.1); s.tl.set(s.$(".clock .exp"), { autoAlpha: 0 }, 0); s.in(".clock .exp", c("g6", "seven days"), { y: 6, dur: 0.3 });
    s.fromTo(".n2", { boxShadow: "0 0 0 0px rgba(233,240,250,0)" }, { boxShadow: "0 0 0 7px rgba(233,240,250,.2)", duration: 0.3, yoyo: true, repeat: 1 }, c("g6", "seven days") + 0.3);
    const t7 = c("g6", "Every way out");
    s.out("#e-prop, .mach, .clock", t7 - 0.45, { dur: 0.35 }); s.fromTo(".chk", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.45 }, t7 - 0.1);
    s.tl.fromTo(s.$$(".chk .o"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, stagger: 0.14, ease: "none" }, t7 + 0.3);
    s.tl.set(s.$$(".exits > div"), { autoAlpha: 0 }, 0); s.in(".exits > div", c("g6", "check can") - 0.2, { y: 10, stagger: 0.25, dur: 0.35 }); s.to(".ex1", { borderColor: "#e9f0fa", duration: 0.3 }, c("g6", "wait for") - 0.2);
  },
});
