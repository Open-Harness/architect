// Sheet 5. What you read: two changed lines and the list. What goes wrong: generate before the states are filled, replayed. What the
// check cannot tell. And the film's own note: who filled the blanks, and how each part stands.
Film.scene("read", {
  step: "read",
  html: (D) => {
    const b0 = Loc.blanks(D, "describe-0-check"), b2 = Loc.blanks(D, "describe-2-check");
    const pairs = [["describe-0-thing-ts", "describe-1-thing-ts", /^\s*description: /], ["describe-0-machine-ts", "describe-1-machine-ts", /^\s*states: /]].map(([a, z, re]) => {
      const was = D.cap[a].text.split("\n"), now = D.cap[z].text.split("\n"), changed = now.map((l, k) => (l !== was[k] ? k + 1 : 0)).filter(Boolean);
      if (was.length !== now.length || changed.length !== 1 || changed[0] !== Kit.line(D.cap[z].text, re)) throw new Error("read: " + z + " does not differ from " + a + " by its one filled line");
      return { ...D.cap[z], line: changed[0] };
    });
    Loc.spoken(D, "e1", /read (\w+) changed lines/i, pairs.length); Loc.spoken(D, "e4", /those (\w+) blanks/i, b0.count - b2.count);
    // The early run: the types line of its check, and the line of the generated file it points at.
    const early = D.cap["describe-early-check"].out.split("\n"), ty = early.findIndex((l) => /^types ✘ \d+$/.test(l)), at = /^  (\S+):(\d+)  /.exec(early[ty + 1] ?? "");
    const types = D.cap["describe-early-types-ts"]; if (ty < 0 || !at || at[1] !== types.path) throw new Error("read: the early check no longer fails on the wallet's types");
    const bad = +at[2]; if (!/=\s*;$/.test(types.text.split("\n")[bad - 1])) throw new Error("read: the line the early check names is not the empty type");
    if (!D.cap["describe-early-generate"].out.split("\n").includes("created " + types.path)) throw new Error("read: the early generate did not write the types file");
    const m0 = D.cap["describe-0-machine-ts"], blank = Kit.line(m0.text, /^\s*states: Blueprint\.todo\(/);
    return `${Kit.css}${Loc.css("read")}<style>
      #scene-read .tag { color: var(--muted); } #scene-read #rd-types .tag { color: var(--cyan); }
      #scene-read .only { left: 96px; top: 556px; } #scene-read .only .say { font-size: 46px; }
      #scene-read .advice { left: 96px; top: 664px; } #scene-read .advice .say { font-size: 38px; }
      #scene-read .tell { left: 96px; top: 524px; display: flex; align-items: center; gap: 18px; } #scene-read .tell .chip { font-family: var(--sans); font-size: 30px; padding: 10px 24px; } #scene-read .tell .or { font-size: 30px; color: var(--muted); }
      #scene-read .tell .cant { margin-left: 18px; font-size: 30px; color: var(--text2); }
      #scene-read .honest { left: 96px; top: 268px; right: 96px; } #scene-read .honest .big { font-size: 58px; font-weight: 500; letter-spacing: -.02em; line-height: 1.12; margin-top: 6px; }
      #scene-read .honest .facts { display: flex; gap: 44px; margin-top: 26px; font-size: 34px; color: var(--text2); } #scene-read .honest .facts b { color: var(--paper); font-weight: 500; }
      #scene-read .next { left: 1236px; top: 592px; display: flex; align-items: center; gap: 18px; } #scene-read .next .chip { font-family: var(--sans); font-size: 34px; padding: 12px 28px; border-color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">What you read</div><div class="hl">Watch the count.</div></div>
    ${Loc.who("you")}
    ${Kit.ed(D, { id: "rd-a", text: pairs[0].text, path: pairs[0].path, x: 96, y: 262, w: 1728, from: pairs[0].line, to: pairs[0].line, cls: "hidden0 changed", tag: '<span class="tag">changed line</span>' })}
    ${Kit.ed(D, { id: "rd-b", text: pairs[1].text, path: pairs[1].path, x: 96, y: 389, w: 1728, from: pairs[1].line, to: pairs[1].line, cls: "hidden0 changed", tag: '<span class="tag">changed line</span>' })}
    <div class="abs only hidden0"><div class="say">It goes down only when you decide something.</div></div>
    ${Kit.term(D, { id: "rd-gen", cap: "describe-early-generate", x: 96, y: 262, w: 860, h: 184, cls: "hidden0 early", keep: (l) => /^created /.test(l), tag: '<span class="tag">run too early · another recording</span>' })}
    ${Kit.term(D, { id: "rd-check", cap: "describe-early-check", x: 96, y: 458, w: 860, h: 184, cls: "hidden0 early", keep: (l, k) => k === ty || k === ty + 1, tag: '<span class="tag">its types lines</span>' })}
    ${Kit.ed(D, { id: "rd-blank", text: m0.text, path: m0.path, x: 980, y: 262, w: 844, from: blank, to: blank, size: "small", cls: "hidden0 early", tag: '<span class="tag">states: still a blank</span>' })}
    ${Kit.ed(D, { id: "rd-types", text: types.text, path: types.path, x: 980, y: 412, w: 844, from: bad - 1, to: bad, size: "small", cls: "hidden0 early", tag: '<span class="tag">generated</span>' })}
    <div class="abs advice hidden0"><div class="say">Fill a thing's states before you generate.</div></div>
    <div class="abs tell hidden0"><span class="chip d1 hidden0">a decision</span><span class="or d2 hidden0">or</span><span class="chip d2 hidden0">a guess</span><span class="cant d2 hidden0">The check can't tell: a blank that is gone is simply gone.</span></div>
    ${Loc.strip(D, { id: "rd-strip", x: 96, y: 610, w: 1728, label: "the plan page · the line to ask for", cls: "hidden0" })}
    <div class="abs honest hidden0"><div class="lbl" style="font-size:24px">one honest note</div><div class="big">The recording filled those ${Loc.word(b0.count - b2.count)} blanks itself.</div>
      <div class="facts"><div class="f1 hidden0">In <b>the plan's words</b>.</div><div class="f2 hidden0"><b>No agent</b> was filmed designing.</div></div></div>
    <div class="st1 hidden0">${Kit.stand("real", "add · check · model · generate", "left:96px;top:548px")}</div>
    <div class="st2 hidden0">${Kit.stand("practice", "the designer leaves a blank for what you haven't decided", "left:96px;top:604px")}</div>
    <div class="st3 hidden0">${Kit.stand("missing", "a blank that carries its options · a ready check", "left:96px;top:660px")}</div>
    <div class="abs next hidden0"><span class="lbl" style="font-size:28px">Next ·</span><span class="chip">say what done means</span></div>
    ${Loc.band(D, "describe-2-check")}`;
  },
  build(s) {
    const c = s.cue, one = (sel, re) => Loc.rows(s, sel, re)[0], band = s.$(".band");
    Loc.todo(s.$("#rd-blank .code"));
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(band, s.start + 0.3, { y: 0 });
    // e1: two changed lines, and a list of questions. Watch the count.
    s.in(".changed", c("e1", "two"), { y: 12, stagger: 0.25 });
    s.tl.to(band, { borderColor: "#e9f0fa", duration: 0.3 }, c("e1", "list")); Loc.only(s, s.$$(".band .brow"), c("e1", "list")); Loc.only(s, [], c("e1", "The count"));
    Loc.pulse(s, c("e1", "count")); s.in(".only", c("e1", "down"), { y: 12 });
    // e2: generate too early. The types file doesn't compile, and check says so.
    const t2 = c("e2"), G = s.$("#rd-gen"), K = s.$("#rd-check");
    s.out(".changed, .only", t2 - 0.35, { dur: 0.3 }); s.tl.to(band, { opacity: 0.35, borderColor: "rgba(132,170,222,.36)", duration: 0.4 }, t2 - 0.2);
    s.in(G, t2 - 0.05, { y: 12, dur: 0.35 }); Loc.type(s, G, t2 + 0.05, 0.5);
    s.in("#rd-blank", c("e2", "With") - 0.1, { y: 12 });
    const wrote = one("#rd-gen", /wallet\/types\.ts$/);
    Loc.print(s, s.$$("#rd-gen .o"), c("e2", "Generate", 2), 0.1); Loc.lit(s, "#rd-gen", [wrote], c("e2", "types"));
    const body = s.$("#rd-types .code"), last = +s.$$("#rd-types .ln").pop().dataset.n;
    s.in("#rd-types", c("e2", "types") + 0.1, { y: 12 }); s.focus(body, [last, last], c("e2", "doesn't"));
    s.in(K, c("e2", "and", 2) - 0.1, { y: 12, dur: 0.3 }); Loc.type(s, K, c("e2", "and", 2), 0.3); Loc.print(s, s.$$("#rd-check .o"), c("e2", "check") + 0.15, 0.15);
    Loc.lit(s, "#rd-check", [one("#rd-check", /Type expected/)], c("e2", "said")); s.in(".advice", c("e2", "so"), { y: 10 });
    // e3: a decision or a guess; ask which line of the plan.
    const t3 = c("e3");
    s.out(".early, .advice", t3 - 0.35, { dur: 0.3 }); s.tl.to(band, { opacity: 1, duration: 0.4 }, t3);
    s.in(".changed", t3 + 0.1, { y: 12, stagger: 0.12 }); s.in(".tell", t3 + 0.1, { y: 0 });
    s.in(".tell .d1", c("e3", "decision"), { y: 8, dur: 0.3 }); s.in(".tell .d2", c("e3", "guess"), { y: 8, dur: 0.3, stagger: 0.08 });
    Loc.pulse(s, c("e3", "drops")); s.in("#rd-strip", c("e3", "which"), { y: 12 });
    const strip = s.$("#rd-strip .pline"), from = [Loc.mark(strip, "a handle's money"), Loc.mark(strip, /States: [\w, ]+\./), Loc.mark(strip, "One per claimed handle.")];
    s.tl.to(from, { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.24)", duration: 0.3, stagger: 0.1 }, c("e3", "answer"));
    // e4: the honest note, and how each part stands.
    const t4 = c("e4");
    s.out(".changed, .tell, #rd-strip", t4 - 0.35, { dur: 0.3 }); s.in(".honest", t4 + 0.05, { y: 0 });
    s.tl.fromTo(s.$(".honest .big"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5 }, c("e4", "recording"));
    s.in(".f1", c("e4", "in the"), { y: 8 }); s.in(".f2", c("e4", "No agent"), { y: 8 });
    s.in(".st1", c("e4", "filmed") + 0.4, { y: 0 }); s.in(".st2", c("e4", "leaving"), { y: 0 }); s.in(".st3", c("e4", "Nothing"), { y: 0 });
    // e5: next.
    s.in(".next", c("e5", "Next"), { x: 14, y: 0 });
  },
});
