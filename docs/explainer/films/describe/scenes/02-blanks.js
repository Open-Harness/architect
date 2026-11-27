// Sheet 2. `ortho check`, replayed down to its seventh blank; each printed line becomes one row of the list of questions under
// its number. Then the model's own lines for the wallet: no states, and what is unfinished.
Film.scene("blanks", {
  step: "blanks",
  html: (D) => {
    const b = Loc.blanks(D, "describe-0-check"), open = D.cap["describe-0-open-ts"].path, model = D.cap["describe-0-model"].out.split("\n");
    Loc.spoken(D, "b2", /has (\w+) blanks/i, b.count);
    Loc.spoken(D, "b3", /(\w+) about opening/i, b.rows.filter((a) => a.file === open).length);
    const undone = model.map((l) => /^unfinished \S+  (\d+) blanks?$/.exec(l)).filter(Boolean), listed = model.find((l) => new RegExp(`^thing ${b.thing} \\(\\)  `).test(l));
    if (!listed) throw new Error("blanks: the model no longer lists the wallet with no states");
    Loc.spoken(D, "b4", /(\w+) lines say what is unfinished/i, undone.length);
    if (undone.reduce((n, m) => n + +m[1], 0) !== b.count) throw new Error("blanks: the model's unfinished lines do not add up to the check's count");
    return `${Kit.css}${Loc.css("blanks")}<style>
      #scene-blanks #bl-model .screen { font-size: 24px; line-height: 40px; }
      #scene-blanks .sum { left: 1290px; top: 392px; font-family: var(--mono); font-size: 64px; font-weight: 500; letter-spacing: -.02em; white-space: nowrap; } #scene-blanks .sum span { color: var(--muted); }
      #scene-blanks #bl-check .tag { color: var(--muted); }
    </style>
    <div class="head"><div class="eyebrow">Blanks</div><div class="hl">Every blank is a question, with an address.</div></div>
    ${Loc.who("designer", "the designer")}
    ${Kit.term(D, { id: "bl-check", cap: "describe-0-check", x: 96, y: 262, w: 1728, h: 356, size: 19, keep: (l, k) => k < b.lines, tag: `<span class="tag">its first ${b.lines} lines</span>` })}
    ${Kit.term(D, { id: "bl-model", cap: "describe-0-model", x: 96, y: 300, w: 1140, h: 262, cls: "hidden0", keep: (l) => l === listed || /^unfinished /.test(l), tag: `<span class="tag">${1 + undone.length} of its ${model.length} lines</span>` })}
    <div class="abs sum hidden0">${undone.map((m) => m[1]).join("<span> + </span>")}<span> = </span>${b.count}</div>
    ${Loc.band(D, "describe-0-check")}`;
  },
  build(s) {
    const c = s.cue, b = Loc.blanks(s.D, "describe-0-check"), A = s.$("#bl-check"), M = s.$("#bl-model"), out = s.$$("#bl-check .o"), head = out[0], lines = out.slice(1), list = s.$$(".band .brow");
    if (lines.length !== list.length) throw new Error("blanks: the terminal and the list do not hold the same blanks");
    const file = lines.map((o) => Loc.mark(o, /blueprint\/[\w./-]+/)), num = lines.map((o) => Loc.mark(o, /^:\d+/)), ask = lines.map((o, k) => Loc.mark(o, b.rows[k].ask));
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // b1: run the check.
    s.in(A, s.start + 0.4, { y: 14 });
    const typed = Loc.type(s, A, c("b1", "run"), Math.max(0.5, c("b1", "$") - 0.15 - c("b1", "run")));
    Loc.print(s, out, typed + 0.2, 0.06);
    // b2: seven. Each one is a line: a file, a line number, the question.
    s.tl.set(list, { autoAlpha: 0 }, 0); s.tl.set(s.$$(".band .addr, .band .ask"), { opacity: 0.55 }, 0);
    Loc.lit(s, "#bl-check", [head], c("b2", "seven")); s.in(".band", c("b2", "seven"), { y: 14 });
    s.tl.fromTo(s.$(".band .cnt"), { scale: 1.5 }, { scale: 1, duration: 0.4, ease: "back.out(2)" }, c("b2", "seven") + 0.1);
    const each = c("b2", "Each"), step = 0.13;
    Loc.lit(s, "#bl-check", [], each - 0.05, 0.2);
    lines.forEach((o, k) => { s.tl.to(o, { backgroundColor: "rgba(98,198,255,.2)", color: "#e9f0fa", duration: 0.12, yoyo: true, repeat: 1 }, each + k * step); s.tl.fromTo(list[k], { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.3 }, each + k * step + 0.06); });
    const part = (marks, sel, word, last) => { const t = c("b2", word); s.tl.to(marks, { backgroundColor: "rgba(98,198,255,.28)", color: "#e9f0fa", duration: 0.25 }, t); s.tl.to(s.$$(".band " + sel), { opacity: 1, duration: 0.25 }, t); if (!last) s.tl.to(marks, { backgroundColor: "rgba(98,198,255,0)", duration: 0.25 }, t + 0.65); };
    part(file, ".addr", "file"); s.tl.to(num, { backgroundColor: "rgba(98,198,255,.28)", color: "#e9f0fa", duration: 0.25 }, c("b2", "line number")); s.tl.to(num, { backgroundColor: "rgba(98,198,255,0)", duration: 0.25 }, c("b2", "the question"));
    part(ask, ".ask", "the question", true); s.tl.to(ask, { backgroundColor: "rgba(98,198,255,0)", duration: 0.3 }, c("b3") - 0.1);
    // b3: the seven, by what they ask.
    const pair = (re) => { const k = b.rows.map((a, i) => (re.test(a.file + " " + a.ask) ? i : -1)).filter((i) => i >= 0); if (!k.length) throw new Error("blanks: no blank matches " + re); return { top: k.map((i) => lines[i]), low: k.map((i) => list[i]) }; };
    [["What", /what a wallet is/], ["states", /the states a wallet can be in/], ["who", /holds this role/], ["for about", /verbs\/open\.ts/]].forEach(([word, re]) => { const p = pair(re), t = c("b3", word); Loc.lit(s, "#bl-check", [head, ...p.top], t, 0.25); Loc.only(s, p.low, t, 0.25); });
    // b4: the model says it shorter.
    const t4 = c("b4"), rows = s.$$("#bl-model .o");
    Loc.only(s, [], t4 - 0.2); s.out(A, t4 - 0.35, { dur: 0.3 }); s.in(M, t4, { y: 14 });
    const typedM = Loc.type(s, M, c("b4", "model") - 0.1, 0.45);
    Loc.print(s, rows, Math.max(typedM + 0.15, c("b4", "shorter") - 0.2), 0.12);
    const empty = Loc.mark(rows[0], "()");
    Loc.lit(s, "#bl-model", [rows[0]], c("b4", "listed")); s.tl.to(empty, { backgroundColor: "rgba(98,198,255,.32)", duration: 0.3 }, c("b4", "no states")); s.in(Loc.label(rows[0], "no states yet"), c("b4", "no states"), { x: 14, y: 0, dur: 0.3 });
    Loc.lit(s, "#bl-model", rows.slice(1), c("b4", "two lines")); s.in(".sum", c("b4", "unfinished"), { x: 14, y: 0 }); Loc.pulse(s, c("b4", "unfinished") + 0.3);
  },
});
