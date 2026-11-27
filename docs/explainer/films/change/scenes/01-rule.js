// Sheet 1. You decide; your agent runs the whole proof, and the seven dots go green from the record it keeps; the designer
// takes the rule out of the blueprint, and the diff is replayed as it was recorded.
Film.scene("rule", {
  step: "rule",
  html: (D) => {
    const ops = Chg.ops(D), file = "blueprint/things/handle/invariants.ts", src = D.src[file];
    Chg.need(ops.length, 7, "a3 seven operations");
    const from = Kit.line(src, /^\/\/ A person holds one claimed name/), to = src.split("\n").findIndex((l, k) => k + 1 > from && /^\}\);$/.test(l)) + 1;
    if (!to) throw new Error("rule: the rule has no end");
    const prove = D.cap["prove"].out.split("\n");
    if (!/^prove ✔$/.test(prove[prove.length - 1])) throw new Error("rule: the full proof does not end with prove ✔");
    // The diff, as recorded: one file, the rule's lines out, and the import only it used.
    const diff = D.cap["change-diff"].out.split("\n"), meta = (l) => /^(diff --git|index |--- |\+\+\+ )/.test(l);
    const files = Chg.need(diff.filter((l) => l.startsWith("diff --git")).length, 1, "a4 no other file");
    const ruleOut = diff.filter((l) => /^-/.test(l) && !meta(l) && l !== "-" && !/^-import /.test(l));
    Chg.need(ruleOut.length, 6, "a4 six lines");
    if (!ruleOut.some((l) => l.includes("oneNamePerPerson"))) throw new Error("rule: the diff does not take out oneNamePerPerson");
    const counts = { proven: `proven ${Chg.says(ops)}` };
    return `${Kit.css}${Chg.css("rule")}<style>
      #scene-rule .decide { left: 96px; top: 290px; width: 820px; } #scene-rule .decide .kbig { font-size: 52px; line-height: 1.15; margin-top: 14px; }
      #scene-rule .lean { left: 96px; top: 560px; width: 820px; }
      #scene-rule #ru-ed .tag { color: var(--paper); }
      #scene-rule .rec { left: 1250px; top: 330px; width: 574px; } #scene-rule .rec .kbig { margin-top: 10px; }
      #scene-rule .rec .down { margin-top: 30px; font-size: 54px; color: var(--muted); line-height: 1; }
      #scene-rule #ru-diff .screen { line-height: 26px !important; padding: 12px 22px; }
      #scene-rule #ru-diff .o { color: var(--muted); } #scene-rule #ru-diff .o.chg { color: var(--paper); }
      #scene-rule #ru-diff .o .strike { position: absolute; left: 1ch; height: 2px; top: 52%; background: var(--paper); transform-origin: 0 50%; }
      #scene-rule #ru-diff .tag { color: var(--paper); }
      #scene-rule .youread { left: 1290px; top: 560px; width: 520px; } #scene-rule .youread .say { margin-top: 16px; font-size: 40px; }
    </style>
    <div class="head"><div class="eyebrow">Months later</div><div class="hl">One rule goes.</div></div>
    ${Chg.who([["you", "you"], ["agent", "your agent"], ["designer", "the designer"]])}
    <div class="abs decide hidden0"><div class="lbl">your decision</div><div class="kbig">A person may hold more than one name.</div></div>
    <div class="abs lean hidden0"><div class="say mu">One rule. What was leaning on it?</div></div>
    ${Kit.ed(D, { id: "ru-ed", file, x: 1000, y: 290, w: 824, from, to, size: "small", cls: "hidden0", tag: '<span class="tag">the rule</span>' })}
    ${Kit.term(D, { id: "ru-prove", cap: "prove", x: 96, y: 262, w: 1080, h: 380, size: 20, cls: "hidden0", tag: '<span class="tag">the app as it stands</span>', keep: (l) => l.startsWith("journey ") || /^prove /.test(l) })}
    <div class="abs rec hidden0"><div class="lbl cy">what each passing operation rested on</div><div class="kbig">The record the change is measured from.</div><div class="down">↓</div></div>
    ${Kit.term(D, { id: "ru-diff", cap: "change-diff", x: 96, y: 262, w: 1728, h: 588, size: 19, cls: "hidden0", title: "examples/plugged-in", keep: (l) => !meta(l), tag: `<span class="tag onefile hidden0">${files} file</span>` })}
    <div class="abs youread hidden0">${Kit.who("you")}<div class="say">This is the part you read.</div></div>
    ${Chg.band(D, "blank", counts)}`;
  },
  build(s) {
    const c = s.cue, body = s.$("#ru-ed .code");
    s.in(".head", s.start + 0.3);
    s.in(".band", s.start + 0.5, { y: 10 });
    // a1: your decision.
    Chg.act(s, 0, c("a1", "decided")); s.in(".decide", c("a1", "decided"), { y: 14 });
    // a2: one rule, and what leaned on it.
    s.in("#ru-ed", c("a2", "one rule"), { y: 14 }); s.focus(body, null, c("a2", "one rule"));
    s.in(Kit.call(s, body, +body.querySelector(".ln").dataset.n, "oneNamePerPerson"), c("a2", "one rule") + 0.2, { x: 14, y: 0, dur: 0.35 });
    s.in(".lean", c("a2", "leaning"), { y: 10 });
    // a3: your agent runs the whole proof; the seven go green from its record.
    const t3 = c("a3");
    s.out(".decide, .lean, #ru-ed", t3 - 0.3, { dur: 0.3 });
    Chg.act(s, 1, c("a3", "your agent")); s.in("#ru-prove", c("a3", "runs"), { y: 14 });
    const typed = Chg.type(s, s.$("#ru-prove"), c("a3", "runs") + 0.1, 0.4);
    Chg.print(s, s.$$("#ru-prove .o"), Math.max(typed + 0.2, c("a3", "proof")), 0.1);
    Chg.lit(s, "#ru-prove", Chg.rows(s, "#ru-prove", /^prove ✔$/), c("a3", "all proven"));
    Chg.turn(s, "proven", c("a3", "Seven"), 0.08);
    s.in(".rec", c("a3", "record"), { x: 14, y: 0 });
    // a4: the designer takes the rule out; the diff, as recorded.
    const t4 = c("a4");
    s.out("#ru-prove, .rec", t4 - 0.35, { dur: 0.3 });
    Chg.act(s, 2, c("a4", "designer")); s.in("#ru-diff", c("a4", "designer"), { y: 14 });
    const rows = s.$$("#ru-diff .o"), done = Chg.type(s, s.$("#ru-diff"), c("a4", "takes"), 0.9);
    rows.forEach((o) => { if (/^[-+]/.test(o.textContent)) o.classList.add("chg"); });
    Chg.print(s, rows, Math.max(done + 0.1, c("a4", "blueprint")), 0.04);
    const gone = rows.filter((o) => /^-/.test(o.textContent) && o.textContent !== "-" && !/^-import /.test(o.textContent));
    gone.forEach((o, k) => { const bar = document.createElement("i"); bar.className = "strike"; bar.style.width = o.textContent.length - 1 + "ch"; o.style.position = "relative"; o.appendChild(bar); s.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "power2.inOut" }, c("a4", "six") + k * 0.07); });
    s.in(Chg.label(gone[0], `${gone.length} lines out`), c("a4", "six") + 0.1, { x: 14, y: 0, dur: 0.35 });
    s.in(".onefile", c("a4", "other file"), { y: 0, scale: 1.3 });
    s.in(".youread", c("a4", "part you read"), { x: 14, y: 0 });
  },
});
