// Sheet 1. The budget is already written down: the line of get.ts that carries it, then the proof's seven performance lines.
Film.scene("budget", {
  step: "budget",
  html: (D) => {
    const get = D.src["blueprint/things/profile/verbs/get.ts"], at = Kit.line(get, /^\s*budget: \{ p95: "\d+ millis" \},$/);
    const ms = +/"(\d+) millis"/.exec(get.split("\n")[at - 1])[1];
    Loc.says(ms, 150, "profile.get's budget");
    const perf = D.cap["watch-prove"].out.split("\n").map((l) => /^(\S+) performance ✔ p50 \d+ms p95 (\d+)ms budget p95 (\d+)ms$/.exec(l)).filter(Boolean);
    Loc.need(perf.length === D.facts.operations.length, "the full run does not print one performance line for each operation");
    Loc.need(perf.find((m) => m[1] === "profile.get")?.[3] === String(ms), "the full run judges profile.get against another budget than get.ts");
    const from = Kit.line(get, /^export default Blueprint\.operation\(/);
    return `${Kit.css}${Loc.css("budget")}<style>
      #scene-budget .open { left: 96px; top: 300px; right: 96px; } #scene-budget .open .say { font-size: 58px; }
      #scene-budget .qs { left: 96px; top: 700px; display: flex; gap: 28px; } #scene-budget .qs .chip { font-family: var(--sans); font-size: 40px; padding: 18px 34px; border-color: var(--paper); color: var(--paper); }
      #scene-budget #bu-term .tag { color: var(--muted); }
    </style>
    <div class="head"><div class="eyebrow">The budget</div><div class="hl">A number you agreed to.</div></div>
    <div class="who">${Kit.who("you")}</div>
    <div class="abs open"><div class="say o1">Plugged In is running. People are calling it.</div><div class="say mu o2 hidden0" style="margin-top:24px">No journeys run against those calls.</div></div>
    <div class="abs qs"><span class="chip q1 hidden0">Is it healthy?</span><span class="chip q2 hidden0">What changed this week?</span></div>
    ${Kit.ed(D, { id: "bu-ed", file: "blueprint/things/profile/verbs/get.ts", x: 96, y: 262, w: 1728, from, size: "small", cls: "hidden0", tag: '<span class="tag">declared</span>' })}
    ${Kit.term(D, { id: "bu-term", cap: "watch-prove", x: 96, y: 640, w: 1728, h: 320, size: 19, cls: "hidden0", keep: (l) => / performance ✔ /.test(l), tag: `<span class="tag">${perf.length} of the full run's lines</span>` })}`;
  },
  build(s) {
    const c = s.cue, get = s.D.src["blueprint/things/profile/verbs/get.ts"], at = Kit.line(get, /^\s*budget: \{ p95: "\d+ millis" \},$/), op = Kit.line(get, /^export default Blueprint\.operation\(/);
    const body = s.$("#bu-ed .code"), rows = s.$$("#bu-term .o"), pg = Loc.rows(s, "#bu-term", /^profile\.get performance /);
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // a1, a2: the situation, and the question that changes.
    s.in(".o1", s.start + 0.6, { y: 14 }); s.in(".o2", c("a1", "Nobody"), { y: 10 });
    s.in(".q1", c("a2", "healthy"), { y: 12 }); s.in(".q2", c("a2", "changed"), { y: 12 });
    // a3: the budget is already written down.
    const t3 = c("a3");
    s.out(".open, .qs", t3 - 0.35, { dur: 0.3 }); s.in("#bu-ed", t3 + 0.1, { y: 14 });
    s.focus(body, [op, op], c("a3", "operation")); s.in(Kit.call(s, body, op, "an operation"), c("a3", "operation") + 0.05, { x: 14, y: 0, dur: 0.3 });
    s.focus(body, [at, at], c("a3", "budget")); s.in(Kit.call(s, body, at, "its budget"), c("a3", "budget") + 0.05, { x: 14, y: 0, dur: 0.3 });
    const num = (() => { const w = document.createTreeWalker(body.querySelector(`.ln[data-n="${at}"]`), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const k = n.nodeValue.indexOf("150 millis"); if (k >= 0) { const h = n.splitText(k); h.splitText(10); const sp = document.createElement("span"); sp.className = "hit"; h.parentNode.replaceChild(sp, h); sp.appendChild(h); return sp; } } throw new Error("budget: get.ts lost its 150 millis"); })();
    s.to(num, { backgroundColor: "rgba(98,198,255,.3)", color: "#e9f0fa", duration: 0.3 }, c("a3", "150"));
    // a4: a full run prints a line for each operation, with its budget.
    s.in("#bu-term", c("a4", "full") - 0.3, { y: 12, dur: 0.35 }); Loc.type(s, s.$("#bu-term"), c("a4", "full"), 0.35);
    Loc.print(s, rows, c("a4", "line"), 0.12);
    Loc.lit(s, "#bu-term", pg, c("a4", "budget")); s.in(Loc.label(pg[0], "same number"), c("a4", "budget") + 0.05, { x: 14, y: 0, dur: 0.3 });
    // a5: but those are the journeys' own calls.
    const own = Loc.label(rows[0], "the journeys' own calls");
    s.out(s.$$("#bu-term .tlab"), c("a5") - 0.1, { dur: 0.2 }); Loc.lit(s, "#bu-term", [], c("a5"));
    s.in(own, c("a5", "own"), { x: 14, y: 0, dur: 0.3 });
    s.to(rows, { opacity: 0.45, duration: 0.5 }, c("a5", "nothing"));
    s.to("#bu-ed", { opacity: 0.6, duration: 0.5 }, c("a5", "nothing"));
  },
});
