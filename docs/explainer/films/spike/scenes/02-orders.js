// Sheet 2. The ledger strip is first drawn here, from the example the run printed. Then the run itself, replayed: eight events in
// every order they can happen, and the three counts, laid on one bar to scale.
Film.scene("orders", {
  step: "orders",
  html: (D) => {
    const R = Loc.run(D), ex = R.ways[0].example;
    Loc.said(D, "b2", R.events.length); Loc.said(D, "b3", R.total); Loc.said(D, "b5", R.late); Loc.said(D, "b5", R.cannot);
    if (R.early * 3 !== R.total * 2) throw new Error("orders: the narration says two thirds, and the recording no longer does");
    const W = 1728, safe = W * R.early / R.total, gone = W * R.cannot / R.total, upTo = R.rows.findIndex((l) => /what is left cannot cover it$/.test(l));
    return `${Kit.css}${Loc.css("orders")}<style>
      #scene-orders .board { left: 96px; top: 266px; width: 1728px; height: 112px; }
      #scene-orders .board .cell { position: absolute; top: 0; width: 208px; }
      #scene-orders .ask { left: 1010px; top: 276px; width: 800px; } #scene-orders .nots { left: 1010px; top: 292px; display: flex; gap: 20px; } #scene-orders .nots .chip { font-family: var(--sans); font-size: 30px; padding: 12px 24px; color: var(--text2); }
      #scene-orders .rowlab { position: absolute; left: 96px; top: 384px; }
      #scene-orders .scale { position: absolute; left: 96px; top: 836px; width: ${W}px; height: 58px; border: 1.5px dashed var(--rule2); padding: 0; display: block; background: none; }
      #scene-orders .seg { position: absolute; top: -1.5px; height: 58px; }
      #scene-orders .seg.all { left: -1.5px; width: ${W}px; background: rgba(132,170,222,.1); border: 1.5px solid var(--rule2); }
      #scene-orders .seg.late { left: ${safe}px; width: ${W - safe}px; border: 2px solid var(--paper); background: rgba(233,240,250,.1); }
      #scene-orders .seg.gone { left: ${W - gone}px; width: ${gone}px; background: var(--cyan); }
      #scene-orders .num { position: absolute; display: flex; align-items: baseline; gap: 16px; white-space: nowrap; } #scene-orders .num b { font-family: var(--mono); font-size: 44px; font-weight: 500; line-height: 1; font-variant-numeric: tabular-nums; } #scene-orders .num span { font-size: 24px; color: var(--text2); }
      #scene-orders .num.total { left: 96px; top: 908px; } #scene-orders .num.early { left: 96px; top: 778px; } #scene-orders .num.late { left: ${96 + safe}px; top: 778px; } #scene-orders .num.gone { right: 96px; top: 908px; }
      #scene-orders .track { position: absolute; left: 96px; top: 792px; }
    </style>
    <div class="head"><div class="eyebrow">The spike</div><div class="hl">It plays every order, and counts what breaks.</div></div>
    <div class="who">${Kit.who("agent", "the spike")}</div>
    <div class="abs board">${R.events.map((name, k) => { const e = ex.find((x) => x.name === name);
      return `<div class="cell hidden0 ev${k}" style="left:${k * 217}px"><span class="evn">${Film.esc(name)}</span><b class="bal hidden0${e && +e.bal < 0 ? " under" : ""}">${e ? Film.esc(e.bal) : ""}</b></div>`; }).join("")}</div>
    <div class="abs ask hidden0"><div class="say">A late reversal is a question about order.</div></div>
    <div class="abs nots"><span class="chip n1 hidden0">no wallet built</span><span class="chip n2 hidden0">no provider called</span></div>
    <div class="lbl rowlab hidden0">one wallet · its balance under each event</div>
    ${Kit.term(D, { id: "or-term", cap: "spike-run", x: 96, y: 424, w: 1728, h: 322, title: "orthograph", keep: (l, k) => k <= upTo })}
    <div class="lbl track">every order they can happen</div>
    <div class="scale"><div class="seg all hidden0"></div><div class="seg late hidden0"></div><div class="seg gone hidden0"></div></div>
    <div class="num total hidden0"><b>${R.total}</b><span>orders, every one played</span></div>
    <div class="num early hidden0"><b>${R.early}</b><span>the reversal comes first · every rule is kept</span></div>
    <div class="num late hidden0"><b>${R.late}</b><span>late</span></div>
    <div class="num gone hidden0"><span>already withdrawn · what is left cannot cover it</span><b class="cy">${R.cannot}</b></div>`;
  },
  build(s) {
    const c = s.cue, R = Loc.run(s.D), ex = R.ways[0].example, cells = s.$$(".board .cell"), STEP = 217;
    // Which orders may be shown: the spike's own file says what each event comes after.
    const src = s.D.repo["spikes/pay-by-name-reversal/spike.mjs"], decl = [...src.matchAll(/\{ id: "(\w+)", say: "([^"]+)"[^}]*?(?:after: \[([^\]]*)\])?\s*\}/g)].map((m) => ({ id: m[1], say: m[2], after: (m[3] ?? "").split(",").map((x) => x.trim().replace(/"/g, "")).filter(Boolean) }));
    if (decl.length !== R.events.length || decl.some((d, k) => d.say !== R.events[k])) throw new Error("orders: the spike's events are not the ones its run printed");
    const valid = (order) => new Set(order).size === decl.length && order.every((e, pos) => decl[e].after.every((id) => order.indexOf(decl.findIndex((d) => d.id === id)) < pos));
    const idx = ex.map((e) => R.events.indexOf(e.name)), rest = R.events.map((_, k) => k).filter((k) => !idx.includes(k));
    const home = R.events.map((_, k) => k), early = [2, 0, 6, 3, 1, 4, 7, 5], shown = [...idx, ...rest];
    [home, early, shown].forEach((o) => { if (!valid(o)) throw new Error("orders: an order drawn here is not one the spike could play: " + o); });
    const place = (order, t, dur = 0.7) => order.forEach((e, pos) => s.tl.to(cells[e], { x: (pos - e) * STEP, duration: dur, ease: "power2.inOut" }, t + pos * 0.03));
    idx.forEach((e, pos) => gsap.set(cells[e], { x: (pos - e) * STEP }));
    const cell = (j) => cells[idx[j]], bal = (j) => cell(j).querySelector(".bal"), show = (el, t) => s.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, t);

    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    s.fromTo("#or-term", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, s.start + 0.5); s.fromTo(".scale, .track", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, s.start + 0.5);
    // b1: money came in, some of it left, and the provider took the payment back.
    s.in(".ask", c("b1", "question"), { x: 14, y: 0 });
    [[0, c("b1", "Money")], [1, c("b1", "came")], [2, c("b1", "some")], [3, c("b1", "provider")]].forEach(([j, t]) => { show(cell(j), t); if (j < 3) show(bal(j), t + 0.25); });
    s.in(".rowlab", c("b1", "came"), { y: 0 });
    // b2: no wallet, no provider: a small ledger, and eight events.
    const t2 = c("b2");
    s.out(".ask", t2 - 0.3, { dur: 0.3 }); s.in(".n1", c("b2", "no wallet"), { y: 10 }); s.in(".n2", c("b2", "no provider"), { y: 10 });
    const rows = s.$$("#or-term .o"), row = (words) => Loc.rows(s, "#or-term", words)[0];
    // The prompt waits from the start of the sheet; the command is typed when the ledger is named.
    const cmd = s.$("#or-term .typed"), typeDur = Math.max(0.6, c("b2", "plays") - c("b2", "keeps") - 0.2), typed = c("b2", "keeps") + typeDur;
    s.fromTo("#or-term .cmd", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, s.start + 0.7); s.fromTo(cmd, { width: "0ch" }, { width: cmd.textContent.length + "ch", duration: typeDur, ease: `steps(${cmd.textContent.length})` }, c("b2", "keeps"));
    const rQ = row(/^question:/), rP = row(/^played:/), rE = rows[rows.indexOf(rP) + 1], rEarly = row(/the reversal comes before A clears/), rLate = row(/the reversal is late/), rGone = row(/cannot cover it$/);
    Loc.print(s, [rQ], typed + 0.15); Loc.print(s, [rP, rE], c("b2", "eight"));
    const spread = c("b2", "eight");
    s.out(".nots, .rowlab", spread - 0.35, { dur: 0.3 }); s.tl.to([0, 1, 2].map(bal), { autoAlpha: 0, duration: 0.3 }, spread - 0.3);
    place(home, spread); rest.forEach((e, k) => show(cells[e], spread + 0.35 + k * 0.1));
    place(early, c("b2", "every order")); place(shown, c("b2", "happen") + 0.15);
    // b3: how many orders that is.
    Loc.lit(s, "#or-term", [rP], c("b3")); s.to(Loc.mark(rP, R.total + " orders"), { backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, c("b3") + 0.1);
    show(".seg.all", c("b3")); s.in(".num.total", c("b3"), { y: 10 }); s.out(".track", c("b3"), { dur: 0.3 });
    // b4: two thirds are safe.
    Loc.print(s, [rEarly], c("b4") + 0.1); Loc.lit(s, "#or-term", [rEarly], c("b4", "two")); s.in(".num.early", c("b4", "two"), { y: 10 });
    // b5: the late ones, and the ones that cannot be covered.
    Loc.print(s, [rLate], c("b5")); Loc.lit(s, "#or-term", [rLate], c("b5", "840")); show(".seg.late", c("b5", "840")); s.in(".num.late", c("b5", "840"), { y: 10 });
    Loc.print(s, [rGone], c("b5", "And")); Loc.lit(s, "#or-term", [rGone], c("b5", "225")); show(".seg.gone", c("b5", "225")); s.in(".num.gone", c("b5", "225"), { y: 10 });
    // The strip again, in the order the run printed as its example: the balance under each event, and where it ends.
    rest.forEach((e) => s.tl.to(cells[e], { opacity: 0.35, duration: 0.4 }, c("b5", "holder")));
    [0, 1, 2].forEach((j) => show(bal(j), c("b5", "holder") + j * 0.2));
    s.tl.fromTo(bal(3), { autoAlpha: 0, scale: 1.5 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, c("b5", "cannot"));
    s.tl.to(cell(3), { borderColor: "#62c6ff", duration: 0.3 }, c("b5", "cannot"));
  },
});
