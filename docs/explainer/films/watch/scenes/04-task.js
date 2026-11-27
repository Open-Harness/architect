// Sheet 4. Drift becomes a task: the file watch wrote, read a line at a time; the slowest call's trace, by the id the file
// gives; then the budget put back, the same calls healthy, and the bar under its line again.
Film.scene("task", {
  step: "task",
  html: (D) => {
    const md = D.cap["watch-task.md"]; Loc.need(md && md.cmd.startsWith("# .ortho/tasks/"), "no recorded task file");
    const dr = D.cap["watch-drift"].out, back = D.cap["watch-back"].out, now = Loc.op(dr, "profile.get"), again = Loc.op(back, "profile.get");
    const said = /^- p95 (\d+)ms against a budget of (\d+)ms \(p50 \d+ms, over (\d+) calls in the window\)\.$/m.exec(md.out);
    Loc.need(said && +said[1] === now.p95 && +said[2] === now.budget && +said[3] === Loc.calls(dr)["profile.get"], "the task file's numbers are not the drift watch's");
    Loc.need(/^task \.ortho\/tasks\/drift-test-profile\.get\.md$/m.test(dr) && md.cmd === "# .ortho/tasks/drift-test-profile.get.md", "the task file is not the one watch named");
    const first = /`ortho telemetry trace ([0-9a-f]+) --env test`/.exec(md.out); Loc.need(first && D.cap["watch-slowest"].cmd.includes(first[1]), "the trace replayed is not the first the task names");
    Loc.says(Loc.calls(back)["profile.get"], 28, "the calls healthy again"); Loc.need(Loc.calls(back)["profile.get"] === Loc.calls(dr)["profile.get"], "watch-back did not judge the same calls");
    Loc.need(Loc.ops(back).every((o) => o.ok) && again.budget === Loc.op(D.cap["watch-healthy"].out, "profile.get").budget && /^drift none$/m.test(back), "watch-back is not healthy against the blueprint's budget");
    const slow = D.cap["watch-slowest"].out, whole = /^profile\.get  (\d+) ms$/m.exec(slow), part = /^  profile\.get\.load  (\d+) ms  step database$/m.exec(slow);
    Loc.need(whole && part && +part[1] * 2 > +whole[1], "the slowest trace has no load step that took most of it");
    const tb = (name, ms, k) => `<div class="trow tr${k}" style="top:${k * 46}px"><span class="tn">${name}</span><i style="width:${ms * Loc.PX}px"></i><b style="left:${Loc.X0 + ms * Loc.PX + 14}px">${ms} ms</b></div>`;
    const dc = Loc.calls(dr), rows = Loc.ops(dr).map((o) => ({ ...o, drawn: true, mark: o.ok ? "ok" : "no", budgets: o.op === "profile.get" ? [now.budget, again.budget] : [o.budget], calls: dc[o.op], counts: [dc[o.op]] }));
    return `${Kit.css}${Loc.css("task")}<style>
      #scene-task #t-md .code { line-height: 31px; } #scene-task #t-md .ln > i { width: 50px; }
      #scene-task #t-md .hit { transition: none; }
      #scene-task .tbars { left: 96px; top: 866px; width: 1728px; height: 92px; }
      #scene-task .trow { position: absolute; left: 0; right: 0; height: 40px; } #scene-task .trow .tn { position: absolute; left: 26px; top: 2px; font-family: var(--mono); font-size: 22px; color: var(--text2); }
      #scene-task .trow i { position: absolute; left: ${Loc.X0}px; top: 8px; height: 24px; background: #a9bcd6; transform-origin: 0 50%; } #scene-task .trow b { position: absolute; top: 2px; font-family: var(--mono); font-size: 22px; font-weight: 400; color: var(--paper); }
      #scene-task .tbars .lbl { position: absolute; right: 22px; top: 2px; font-size: 21px; }
      #scene-task .backnote { left: 96px; top: 540px; } #scene-task .backnote .say { font-size: 40px; }
    </style>
    <div class="head"><div class="eyebrow">The task</div><div class="hl">Drift becomes a task.</div></div>
    <div class="who"><span class="from">${Kit.who("you")}</span><span class="arrow hidden0">→</span><span class="to hidden0">${Kit.who("agent", "your agent")}</span></div>
    ${Loc.doc("t-md", md.cmd.replace(/^# /, ""), md.out, { x: 96, y: 262, w: 1728, tag: '<span class="tag">written by watch</span>' })}
    ${Kit.term(D, { id: "t-slow", cap: "watch-slowest", x: 96, y: 664, w: 1728, h: 172, size: 19, cls: "hidden0", title: "plugged-in · the slowest call", keep: (l) => /^profile\.get  \d+ ms$/.test(l) || /^  profile\.get\.load  15 ms  step database$/.test(l) })}
    ${Kit.term(D, { id: "t-back", cap: "watch-back", x: 96, y: 262, w: 1728, h: 222, size: 19, cls: "hidden0", title: "plugged-in · test, the budget put back", keep: (l) => / p95 \d+ms \(budget |^calls: |^drift /.test(l) })}
    <div class="abs tbars hidden0">${tb("profile.get", +whole[1], 0)}${tb("profile.get.load", +part[1], 1)}<span class="lbl">the slowest call · same scale</span></div>
    <div class="abs backnote hidden0"><div class="say">The budget, as the blueprint has it again.</div></div>
    ${Loc.bars("t-bars", rows, { top: 660 })}`;
  },
  build(s) {
    const c = s.cue, D = s.D, md = D.cap["watch-task.md"].out, n = (re) => Kit.line(md, re), body = s.$("#t-md .code");
    const lp95 = n(/^- p95 /), lslow = n(/^- The slowest calls/), lbrief = n(/^- What it must do/), lbud = n(/^- The budget is /), again = Loc.op(D.cap["watch-back"].out, "profile.get");
    const mark = (line, words) => { const w = document.createTreeWalker(body.querySelector(`.ln[data-n="${line}"] code`), NodeFilter.SHOW_TEXT); let nd; while ((nd = w.nextNode())) { const k = nd.nodeValue.indexOf(words); if (k < 0) continue; const h = nd.splitText(k); h.splitText(words.length); const sp = document.createElement("span"); sp.className = "hit"; h.parentNode.replaceChild(sp, h); sp.appendChild(h); return sp; } throw new Error("task: the file lost the words " + words); };
    const faster = mark(lbud, "Make the handler faster"), loosen = mark(lbud, "loosening the budget is a decision"), brief = mark(lbrief, "ortho brief profile.get"), trace = mark(lslow, "ortho telemetry trace");
    s.in(".head", s.start + 0.3); s.in(".who .from", s.start + 0.4, { y: 0 });
    // d1: a task, ready to hand to a builder.
    s.in("#t-md", s.start + 0.5, { y: 14 }); s.focus(body, [1, 1], c("d1", "task"));
    s.in(".who .arrow, .who .to", c("d1", "builder"), { x: -10, y: 0, stagger: 0.1 });
    // d2: the numbers; the slowest calls by their trace.
    s.focus(body, [lp95, lp95], c("d2", "numbers"));
    s.focus(body, [lslow, lslow], c("d2", "slowest")); s.to(trace, { backgroundColor: "rgba(98,198,255,.3)", color: "#e9f0fa", duration: 0.3 }, c("d2", "trace"));
    s.out("#t-bars", c("d2", "trace") - 0.3, { dur: 0.3 }); s.in("#t-slow", c("d2", "trace"), { y: 12, dur: 0.35 });
    Loc.type(s, s.$("#t-slow"), c("d2", "trace") + 0.1, 0.8); const sl = s.$$("#t-slow .o"); Loc.print(s, sl, c("d2", "builder"), 0.2);
    s.in(Loc.label(sl[sl.length - 1], "the step that took most of it"), c("d2", "reads"), { x: 14, y: 0, dur: 0.3 });
    s.in(".tbars", c("d2", "builder"), { y: 10 }); s.fromTo(".tbars .trow i", { scaleX: 0 }, { scaleX: 1, duration: 0.6, stagger: 0.25 }, c("d2", "builder") + 0.1);
    // d3: the brief for that one operation.
    s.focus(body, [lbrief, lbrief], c("d3", "brief")); s.to(brief, { backgroundColor: "rgba(98,198,255,.3)", color: "#e9f0fa", duration: 0.3 }, c("d3", "brief"));
    // d4: and a line for you.
    s.focus(body, [lbud, lbud], c("d4", "line")); s.fromTo(".who .from", { scale: 1 }, { scale: 1.15, duration: 0.25, yoyo: true, repeat: 1 }, c("d4", "you"));
    s.to(faster, { backgroundColor: "rgba(98,198,255,.3)", color: "#e9f0fa", duration: 0.3 }, c("d4", "faster"));
    s.fromTo(".who .to", { scale: 1 }, { scale: 1.15, duration: 0.25, yoyo: true, repeat: 1 }, c("d4", "builder's"));
    s.to(loosen, { backgroundColor: "rgba(233,240,250,.22)", color: "#e9f0fa", duration: 0.3 }, c("d4", "Loosening"));
    s.fromTo(".who .from", { scale: 1 }, { scale: 1.15, duration: 0.25, yoyo: true, repeat: 1 }, c("d4", "your"));
    // d5: the budget put back; the same calls healthy again.
    const t5 = c("d5");
    s.out("#t-md, #t-slow, .tbars", t5 - 0.35, { dur: 0.3 }); s.to("#t-bars", { autoAlpha: 1, duration: 0.3 }, t5 - 0.1); s.in("#t-back", t5, { y: 12, dur: 0.3 });
    Loc.type(s, s.$("#t-back"), t5 + 0.1, 0.4); s.in(".backnote", c("d5", "back"), { y: 10 });
    Loc.budget(s, "#t-bars", "profile.get", again.budget, c("d5", "back")); Loc.mark(s, "#t-bars", "profile.get", "", c("d5", "back"));
    Loc.print(s, s.$$("#t-back .o"), c("d5", "same"), 0.12);
    s.fromTo(Loc.row(s, "#t-bars", "profile.get").querySelector(".bcalls span"), { scale: 1 }, { scale: 1.2, duration: 0.25, yoyo: true, repeat: 1, transformOrigin: "0 50%" }, c("d5", "28"));
    Loc.mark(s, "#t-bars", "profile.get", "ok", c("d5", "healthy"));
    Loc.lit(s, "#t-back", Loc.rows(s, "#t-back", /^profile\.get p95 |^drift none$/), c("d5", "healthy"));
  },
});
