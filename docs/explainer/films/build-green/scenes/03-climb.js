// Sheet 3. Rung one: the work is written, the count does not move, and the first failure is a different one.
Film.scene("climb", {
  step: "climb",
  html: (D) => {
    const h = Loc.handler(D, 1), rec = Kit.line(h.text, /yield\* steps\.record\($/), ret = Kit.line(h.text, /^\s*return \{ handle: id \};/);
    const once = (words) => { let seen = false; return (l) => l.includes(words) && !seen && (seen = true); };
    const move = once("answered without making its move claim");
    return `${Kit.css}${Loc.css("climb")}<style>
      #scene-climb #cl-ed .code.small { line-height: 28px; }
      #scene-climb .pair .cmd { color: var(--muted); } #scene-climb .pair .cur { display: none; } #scene-climb .pair .hit { color: var(--text2); }
      #scene-climb .saybox { left: 96px; top: 812px; }
    </style>
    <div class="head"><div class="eyebrow">Rung one</div><div class="hl">Same count. A different failure.</div></div>
    <div class="who">${Kit.who("builder", "the builder")}</div>${Loc.ladder(D, 1)}
    ${Kit.ed(D, { id: "cl-ed", text: h.text, path: h.path, x: 96, y: 262, w: 1728, from: h.from, size: "small", tag: '<span class="tag">rung 1 · the work</span>' })}
    ${Kit.term(D, { id: "cl-term", cap: "climb-1-prove", x: 96, y: 262, w: 1728, h: 292, cls: "hidden0", tag: '<span class="tag">rung 1 · the work</span>', keep: (l) => l.startsWith("journey ") || l.startsWith('  ✘ "aaron claims the free name"') || move(l) })}
    ${Kit.term(D, { id: "cl-before", cap: "climb-0-prove", x: 96, y: 590, w: 852, h: 190, size: 19, cls: "hidden0 pair", tag: '<span class="tag">before · rung 0</span>', keep: once("the server died") })}
    ${Kit.term(D, { id: "cl-now", cap: "climb-1-prove", x: 972, y: 590, w: 852, h: 190, size: 19, cls: "hidden0 pair", tag: '<span class="tag">now · rung 1</span>', keep: once("answered without making its move claim") })}
    ${Kit.ed(D, { id: "cl-gap", text: h.text, path: h.path, x: 96, y: 590, w: 1180, from: rec, to: ret, size: "small", cls: "hidden0", tag: '<span class="tag">rung 1</span>' })}
    <div class="abs saybox hidden0"><div class="say">Every rung changes what fails first.</div></div>`;
  },
  build(s) {
    const c = s.cue, h = Loc.handler(s.D, 1), body = s.$("#cl-ed .code"), rows = h.text.split("\n"), n = (re) => Kit.line(h.text, re);
    const handle = n(/records\.insert\(Handle,/), profile = n(/records\.insert\(Profile,/), rec = n(/yield\* steps\.record\($/), ret = n(/^\s*return \{ handle: id \};/), close = rows.findIndex((l, k) => k + 1 > profile && /^\s*\);$/.test(l)) + 1;
    if (!close || profile !== handle + 1) throw new Error("climb: the recorded handler changed shape");
    s.in(".head", s.start + 0.3); s.in(".who, .ladder", s.start + 0.4, { y: 0 });
    // d1: the work. Two records, saved together.
    s.in("#cl-ed", c("d1") - 0.1, { y: 16 });
    s.focus(body, [handle, profile], c("d1", "Two records")); s.focus(body, [rec, close], c("d1", "saved"));
    s.focus(body, [handle, handle], c("d1", "handle")); s.in(Kit.call(s, body, handle, "the handle"), c("d1", "handle") + 0.05, { x: 14, y: 0, dur: 0.3 });
    s.focus(body, [handle, profile], c("d1", "public")); s.in(Kit.call(s, body, profile, "its public page"), c("d1", "public") + 0.05, { x: 14, y: 0, dur: 0.3 });
    // d2: prove again. Still four of eight.
    const t2 = c("d2"), out = s.$$("#cl-term .o");
    s.out("#cl-ed", t2 - 0.4, { dur: 0.3 }); s.in("#cl-term", t2 - 0.1, { y: 12, dur: 0.35 });
    Loc.type(s, s.$("#cl-term"), t2, Math.max(0.4, c("d2", "still") - t2 - 0.15));
    Loc.print(s, [out[0]], c("d2", "still")); Loc.light(s, 1, c("d2", "4"));
    s.fromTo(".ladder .rung0, .ladder .rung1", { scale: 1 }, { scale: 1.1, duration: 0.25, yoyo: true, repeat: 1 }, c("d3", "number"));
    // d3: read the reasons. Before, and now.
    Loc.print(s, out.slice(1), c("d3", "read"), 0.1);
    const died = Loc.mark(Loc.rows(s, "#cl-before", "the server died")[0], "the server died"), moved = Loc.mark(Loc.rows(s, "#cl-now", "answered without making its move claim")[0], "answered without making its move claim");
    const show = (sel, t) => { s.in(sel, t, { y: 12 }); s.fromTo(sel + " .cmd", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t); s.fromTo(sel + " .typed", { width: "auto" }, { width: "auto", duration: 0.01 }, t); Loc.print(s, s.$$(sel + " .o"), t + 0.1); };
    show("#cl-before", c("d3", "before") - 0.1); s.to(died, { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.22)", duration: 0.3 }, c("d3", "server"));
    show("#cl-now", c("d3", "Now") - 0.1); s.to(moved, { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.22)", duration: 0.3 }, c("d3", "answered"));
    Loc.lit(s, "#cl-term", Loc.rows(s, "#cl-term", "answered without making its move claim"), c("d3", "answered"));
    // d4: it saved the records and forgot the move. No event, no state.
    const t4 = c("d4"), gap = s.$("#cl-gap .code");
    s.out(".pair", t4 - 0.35, { dur: 0.3 }); Loc.lit(s, "#cl-term", [], t4 - 0.2); s.in("#cl-gap", t4, { y: 14 });
    s.focus(gap, [rec, close], c("d4", "saved")); s.focus(gap, [close + 1, ret - 1], c("d4", "forgot")); s.in(Kit.call(s, gap, close + 1, "no move here"), c("d4", "forgot") + 0.05, { x: 14, y: 0, dur: 0.3 });
    const event = Loc.rows(s, "#cl-term", "expected HandleClaimed, journal has nothing"), state = Loc.rows(s, "#cl-term", 'is in no state, expected "claimed"');
    const noEvent = Loc.label(event[0], "no event"), noState = Loc.label(state[0], "no state");
    Loc.lit(s, "#cl-term", event, c("d4", "no event")); s.in(noEvent, c("d4", "no event") + 0.05, { x: 14, y: 0, dur: 0.3 });
    Loc.lit(s, "#cl-term", [...event, ...state], c("d4", "no state")); s.in(noState, c("d4", "no state") + 0.05, { x: 14, y: 0, dur: 0.3 });
    // d5: what climbing looks like.
    const t5 = c("d5");
    s.out("#cl-gap", t5 - 0.3, { dur: 0.3 }); s.out([noEvent, noState], t5 - 0.3, { dur: 0.3 }); Loc.lit(s, "#cl-term", [], t5 - 0.3); s.in(".pair", t5 + 0.1, { y: 12, stagger: 0.15 });
    s.fromTo(".ladder .rung0, .ladder .rung1", { scale: 1 }, { scale: 1.1, duration: 0.25, yoyo: true, repeat: 1 }, c("d5", "Not every"));
    s.in(".saybox", c("d5", "but every"), { y: 14 });
  },
});
