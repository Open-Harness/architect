// Sheet 6. Proof, run on screen: the journey's current step on the left, and on the right the world it runs in and the run itself,
// each step going green with its evidence. The world's clock jumps a month, and a payment made around the app ends up unexplained.
Film.scene("prove", {
  step: "prove",
  html: (D) => {
    const j = "journeys/ada-spends-from-her-budget.ts", rows = D.src[j].split("\n");
    const starts = rows.map((l, k) => (/^\s*s\.step\($/.test(l) ? k + 1 : 0)).filter(Boolean), end = rows.findIndex((l) => /^\s*\],$/.test(l));
    const run = D.src["falls-out/prove.txt"].trimEnd().split("\n");
    const steps = run.filter((l) => l.startsWith("✔")).map((l) => { const m = /^✔ (.+?)\s{2,}(.+)$/.exec(l); if (!m) throw new Error("prove.txt: " + l); return [m[1], m[2].split(" · ")]; });
    return `<style>
      #scene-prove .world { left: 1020px; top: 262px; width: 804px; } #scene-prove .wbs { display: flex; gap: 14px; margin-top: 4px; } #scene-prove .wb { flex: 1; min-height: 124px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); padding: 12px 16px; }
      #scene-prove .wb b { display: block; font-size: 24px; font-weight: 500; color: var(--paper); } #scene-prove .wb span { display: block; font-size: 21px; line-height: 1.3; color: var(--text2); margin-top: 4px; }
      #scene-prove .bk { display: block; font: 400 20px var(--sans); font-style: normal; padding: 2px 8px; margin-top: 6px; border: 1px solid var(--green); color: var(--green); white-space: nowrap; } #scene-prove .bk.un { border-color: var(--red); color: var(--red); }
      #scene-prove .clock { left: 1020px; top: 438px; width: 804px; height: 52px; display: flex; align-items: center; gap: 16px; padding: 0 16px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); }
      #scene-prove .date { position: relative; width: 150px; height: 34px; font-family: var(--mono); font-size: 24px; } #scene-prove .date b { position: absolute; left: 0; top: 0; font-weight: 500; color: var(--paper); white-space: nowrap; } #scene-prove .date .d1 { color: var(--cyan); }
      #scene-prove .jump { font-size: 22px; color: var(--cyan); }
      #scene-prove #run { left: 1020px; top: 506px; width: 804px; } #scene-prove #run .screen { font-size: 20px; line-height: 30px; padding: 14px 20px 16px; }
      #scene-prove .stp { display: grid; grid-template-columns: 34px 1fr; margin-top: 10px; } #scene-prove .mk { position: relative; font-size: 22px; } #scene-prove .mk i { position: absolute; left: 0; top: 0; font-style: normal; } #scene-prove .mk .pend { color: var(--dim); } #scene-prove .mk .okk { color: var(--green); }
      #scene-prove .stp b { display: block; font-family: var(--sans); font-size: 23px; font-weight: 400; color: var(--muted); } #scene-prove .evd { min-height: 30px; font-size: 20px; color: var(--green); } #scene-prove .evd span { margin-right: 18px; white-space: nowrap; }
      #scene-prove .sum { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--rule); font-size: 22px; color: var(--green); }
      #scene-prove .hand { top: 700px; width: 440px; min-height: 128px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); padding: 14px 18px; font-size: 25px; line-height: 1.25; color: var(--paper); } #scene-prove .hand .lbl { display: block; margin-bottom: 4px; }
      #scene-prove .hand.h0 { left: 96px; } #scene-prove .hand.h1 { left: 556px; border-color: var(--green); } #scene-prove .hand.h1 .lbl { color: var(--green); }
    </style>
    <div class="head"><div class="eyebrow">Proof</div><div class="hl">A journey, run in a world with a chain in it.</div></div>
    ${starts.map((a, k) => Kit.ed(D, { id: "e-j" + k, file: j, from: a, to: (starts[k + 1] ?? end + 1) - 1, x: 96, y: 262, w: 900, size: "small", tag: `<span class="tag">step ${k + 1} of ${starts.length}</span>` })).join("")}
    <div class="abs world"><div class="lbl">a world</div><div class="wbs">
      <div class="wb w0"><b>a local chain</b><span>its own blocks, and its own money</span></div>
      <div class="wb w1"><b>a local server</b><i class="bk bk0">spend · paid</i><i class="bk un bk1">spend · unexplained</i></div>
      <div class="wb w2"><b>the cast</b><span>Ada, Bob and Carol, each with a wallet</span></div></div></div>
    <div class="abs clock"><span class="lbl">the world's clock</span><span class="date"><b class="d0">1 March</b><b class="d1">1 April</b></span><span class="jump">+ 1 month, stepped by the journey</span></div>
    <div class="panel term" id="run"><div class="bar"><span class="dots"></span><span>ortho prove</span><span class="tag rd">designed output, not a real run</span></div><div class="screen">
      ${Film.term(run[0].replace(/^\$\s*/, ""), "")}
      ${steps.map(([title, ev], k) => `<div class="stp stp${k}"><span class="mk"><i class="pend">○</i><i class="okk">✔</i></span><div><b>${title}</b><div class="evd">${ev.map((e) => `<span>${e}</span>`).join("")}</div></div></div>`).join("")}
      <div class="sum">${run[run.length - 1]}</div></div></div>
    <div class="abs hand h0"><span class="lbl">one agent</span>writes the journeys, before anything is built</div>
    <div class="abs hand h1"><span class="lbl">another agent</span>builds, and climbs until they are green</div>`;
  },
  build(s) {
    const c = s.cue, D = s.D, j = "journeys/ada-spends-from-her-budget.ts", L = (re) => Kit.line(D, j, re), ed = (k) => s.$(`#e-j${k} .code`);
    const evd = (k) => s.$$(`.stp${k} .evd span`), lit = (k, t) => s.to(`.stp${k} b`, { color: "#e9f0fa", duration: 0.25 }, t);
    const pass = (k, t) => { s.to(`.stp${k} .pend`, { autoAlpha: 0, duration: 0.15 }, t); s.fromTo(`.stp${k} .okk`, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, t); };
    const show = (el, t) => s.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, t);
    const next = (k, t) => { s.out("#e-j" + (k - 1), t, { dur: 0.25 }); s.in("#e-j" + k, t + 0.2, { y: 10, dur: 0.35 }); };
    const line = (k, re, t) => { const n = L(re); s.focus(ed(k), [n, n], t, 0.3); };
    s.in(".head", s.start + 0.3); s.in("#e-j0", c("q1", "Journeys") - 0.3, { y: 14 });
    s.in(".world .lbl", c("q2", "world") - 0.2); s.in(".w0", c("q2", "local chain"), { y: 8, dur: 0.3 }); s.in(".w1", c("q2", "local server"), { y: 8, dur: 0.3 }); s.in(".w2", c("q2", "cast"), { y: 8, dur: 0.3 });
    s.in(".clock", c("q2", "wallets") + 0.2, { y: 8, dur: 0.3 }); s.tl.set(s.$$(".d1, .jump, .bk, .okk, .evd span, .sum"), { autoAlpha: 0 }, 0);
    // The run: typed once, then each step is lit, shows its evidence, and passes.
    s.in("#run", c("q3") - 1.0, { y: 14 }); Loc.type(s, s.$("#run"), c("q3") - 0.75, 0.6); s.in(".stp", c("q3") - 0.2, { y: 0, dur: 0.2, stagger: 0.05 });
    lit(0, c("q3", "pays")); line(0, /s\.ada\.run\(spend, .*400n/, c("q3", "pays"));
    show(evd(0)[0], c("q3", "event")); line(0, /emits\(BudgetSpent/, c("q3", "event"));
    show(evd(0)[1], c("q3", "one transaction")); line(0, /transfers:/, c("q3", "one transaction"));
    show(evd(0)[2], c("q3", "books")); line(0, /recorded\(Spend, \{ amount: 400n/, c("q3", "books")); s.in(".bk0", c("q3", "books"), { y: 6, dur: 0.3 }); pass(0, c("q3", "$") - 0.1);
    next(1, c("q4") - 0.2); lit(1, c("q4", "over"));
    show(evd(1)[0], c("q4", "refused")); line(1, /refuses\(BudgetExceeded\)/, c("q4", "refused")); show(evd(1)[1], c("q4", "nothing")); line(1, /receipts\(\{ sent: 0/, c("q4", "nothing")); pass(1, c("q4", "$") - 0.1);
    next(2, c("q5") - 0.2); lit(2, c("q5", "month")); line(2, /s\.clock\.advance/, c("q5", "month"));
    const tick = c("q5", "clock");
    s.to(".d0", { autoAlpha: 0, y: -14, duration: 0.25 }, tick); s.fromTo(".d1", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.3 }, tick + 0.1); show(".jump", tick + 0.2);
    s.fromTo(".clock", { borderColor: "rgba(132,170,222,.36)" }, { borderColor: "#62c6ff", boxShadow: "0 0 0 6px rgba(98,198,255,.16)", duration: 0.3 }, tick); s.to(".clock", { boxShadow: "0 0 0 0px rgba(98,198,255,0)", duration: 0.5 }, tick + 0.9);
    show(evd(2)[0], tick + 0.1); show(evd(2)[1], c("q5", "spend again")); line(2, /budgets\.isIn/, c("q5", "spend again")); pass(2, c("q5", "$") - 0.1);
    next(3, c("q6") - 0.2); lit(3, c("q6", "pays around")); s.focus(ed(3), [L(/s\.ada\.wallet\.call/) - 1, L(/s\.ada\.wallet\.call/)], c("q6", "pays around"), 0.3);
    show(evd(3)[0], c("q6", "money moves")); line(3, /receipts\(\{ sent: 1, reverted: 0 \}\)/, c("q6", "money moves"));
    show(evd(3)[1], c("q6", "ask why")); line(3, /recorded\(Spend, \{ amount: 150n/, c("q6", "ask why")); s.in(".bk1", c("q6", "ask why"), { y: 6, dur: 0.3 }); pass(3, c("q6", "$") - 0.1);
    s.focus(ed(3), null, c("q7") - 0.1); s.in(".h0", c("q7", "different agent") - 0.2, { y: 12 }); s.in(".h1", c("q7", "builder climbs") - 0.2, { y: 12 }); show(".sum", c("q7", "green") - 0.2);
  },
});
