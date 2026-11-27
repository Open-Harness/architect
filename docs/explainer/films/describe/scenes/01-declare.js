// Sheet 1. The plan page, then the designer asks for the wallet and for wallet.open by name: two recorded commands, the eight
// files they wrote, and the one for the operation, its Blueprint.todo lines drawn as blanks.
Film.scene("declare", {
  step: "declare",
  html: (D) => {
    const plan = Loc.plan(D), thing = Loc.wrote(D, "describe-add-thing"), op = Loc.wrote(D, "describe-add-operation"), b = Loc.blanks(D, "describe-0-check");
    Loc.spoken(D, "a4", /(\w+) files for the thing, (\w+) for the operation/i, thing.length, op.length);
    const open = D.cap["describe-0-open-ts"]; if (!open || !op.includes(open.path)) throw new Error("declare: the recorded operation file is not the one ortho add wrote");
    const inFile = (path) => b.rows.filter((a) => a.file === path).length;
    if (open.text.split("\n").filter((l) => l.includes("Blueprint.todo(")).length !== inFile(open.path)) throw new Error("declare: the operation's blanks are not the ones the check lists");
    const tiles = [...thing, ...op].map((path) => ({ path, name: path.split("/").slice(-2).join("/"), blanks: inFile(path) }));
    if (tiles.reduce((n, a) => n + a.blanks, 0) !== b.count) throw new Error("declare: a blank sits outside the files ortho add wrote");
    const row = (cls, l) => `<div class="pl ${cls}">${Film.esc(l)}</div>`;
    return `${Kit.css}${Loc.css("declare")}<style>
      #scene-declare .plan { left: 96px; top: 262px; width: 1728px; } #scene-declare .plan .body { padding: 14px 22px 16px; font-family: var(--mono); font-size: 21px; line-height: 33px; color: var(--text2); }
      #scene-declare .plan .ph { color: var(--paper); font-weight: 500; margin-top: 12px; } #scene-declare .plan .ph:first-child { margin-top: 0; } #scene-declare .plan .tag { color: var(--muted); }
      #scene-declare .must { left: 96px; top: 842px; }
      #scene-declare #dc-ed .code.small { line-height: 30px; } #scene-declare #dc-add .tag, #scene-declare #dc-op .tag { color: var(--paper); }
      #scene-declare .frame8 { left: 760px; top: 672px; width: 1064px; } #scene-declare .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px; }
      #scene-declare .tile { height: 84px; padding: 10px 16px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); display: flex; flex-direction: column; justify-content: space-between; }
      #scene-declare .tile .nm { font-family: var(--mono); font-size: 21px; color: var(--paper); white-space: nowrap; } #scene-declare .tile .sq { display: flex; gap: 8px; height: 20px; }
      #scene-declare .none { left: 760px; top: 902px; } #scene-declare .none .say { font-size: 36px; }
      #scene-declare .legend { left: 96px; top: 806px; width: 640px; } #scene-declare .legend .row1 { display: flex; align-items: center; gap: 16px; font-size: 30px; font-weight: 500; } #scene-declare .legend .sub { margin-top: 10px; font-size: 26px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Declare</div><div class="hl">The page becomes a blueprint.</div></div>
    ${Loc.who("designer", "the designer")}
    <div class="panel plan" id="dc-plan"><div class="bar"><span class="dots"></span><span>docs/manual/captures/<b>plan-page.txt</b></span><span class="tag">the plan page</span></div>
      <div class="body">${row("ph idea", "The idea, said back")}${plan.idea.slice(0, 2).map((l) => row("idea", l)).join("")}${row("ph named hidden0", "Things")}${row("named hidden0", plan.wallet)}${row("ph doubt hidden0", "Doubts")}${plan.doubts.map((l) => row("doubt hidden0", l)).join("")}</div></div>
    <div class="abs must hidden0"><div class="say">What you haven't decided must not get decided on the way.</div></div>
    ${Kit.term(D, { id: "dc-add", cap: "describe-add-thing", x: 96, y: 262, w: 640, h: 350, cls: "hidden0", tag: `<span class="tag hidden0">${thing.length} files</span>` })}
    ${Kit.term(D, { id: "dc-op", cap: "describe-add-operation", x: 96, y: 624, w: 640, h: 150, cls: "hidden0", tag: `<span class="tag hidden0">${op.length} file</span>` })}
    ${Loc.strip(D, { id: "dc-strip", x: 760, y: 262, w: 1064, label: "the plan page names", cls: "hidden0" })}
    ${Kit.ed(D, { id: "dc-ed", text: open.text, path: open.path, x: 760, y: 399, w: 1064, size: "small", cls: "hidden0", tag: `<span class="tag hidden0">${inFile(open.path)} blanks</span>` })}
    <div class="abs frame8 hidden0"><div class="lbl">the frame · ${tiles.length} files</div><div class="tiles">${tiles.map((a, k) => `<div class="tile hidden0 ${k < thing.length ? "ofthing" : "ofop"}"><span class="nm">${Film.esc(a.name)}</span><span class="sq">${'<i class="box hidden0"></i>'.repeat(a.blanks)}</span></div>`).join("")}</div></div>
    <div class="abs none hidden0"><div class="say">None of the ${Loc.word(tiles.length)} holds a decision.</div></div>
    <div class="abs legend hidden0"><div class="row1"><i class="box"></i>a blank</div><div class="sub hidden0">It says, in words, what is missing.</div></div>`;
  },
  build(s) {
    const c = s.cue, body = s.$("#dc-ed .code"), marks = Loc.todo(body), strings = marks.map((m) => { const q = m.querySelector(".s"); if (!q) throw new Error("declare: a blank without its words"); return q; });
    s.tl.set(marks, { outlineColor: "rgba(233,240,250,0)" }, 0);
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // a1: the page, the wallet it names, the doubts still on it.
    s.in("#dc-plan", s.start + 0.5, { y: 14 });
    s.in(".plan .named", c("a1", "names"), { y: 6, dur: 0.35, stagger: 0.08 }); s.to(".plan .pl.named:not(.ph)", { color: "#e9f0fa", duration: 0.3 }, c("a1", "wallet"));
    s.in(".plan .doubt", c("a1", "still"), { y: 6, dur: 0.3, stagger: 0.07 });
    // a2: nothing undecided gets decided on the way.
    s.in(".must", c("a2", "what you"), { y: 12 });
    // a3: two commands, by name.
    const t3 = c("a3");
    s.out("#dc-plan", t3 - 0.15, { dur: 0.35 }); s.out(".must", c("a4") - 0.1, { dur: 0.35 }); s.in("#dc-strip", t3 + 0.3, { y: 12 }); s.in("#dc-add", t3 + 0.25, { y: 14 });
    const A = s.$("#dc-add"), B = s.$("#dc-op"), wroteA = s.$$("#dc-add .o"), wroteB = s.$$("#dc-op .o");
    const typedA = Loc.type(s, A, c("a3", "ortho"), Math.max(0.6, c("a3", "wallet") + 0.4 - c("a3", "ortho")));
    Loc.print(s, wroteA, typedA + 0.15, 0.05);
    s.in("#dc-op", c("a3", "Then") - 0.2, { y: 12, dur: 0.35 });
    const typedB = Loc.type(s, B, c("a3", "ortho", 2), Math.max(0.8, c("a3", "$") - 0.1 - c("a3", "ortho", 2)));
    Loc.print(s, wroteB, typedB + 0.15);
    // a4: the frame. Seven files, and one.
    s.in(".frame8", c("a4", "frame") - 0.3, { y: 10 });
    Loc.lit(s, "#dc-add", wroteA, c("a4", "Seven")); s.in("#dc-add .tag", c("a4", "Seven"), { y: 0, dur: 0.3 }); s.in(".tile.ofthing", c("a4", "Seven"), { y: 8, dur: 0.3, stagger: 0.07 });
    Loc.lit(s, "#dc-op", wroteB, c("a4", "one")); s.in("#dc-op .tag", c("a4", "one"), { y: 0, dur: 0.3 }); s.in(".tile.ofop", c("a4", "one"), { y: 8, dur: 0.3 });
    s.in("#dc-ed", c("a4", "operation"), { y: 14 }); s.to(".tile.ofop", { borderColor: "#e9f0fa", duration: 0.3 }, c("a4", "operation") + 0.2);
    // a5: none holds a decision; where one goes there is a blank, and it says what is missing.
    Loc.lit(s, "#dc-add", [], c("a5")); Loc.lit(s, "#dc-op", [], c("a5"));
    s.in(".none", c("a5", "None"), { y: 10 });
    const tb = c("a5", "blank");
    s.to(marks, { outlineColor: "rgba(233,240,250,1)", duration: 0.3, stagger: 0.08 }, tb); s.in("#dc-ed .tag", tb, { y: 0, dur: 0.3 });
    s.in(".tile .box", tb + 0.15, { y: 0, dur: 0.25, stagger: 0.05 }); s.in(".legend", tb, { y: 10 });
    s.to(strings, { backgroundColor: "rgba(98,198,255,.22)", duration: 0.3, stagger: 0.08 }, c("a5", "says")); s.in(".legend .sub", c("a5", "says"), { y: 6 });
  },
});
