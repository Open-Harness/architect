// Sheet 3. Read the trace: the same call again for its trace id, then `ortho telemetry trace`, read a line at a time; an answered call beside it.
Film.scene("trace", {
  step: "trace",
  html: (D) => {
    const http = D.cap["refusal-http"], ref = D.cap["trace-refused"], ans = D.cap["trace-answered"];
    const id = (/^x-trace-id: (\w+)$/m.exec(http.out) ?? [])[1]; if (!id || !ref.cmd.endsWith(id)) throw new Error("the refused call's trace id is not the one the trace command was given");
    const all = ref.out.split("\n"), keepB = (l) => /^trace |^handle\.claim  |oneNamePerPerson|^  handle\.claim\.record  |Sent HTTP response/.test(l);
    if (all.some((l) => /\.commit\b/.test(l))) throw new Error("the refused trace has a commit: this sheet says it has none");
    const rowsC = ans.out.split("\n"), keepC = (l) => l === rowsC[0] || l === rowsC[1] || /\.commit  .*step commit/.test(l);
    return `${Kit.css}${Loc.css}<style>
      #scene-trace .not { left: 96px; top: 276px; display: flex; gap: 22px; } #scene-trace .not .chip { font-family: var(--sans); font-size: 30px; padding: 12px 24px; color: var(--text2); }
      #scene-trace #tr-trace .screen { font-size: 24px; line-height: 38px; } #scene-trace #tr-trace .o.first { margin-bottom: 84px; } #scene-trace #tr-trace .o.cause { margin-bottom: 52px; }
      #scene-trace .slot { margin: 10px 0 10px 2ch; width: 560px; height: 46px; border: 2px dashed var(--text2); display: flex; align-items: center; padding: 0 16px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; color: var(--paper); }
      #scene-trace .all { left: 1236px; top: 300px; width: 588px; } #scene-trace .all .lbl { font-size: 24px; margin-bottom: 8px; }
      #scene-trace .after { left: 1236px; top: 580px; width: 588px; font-size: 34px; line-height: 1.3; } #scene-trace .after .lbl { font-size: 24px; margin-bottom: 8px; }
      #scene-trace #tr-ans .tag, #scene-trace #tr-trace .tag { color: var(--muted); }
    </style>
    <div class="head"><div class="eyebrow">Read the trace</div><div class="hl">The agent doesn't guess. It reads.</div></div>
    <div class="lwho">${Kit.who("agent", "your agent")}</div>
    <div class="abs not"><span class="chip g1">no guessing</span><span class="chip g2">the handler stays closed</span></div>
    ${Kit.term(D, { id: "tr-http", cap: "refusal-http", x: 96, y: 262, w: 1728, h: 246, keep: (l) => /^HTTP\/|^x-trace-id|^\{/.test(l), title: "the same call, again" })}
    ${Kit.term(D, { id: "tr-trace", cap: "trace-refused", x: 96, y: 526, w: 1100, h: 452, keep: keepB, title: "the refused call", tag: `<span class="tag">${all.filter(keepB).length} of its ${all.length} lines</span>` })}
    <div class="abs all hidden0"><div class="lbl cy">the trace</div><div class="kbig">Everything that one call did.</div></div>
    <div class="abs after hidden0"><div class="lbl cy">the rule was checked</div>after the work,<br>before anything was saved</div>
    ${Kit.term(D, { id: "tr-ans", cap: "trace-answered", x: 1236, y: 262, w: 588, h: 250, keep: keepC, size: 19, title: "an answered call", tag: `<span class="tag">3 of its ${rowsC.length} lines</span>` })}`;
  },
  build(s) {
    const c = s.cue, A = s.$("#tr-http"), B = s.$("#tr-trace"), C = s.$("#tr-ans");
    const first = Loc.row(B, /^handle\.claim  .*refused /), cause = Loc.row(B, /oneNamePerPerson/), record = Loc.row(B, /handle\.claim\.record  .*step database/);
    first.classList.add("first"); cause.classList.add("cause");
    const slot = document.createElement("div"); slot.className = "slot hidden0"; slot.textContent = "no handle.claim.commit"; record.after(slot);
    const op = Loc.mark(first, /^[\w.]+/), ms = Loc.mark(first, /[\d.]+ ms/), ref = Loc.mark(first, /refused \w+/), rule = Loc.mark(cause, /[\w.]*oneNamePerPerson/);
    const n1 = Loc.note(op, "the operation", { drop: 30 }), n2 = Loc.note(ms, "how long"), n3 = Loc.note(ref, "refused, with its name", { drop: 30 }), n4 = Loc.note(rule, "a rule, by its name in the blueprint");
    s.in(".head", s.start + 0.3); s.in(".lwho", s.start + 0.5, { y: 0 });
    s.in(".g1", c("t1", "guess"), { y: 10 }); s.in(".g2", c("t1", "open"), { y: 10 }); s.out(".not", c("t1", "It makes") - 0.45, { dur: 0.3 });
    // The same call, for its trace id.
    s.in(A, c("t1", "It makes") - 0.1, { y: 16 });
    Loc.type(s, A, c("t1", "makes"), { dur: c("t1", "keeps") - c("t1", "makes") - 0.2, at: c("t1", "answer") - 0.3, each: 0.14 });
    Loc.light(s, Loc.row(A, /^x-trace-id: /), c("t1", "traces"));
    // One command, with that id.
    s.in(B, c("t2") - 0.1, { y: 16 });
    const up = c("t2", "$") + 0.05;
    s.run(B, c("t2", "ortho"), { type: c("t2", "$") - c("t2", "ortho") - 0.2, at: c("t3") + 0.1, each: 0.13 });
    s.out(A, up - 0.15, { dur: 0.3 }); s.to(B, { y: -264, height: 520, duration: 0.55, ease: "power2.inOut" }, up);
    s.in(".all", c("t3", "everything"), { x: 16, y: 0 });
    Loc.light(s, first, c("t3", "first line"));
    [[op, n1, "operation"], [ms, n2, "how long"], [ref, n3, "refused"]].forEach(([m, n, word]) => { s.to(m, { color: "#62c6ff", duration: 0.3 }, c("t3", word)); s.in(n, c("t3", word), { y: 6, dur: 0.35 }); });
    Loc.light(s, cause, c("t4", "cause")); s.in(n4, c("t4", "rule"), { y: 6, dur: 0.35 }); s.to(rule, { color: "#62c6ff", duration: 0.3 }, c("t4", "one name"));
    s.out(".all", c("t5") - 0.3, { dur: 0.3 });
    Loc.light(s, record, c("t5", "record step")); s.in(slot, c("t5", "no commit"), { y: 0 });
    s.in(".after", c("t5", "checked"), { x: 16, y: 0 });
    // Beside it, a call that was answered.
    s.in(C, c("t6") - 0.1, { y: 16 }); Loc.type(s, C, c("t6") + 0.1, { dur: 0.8, at: c("t6", "answered"), each: 0.12 });
    Loc.light(s, Loc.row(C, /\.commit  .*step commit/), c("t6", "last step"));
  },
});
