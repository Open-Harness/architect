// Sheet 3. Over a budget, staged: the budget line of get.ts tightened, twenty-five more reads, and the drift watch replayed.
// The profile.get bar keeps its length; its budget line moves under it.
Film.scene("drift", {
  step: "drift",
  html: (D) => {
    const ok = D.cap["watch-healthy"].out, dr = D.cap["watch-drift"].out, was = Loc.op(ok, "profile.get"), now = Loc.op(dr, "profile.get");
    Loc.says(was.budget, 150, "the budget before"); Loc.says(now.budget, 10, "the tightened budget"); Loc.says(now.p95, 22, "profile.get's p95");
    Loc.need(was.p95 === now.p95, "profile.get's p95 changed between the two watches, so its bar would not keep its length");
    Loc.need(!now.ok && Loc.op(dr, "handle.claim").ok, "the drift watch does not mark profile.get alone");
    const before = Loc.calls(ok), after = Loc.calls(dr);
    Loc.says(after["profile.get"] - before["profile.get"], 25, "the further reads");
    Loc.need(/^drift profile\.get$/m.test(dr) && /^task \S+$/m.test(dr), "the drift watch has no drift or task line");
    const get = D.src["blueprint/things/profile/verbs/get.ts"], at = Kit.line(get, /^\s*budget: \{ p95: "\d+ millis" \},$/);
    const rows = Loc.ops(ok).map((o) => ({ ...o, drawn: true, mark: "ok", budgets: o.op === "profile.get" ? [was.budget, now.budget] : [o.budget], calls: before[o.op], counts: [...new Set([before[o.op], after[o.op]])] }));
    return `${Kit.css}${Loc.css("drift")}<style>
      #scene-drift .strk { position: relative; } #scene-drift .strk i { position: absolute; left: -4px; right: -4px; top: 52%; height: 3px; background: var(--paper); transform-origin: 0 50%; transform: scaleX(0); }
      #scene-drift .neu { margin-left: 22px; padding: 0 10px; border: 1.5px solid var(--paper); color: var(--paper); }
      #scene-drift #d-ed .tag { color: var(--paper); }
      #scene-drift .more { left: 1240px; top: 252px; width: 584px; } #scene-drift .more .say { font-size: 40px; } #scene-drift .more .lbl { font-size: 22px; margin-bottom: 8px; }
    </style>
    <div class="head"><div class="eyebrow">Drift</div><div class="hl">The same calls, over a budget.</div></div>
    <div class="who">${Kit.who("you")}</div>
    ${Kit.ed(D, { id: "d-ed", file: "blueprint/things/profile/verbs/get.ts", x: 96, y: 262, w: 1120, from: at, to: at, size: "small", tag: '<span class="tag">staged for the recording</span>' })}
    <div class="abs more hidden0"><div class="lbl">then, the public page</div><div class="say">read ${after["profile.get"] - before["profile.get"]} more times</div></div>
    ${Kit.term(D, { id: "d-term", cap: "watch-drift", x: 96, y: 390, w: 1728, h: 250, size: 19, cls: "hidden0", title: "plugged-in · test, the budget tightened", keep: (l) => /^profile\.get p95 |^calls: |^task |^drift /.test(l) })}
    ${Loc.bars("d-bars", rows, { top: 660 })}`;
  },
  build(s) {
    const c = s.cue, D = s.D, dr = D.cap["watch-drift"].out, now = Loc.op(dr, "profile.get"), after = Loc.calls(dr);
    const get = D.src["blueprint/things/profile/verbs/get.ts"], at = Kit.line(get, /^\s*budget: \{ p95: "\d+ millis" \},$/), body = s.$("#d-ed .code");
    // The declared words, struck where they stand, and the staged words beside them.
    const ln = body.querySelector(`.ln[data-n="${at}"] code`), w = document.createTreeWalker(ln, NodeFilter.SHOW_TEXT); let node, strk;
    while ((node = w.nextNode())) { const k = node.nodeValue.indexOf("150 millis"); if (k < 0) continue; const h = node.splitText(k); h.splitText(10); strk = document.createElement("span"); strk.className = "strk"; h.parentNode.replaceChild(strk, h); strk.appendChild(h); strk.appendChild(document.createElement("i")); break; }
    Loc.need(strk, "get.ts lost its 150 millis");
    const neu = document.createElement("span"); neu.className = "neu hidden0"; neu.textContent = `${now.budget} millis · staged`; ln.appendChild(neu);
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // c1: nothing was slow; so one budget was tightened, from 150 to 10.
    s.fromTo("#d-bars .bmark .ok", { scale: 1 }, { scale: 1.3, duration: 0.25, yoyo: true, repeat: 1 }, c("c1", "slow"));
    s.focus(body, [at, at], c("c1", "tightened"));
    s.to(strk.querySelector("i"), { scaleX: 1, duration: 0.4, ease: "power2.inOut" }, c("c1", "150"));
    s.in(neu, c("c1", "10"), { x: -10, y: 0, dur: 0.35 });
    Loc.budget(s, "#d-bars", "profile.get", now.budget, c("c1", "10") - 0.2); Loc.mark(s, "#d-bars", "profile.get", "", c("c1", "10") - 0.2);
    // c2: twenty-five more reads, and watch again.
    s.in(".more", c("c2", "25") - 0.1, { y: 12 });
    const term = s.$("#d-term"), out = s.$$("#d-term .o");
    s.in(term, c("c2", "watched") - 0.3, { y: 12, dur: 0.35 }); Loc.type(s, term, c("c2", "watched"), 0.5);
    // c3: profile.get is marked; 22 against 10; the drift line names it.
    const pg = Loc.rows(s, "#d-term", /^profile\.get p95 /), task = Loc.rows(s, "#d-term", /^task /), drift = Loc.rows(s, "#d-term", /^drift /);
    Loc.print(s, out, c("c3", "Now") - 0.2, 0.12);
    Loc.count(s, "#d-bars", "profile.get", after["profile.get"], c("c3", "Now") - 0.1);
    Loc.lit(s, "#d-term", pg, c("c3", "profile")); Loc.mark(s, "#d-bars", "profile.get", "no", c("c3", "marked"));
    const val = Loc.row(s, "#d-bars", "profile.get").querySelector(".bval"), bl = Loc.row(s, "#d-bars", "profile.get").querySelector(`.bl[data-ms="${now.budget}"]`);
    s.fromTo(val, { scale: 1 }, { scale: 1.2, duration: 0.25, yoyo: true, repeat: 1, transformOrigin: "0 50%" }, c("c3", "22"));
    s.fromTo(bl, { scale: 1 }, { scale: 1.2, duration: 0.25, yoyo: true, repeat: 1 }, c("c3", "against"));
    Loc.lit(s, "#d-term", [...pg, ...drift], c("c3", "drift line")); const names = Loc.label(drift[0], "names it"); s.in(names, c("c3", "names"), { x: 14, y: 0, dur: 0.3 }); s.out(names, c("c4") - 0.1, { dur: 0.25 });
    // c4: and it wrote a file.
    s.out(".more", c("c4") - 0.2, { dur: 0.3 });
    Loc.lit(s, "#d-term", task, c("c4", "wrote")); s.in(Loc.label(task[0], "a file, written by watch"), c("c4", "file") - 0.1, { x: 14, y: 0, dur: 0.3 });
  },
});
