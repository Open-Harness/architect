// Sheet 3. The ledger strip played three times, once for each way of mirroring a late reversal, each from the example the run
// printed for it, with that way's lines of the recording printed below. Below zero is a number here, not a verdict.
Film.scene("rules", {
  step: "rules",
  html: (D) => {
    const R = Loc.run(D), ways = R.ways, cols = ways[0].example.map((e) => e.name);
    if (ways.length !== 3) throw new Error("rules: the recording does not hold three ways");
    Loc.said(D, "c1", ways.length);
    const [at, refuse, part] = ways, end = (w) => w.example[w.example.length - 1], broke = (w) => w.rules.filter((r) => !r.kept);
    // What the narration says of each way must be what the recording printed for it.
    const paid = /^pay A (\d+)$/.exec(at.example[0].name), took = /^withdraw (\d+)$/.exec(at.example[2].name);
    if (!paid || !took || +end(at).bal >= 0) throw new Error("rules: the first example is no longer a payment, a withdrawal and a balance below zero");
    Loc.said(D, "c2", +paid[1]); Loc.said(D, "c2", +took[1]); Loc.said(D, "c2", -end(at).bal);
    if (broke(at).length !== 1 || !/below zero/.test(broke(at)[0].rule)) throw new Error("rules: mirrored at once no longer breaks only the balance rule");
    if (broke(refuse).length !== 1 || broke(refuse)[0].n !== R.late || !/agree$/.test(broke(refuse)[0].rule) || +end(refuse).bal <= 0) throw new Error("rules: refusing no longer disagrees with the provider in every late order");
    if (broke(part).length !== 2 || +end(part).bal !== 0 || !part.rules.some((r) => r.kept && r.n === R.late && /below zero/.test(r.rule))) throw new Error("rules: the shortfall no longer keeps the balance and breaks two rules");
    Loc.said(D, "c5", broke(part).length);
    const short = /^  the shortfall: in (\d+) orders, (\d+) at most, and still owed at the end in (\d+)$/.exec(part.lines[part.lines.length - 1]); if (!short) throw new Error("rules: the recording has no shortfall line");
    Loc.said(D, "c5", +short[3]);
    // What the third way writes down in its example is what the first way took the balance below zero by.
    const rest = +end(part).bal - +end(at).bal;
    const rules = [...new Set(at.rules.map((r) => r.rule))];
    // Each terminal shows one way's own lines. The third way prints its example twice, word for word; the second is left out.
    const twice = part.lines.map((l, k) => (/^    for example:/.test(l) ? k : -1)).filter((k) => k >= 0); if (twice.length !== 2 || part.lines[twice[0]] !== part.lines[twice[1]]) throw new Error("rules: the third way's examples are no longer the same line twice");
    const keep = (w, skip) => (l, k) => k >= w.from && k <= w.to && k !== skip;
    const lane = (w, k, note) => `<div class="lane lane${k}" style="top:${262 + k * 114}px"><div class="way hidden0"><b>${k + 1}</b><span>${Film.esc(w.name)}</span></div>${Loc.strip(w.example, { cols, at: "left:330px;top:0" })}<div class="found hidden0">${note}</div></div>`;
    return `${Kit.css}${Loc.css("rules")}<style>
      #scene-rules .lane { position: absolute; left: 96px; width: 1728px; height: 108px; }
      #scene-rules .way { position: absolute; left: 0; top: 0; width: 310px; height: 111px; display: flex; gap: 14px; align-items: center; padding: 0 16px; border: 1.5px solid var(--rule2); font-size: 23px; line-height: 1.18; color: var(--text2); }
      #scene-rules .way b { font-family: var(--mono); font-size: 34px; font-weight: 500; color: var(--muted); }
      #scene-rules .strip .cell { visibility: hidden; opacity: 0; } #scene-rules .strip .cell .bal { visibility: hidden; opacity: 0; }
      #scene-rules .found { position: absolute; left: 1316px; top: 0; width: 412px; height: 111px; display: flex; flex-direction: column; justify-content: center; font-size: 24px; line-height: 1.25; color: var(--text2); }
      #scene-rules .found b { display: block; font-size: 32px; font-weight: 500; color: var(--paper); } #scene-rules .found .more { visibility: hidden; opacity: 0; }
      #scene-rules .rulebox { left: 96px; top: 612px; width: 1728px; height: 366px; padding: 26px 34px; } #scene-rules .rulebox .rule { font-size: 30px; line-height: 1.25; margin-top: 22px; display: flex; gap: 20px; } #scene-rules .rulebox .rule i { font-style: normal; color: var(--muted); font-family: var(--mono); }
      #scene-rules .kterm .o.ex { color: var(--muted); }
    </style>
    <div class="head"><div class="eyebrow">Three ways to mirror it</div><div class="hl">Each way breaks a different rule.</div></div>
    <div class="who">${Kit.who("agent", "the spike")}</div>
    ${lane(at, 0, `<b>below zero</b><span>in ${broke(at)[0].n} of ${broke(at)[0].of} late orders</span>`)}
    ${lane(refuse, 1, `<b>above zero, and untrue</b><span>the provider disagrees, ${broke(refuse)[0].n} of ${broke(refuse)[0].of}</span>`)}
    ${lane(part, 2, `<b>zero, and a shortfall of ${rest}</b><span class="more">still owed at the end in ${short[3]} orders</span>`)}
    <div class="panel rulebox hidden0"><div class="lbl">held to ${rules.length} rules taken from the plan page</div>${rules.map((r, k) => `<div class="rule"><i>${k + 1}</i><span>${Film.esc(r)}</span></div>`).join("")}</div>
    ${ways.map((w, k) => Kit.term(D, { id: "ru-t" + k, cap: "spike-run", x: 96, y: 612, w: 1728, h: 366, title: "orthograph", cls: "hidden0" + (k ? " again" : ""), tag: `<span class="tag">the same run · way ${k + 1} of ${ways.length}</span>`, keep: keep(w, k === 2 ? w.from + 1 + twice[1] : -1) })).join("")}`;
  },
  build(s) {
    const c = s.cue, lane = (k) => s.$(".lane" + k), cells = (k) => [...lane(k).querySelectorAll(".cell")], real = (k) => cells(k).filter((x) => !x.classList.contains("none"));
    const T = (k) => "#ru-t" + k, row = (k, words) => Loc.rows(s, T(k), words)[0], all = (k) => s.$$(T(k) + " .o");
    const show = (el, t, dur = 0.3) => s.tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur }, t), bal = (cell) => cell.querySelector(".bal");
    const pop = (el, t) => s.tl.fromTo(el, { autoAlpha: 0, scale: 1.5 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, t);
    const on = (k, t) => { s.tl.to(lane(k).querySelector(".way"), { borderColor: "#e9f0fa", color: "#e9f0fa", duration: 0.3 }, t); s.tl.to(lane(k).querySelector(".way b"), { color: "#62c6ff", duration: 0.3 }, t); if (k) s.tl.to(lane(k - 1).querySelector(".way"), { borderColor: "rgba(132,170,222,.36)", color: "#a9bcd6", duration: 0.3 }, t); };
    const swap = (k, t) => { if (k) s.out(T(k - 1), t - 0.3, { dur: 0.25 }); s.in(T(k), t - 0.05, { y: 10, dur: 0.3 }); };
    s.$$(".kterm .o").forEach((o) => { if (/^\s+for example:/.test(o.textContent)) o.classList.add("ex"); });

    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // c1: three ways, each held to the page's rules.
    s.in(".way", c("c1", "three"), { x: -12, y: 0, stagger: 0.25 }); s.in(".rulebox", c("c1", "holds"), { y: 14 });
    s.fromTo(".rulebox .rule", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.3 }, c("c1", "rules"));
    // c2: mirror it at once. The strip is played, and ends below zero.
    const t2 = c("c2"), a = real(0);
    s.out(".rulebox", t2 - 0.3, { dur: 0.25 }); swap(0, t2); on(0, t2);
    Loc.type(s, s.$(T(0)), t2, 0.5); Loc.print(s, [all(0)[0]], t2 + 0.6);
    [[0, "payment"], [1, "clears"], [2, "withdraws"], [3, "reverses"]].forEach(([j, w]) => { show(a[j], c("c2", w)); if (j < 3) show(bal(a[j]), c("c2", w) + 0.2); });
    const tm = c("c2", "minus"), b0 = row(0, /^  broken in /), e0 = row(0, /^    for example:/);
    pop(bal(a[3]), tm); s.tl.to(a[3], { borderColor: "#62c6ff", duration: 0.3 }, tm); s.in(lane(0).querySelector(".found"), tm + 0.2, { x: 12, y: 0 });
    Loc.print(s, all(0).slice(1), c("c2", "balance"), 0.08); Loc.lit(s, T(0), [b0, e0], tm);
    // c3: refuse to mirror it. The balance stays, and the provider disagrees.
    const t3 = c("c3"), b = real(1), none = cells(1).filter((x) => x.classList.contains("none"));
    swap(1, t3); on(1, t3); Loc.typedAlready(s, s.$(T(1)), t3); Loc.print(s, [all(1)[0]], t3 + 0.1);
    b.forEach((x, j) => { show(x, c("c3", "Refuse") + 0.2 + j * 0.2); show(bal(x), c("c3", "Refuse") + 0.4 + j * 0.2); }); s.tl.fromTo(none, { autoAlpha: 0 }, { autoAlpha: 0.5, duration: 0.3 }, c("c3", "Refuse") + 0.4);
    const keptZero = row(1, /^  kept in all \d+: a balance never goes below zero$/), b1 = row(1, /^  broken in /), e1 = row(1, /^    for example:/);
    Loc.print(s, all(1).slice(1, 3), c("c3", "balance")); Loc.lit(s, T(1), [keptZero], c("c3", "stays")); s.tl.to(b[b.length - 1], { borderColor: "#62c6ff", duration: 0.3 }, c("c3", "stays"));
    s.in(lane(1).querySelector(".found b"), c("c3", "stops"), { x: 12, y: 0 }); s.tl.set(lane(1).querySelector(".found"), { autoAlpha: 1 }, c("c3", "stops") - 0.05); show(lane(1).querySelector(".found span"), c("c3", "disagree"));
    Loc.print(s, all(1).slice(3), c("c3", "app") - 0.1); Loc.lit(s, T(1), [b1, e1], c("c3", "disagree"));
    s.to(Loc.mark(b1, b1.textContent.match(/\d+ of \d+/)[0]), { backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, c("c3", "every"));
    // c4: take what is there, and write the rest down. The balance holds.
    const t4 = c("c4"), d = real(2);
    swap(2, t4); on(2, t4); Loc.typedAlready(s, s.$(T(2)), t4); Loc.print(s, [all(2)[0]], t4 + 0.1);
    d.forEach((x, j) => { show(x, c("c4", "take") + 0.2 + j * 0.2); if (j < d.length - 1) show(bal(x), c("c4", "take") + 0.4 + j * 0.2); });
    pop(bal(d[d.length - 1]), c("c4", "shortfall")); s.tl.to(d[d.length - 1], { borderColor: "#62c6ff", duration: 0.3 }, c("c4", "shortfall")); s.in(lane(2).querySelector(".found"), c("c4", "shortfall") + 0.1, { x: 12, y: 0 });
    const keptHere = row(2, /^  kept in all \d+: a balance never goes below zero$/), brokeHere = Loc.rows(s, T(2), /^  broken in /), e2 = row(2, /^    for example:/), counted = row(2, /with the shortfall counted$/), owed = row(2, /^  the shortfall: /);
    Loc.print(s, [keptHere], c("c4", "balance")); Loc.lit(s, T(2), [keptHere], c("c4", "holds"));
    // c5: two rules break as written; counted in them, they hold; and somebody is still owed.
    Loc.print(s, [brokeHere[0], e2, brokeHere[1]], c("c5") + 0.1, 0.12); Loc.lit(s, T(2), brokeHere, c("c5", "two"));
    Loc.print(s, [counted], c("c5", "until")); Loc.lit(s, T(2), [counted], c("c5", "counted"));
    Loc.print(s, [owed], c("c5", "And")); Loc.lit(s, T(2), [owed], c("c5", "150"));
    s.to(Loc.mark(owed, owed.textContent.match(/still owed at the end in \d+$/)[0]), { backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, c("c5", "150") + 0.1);
    show(lane(2).querySelector(".found .more"), c("c5", "150") + 0.15);
  },
});
