// Sheet 4. Rung two: one line makes the move, the journey goes green, and prove is still red until the whole proof runs.
Film.scene("green", {
  step: "green",
  html: (D) => {
    const h = Loc.handler(D, 2), move = Kit.line(h.text, /^\s*yield\* move\(\);$/), ret = Kit.line(h.text, /^\s*return \{ handle: id \};/);
    const full = D.cap["prove"].out.split("\n"), evals = full.map((l) => /^\S+ (\d+) evals ✔/.exec(l)).filter(Boolean), journeys = D.facts.full.journeys, ops = D.facts.operations.length;
    if (evals.length !== ops || new Set(evals.map((m) => m[1])).size !== 1) throw new Error("green: the full run does not show one evals line for each operation");
    if (!/^prove ✔$/.test(full[full.length - 1])) throw new Error("green: the full run does not end with prove ✔");
    const steps = journeys.reduce((n, j) => n + j.steps, 0);
    return `${Kit.css}${Loc.css("green")}<style>
      #scene-green .counts { left: 1140px; top: 262px; width: 684px; } #scene-green .count { display: flex; align-items: baseline; gap: 18px; height: 88px; border-bottom: 1px solid var(--rule); }
      #scene-green .count b { font-size: 64px; font-weight: 500; line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; min-width: 150px; } #scene-green .count span { font-size: 24px; }
      #scene-green .verdict { left: 600px; top: 862px; font: 600 62px var(--mono); color: var(--green); border: 4px solid var(--green); padding: 6px 30px; transform: rotate(-5deg); background: rgba(8,17,31,.92); }
    </style>
    <div class="head"><div class="eyebrow">Rung two</div><div class="hl">Green on one journey is not done.</div></div>
    <div class="who">${Kit.who("builder", "the builder")}</div>${Loc.ladder(D, 2)}
    ${Kit.ed(D, { id: "gr-ed", text: h.text, path: h.path, x: 96, y: 262, w: 1728, from: move - 3, to: ret, cls: "one", tag: '<span class="tag">rung 2 · the move</span>' })}
    ${Kit.term(D, { id: "gr-term", cap: "climb-2-prove", x: 96, y: 600, w: 1728, h: 372, size: 19, cls: "hidden0 one", tag: '<span class="tag">rung 2 · the move</span>', keep: (l) => l.startsWith("journey ") || / coverage ✘ /.test(l) || /^prove /.test(l) })}
    ${Kit.term(D, { id: "gr-full", cap: "prove", x: 96, y: 262, w: 1000, h: 580, size: 19, cls: "hidden0", tag: '<span class="tag">the whole proof</span>', keep: (l) => l.startsWith("journey ") || /^\S+ \d+ evals ✔/.test(l) || /^prove /.test(l) })}
    <div class="abs counts"><div class="count c1 hidden0"><b>${journeys.length}</b><span class="lbl">journeys</span></div><div class="count c2 hidden0"><b>${steps}</b><span class="lbl">steps</span></div><div class="count c3 hidden0"><b>${evals[0][1]} × ${ops}</b><span class="lbl">evals × operations</span></div></div>
    ${Kit.term(D, { id: "gr-check", cap: "check", x: 1140, y: 566, w: 684, h: 300, size: 19, cls: "hidden0" })}
    <div class="abs verdict hidden0">${Film.esc(full[full.length - 1])}</div>`;
  },
  build(s) {
    const c = s.cue, h = Loc.handler(s.D, 2), move = Kit.line(h.text, /^\s*yield\* move\(\);$/), body = s.$("#gr-ed .code");
    s.in(".head", s.start + 0.3); s.in(".who, .ladder", s.start + 0.4, { y: 0 });
    // g1: one line.
    s.in("#gr-ed", s.start + 0.5, { y: 14 }); s.focus(body, [move - 1, move], c("g1", "make")); s.in(Kit.call(s, body, move, "make the move"), c("g1", "make") + 0.05, { x: 14, y: 0, dur: 0.3 });
    // g2: prove again. Eight of eight.
    const t2 = c("g2"), out = s.$$("#gr-term .o"), journey = out[0], last = out[out.length - 1], cover = Loc.rows(s, "#gr-term", " coverage ✘ ");
    if (!/^prove ✘ \d+ failing$/.test(last.textContent)) throw new Error("green: rung 2 does not end with prove failing");
    s.in("#gr-term", t2 - 0.35, { y: 12, dur: 0.35 }); Loc.type(s, s.$("#gr-term"), t2 - 0.1, Math.max(0.4, c("g2", "eight") - t2 - 0.1));
    Loc.print(s, [journey], c("g2", "eight")); Loc.light(s, 2, c("g2", "eight") + 0.2); s.to(".ladder .rung2", { borderColor: "#54d898", duration: 0.3 }, c("g2", "eight") + 0.5);
    // g3: but the last line is red.
    const t3 = c("g3");
    Loc.print(s, out.slice(1), t3 - 0.25, 0.06);
    Loc.lit(s, "#gr-term", [last], c("g3", "last line")); s.in(Loc.label(last, "the last line"), c("g3", "last line") + 0.05, { x: 14, y: 0, dur: 0.3 });
    const reach = Loc.label(cover[0], "one journey does not reach every operation"); s.in(reach, c("g3", "One journey"), { x: 14, y: 0, dur: 0.35 });
    Loc.lit(s, "#gr-term", [...cover, last], c("g3", "coverage"));
    Loc.lit(s, "#gr-term", [journey, last], c("g4", "Green"));
    // g4: the whole proof.
    const swap = c("g4", "builder");
    s.out(".one", swap - 0.35, { dur: 0.3 }); s.in("#gr-full", swap, { y: 14 });
    const all = s.$$("#gr-full .o"), js = all.filter((o) => o.textContent.startsWith("journey ")), ev = all.filter((o) => /^\S+ \d+ evals ✔/.test(o.textContent)), end = all[all.length - 1];
    Loc.type(s, s.$("#gr-full"), c("g4", "runs"), Math.max(0.4, c("g4", "$") - c("g4", "runs")));
    // g5: seven journeys, fifty-six steps, nine evals for each of seven operations.
    Loc.print(s, js, c("g5") - 0.1, 0.07); s.in(".c1", c("g5", "Seven"), { x: 14, y: 0, dur: 0.35 }); s.in(".c2", c("g5", "56"), { x: 14, y: 0, dur: 0.35 });
    Loc.print(s, ev, c("g5", "Nine") - 0.1, 0.07); s.in(".c3", c("g5", "Nine"), { x: 14, y: 0, dur: 0.35 });
    Loc.print(s, [end], c("g5", "Prove")); s.to(end, { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.13)", duration: 0.3 }, c("g5", "Prove") + 0.1);
    s.fromTo(".verdict", { autoAlpha: 0, scale: 1.7, rotate: -5 }, { autoAlpha: 1, scale: 1, rotate: -5, duration: 0.35, ease: "back.out(2)" }, c("g5", "Prove") + 0.15);
    const tc = c("g5", "then"), chk = s.$$("#gr-check .o");
    s.in("#gr-check", tc - 0.3, { y: 12, dur: 0.3 }); Loc.type(s, s.$("#gr-check"), tc - 0.1, 0.3); Loc.print(s, chk, tc + 0.3, 0.05);
    s.to(Loc.rows(s, "#gr-check", /^check ✔$/), { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.13)", duration: 0.3 }, c("g5", "check passes") + 0.35);
  },
});
