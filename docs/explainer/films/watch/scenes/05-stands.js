// Sheet 5. What goes wrong (calls under ortho dev, a thin window, an uncommitted tree), then how this stands: what runs today,
// what was staged, what was not shown, what is missing; and the next chapter.
Film.scene("stands", {
  step: "stands",
  html: (D) => {
    const sh = D.repo["docs/manual/record/09-watch.sh"];
    const dev = /^start_app\nfor _ in ([\d ]+); do read_page; done$/m.exec(sh); Loc.need(dev, "the recording script no longer reads the page under ortho dev");
    const made = Loc.says(dev[1].trim().split(/\s+/).length, 3, "the calls made under ortho dev");
    Loc.need(/^no calls in the window$/m.test(D.cap["watch-local"].out), "watch --env local counted calls");
    const thin = /^thin: profile\.get p95 \d+ms is over its budget of \d+ms but (\d+) calls are too few to call drift \((\d+) needed\)$/m.exec(D.cap["watch-thin"].out);
    Loc.need(thin && /^drift none$/m.test(D.cap["watch-thin"].out), "the thin watch has no thin line, or called drift");
    const few = +thin[1], need = Loc.says(+thin[2], 20, "the calls watch needs");
    const stray = /^echo "[^"]*" > "\$app\/([\w.-]+)"$/m.exec(sh); Loc.need(stray, "the recording script no longer writes a stray file");
    Loc.need(/^refused: the working tree differs /m.test(D.cap["watch-up-uncommitted"].out), "the uncommitted start was not refused");
    const was = Loc.op(D.cap["watch-healthy"].out, "profile.get").budget, tight = Loc.op(D.cap["watch-drift"].out, "profile.get").budget, back = Loc.calls(D.cap["watch-back"].out);
    const slots = Array.from({ length: need }, (_, k) => `<i class="slot${k < few ? " got" : " want"}"></i>`).join("");
    const dots = Array.from({ length: made }, (_, k) => `<i class="dot d${k}"></i>`).join("");
    const stamp = (cls, word, text, k) => `<div class="kstand st st${k} hidden0" style="left:96px;top:${290 + k * 88}px"><b class="${cls}">${word}</b><span>${text}</span></div>`;
    return `${Kit.css}${Loc.css("stands")}<style>
      #scene-stands #s-bars { visibility: hidden; opacity: 0; }
      #scene-stands .devs { left: 96px; top: 478px; display: flex; align-items: center; gap: 18px; }
      #scene-stands .devs .dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--paper); background: var(--text2); visibility: hidden; opacity: 0; }
      #scene-stands .devs .lbl { font-size: 22px; } #scene-stands .devs .say { font-size: 34px; margin-left: 18px; }
      #scene-stands .meter { left: 96px; top: 752px; width: 1728px; } #scene-stands .meter .row { display: flex; gap: 10px; margin-top: 12px; }
      #scene-stands .slot { width: 62px; height: 44px; border: 2px solid var(--rule2); visibility: hidden; opacity: 0; } #scene-stands .slot.got { background: var(--text2); border-color: var(--paper); }
      #scene-stands .meter .lbl { font-size: 22px; } #scene-stands .meter .lbl b { color: var(--paper); font-weight: 600; }
      #scene-stands .strayf { left: 96px; top: 478px; } #scene-stands .strayf .chip { font-size: 26px; }
      #scene-stands .kstand { font-size: 26px; gap: 22px; } #scene-stands .kstand span { font-family: var(--sans); text-transform: none; letter-spacing: 0; font-size: 32px; font-weight: 400; color: var(--paper); }
      #scene-stands .kstand b { min-width: 240px; text-align: center; } #scene-stands .kstand .staged { color: var(--paper); } #scene-stands .kstand .unshown { color: var(--text2); }
      #scene-stands .next { left: 96px; top: 918px; display: flex; align-items: center; gap: 18px; } #scene-stands .next .chip { font-family: var(--sans); font-size: 32px; padding: 10px 26px; border-color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">When it goes wrong</div><div class="hl">What to know.</div></div>
    <div class="who">${Kit.who("you")}</div>
    ${Kit.term(D, { id: "s-local", cap: "watch-local", x: 96, y: 262, w: 1728, h: 192, size: 19 })}
    <div class="abs devs hidden0"><span class="lbl">under ortho dev, the public page read</span>${dots}<span class="say cnt hidden0">watch counted none</span></div>
    ${Kit.term(D, { id: "s-thin", cap: "watch-thin", x: 96, y: 560, w: 1728, h: 162, size: 19, cls: "hidden0", title: "plugged-in · the budget tightened, before the further reads", keep: (l) => /^thin: |^drift /.test(l) })}
    <div class="abs meter hidden0"><div class="lbl"><b>${few} calls</b> in the window · <b>${need} needed</b> to call drift</div><div class="row">${slots}</div></div>
    ${Kit.term(D, { id: "s-unc", cap: "watch-up-uncommitted", x: 96, y: 262, w: 1728, h: 192, size: 19, cls: "hidden0" })}
    <div class="abs strayf hidden0"><span class="chip">one stray file · ${Film.esc(stray[1])}</span></div>
    ${stamp("real", "runs today", "watch, judging what an environment recorded in its files", 0)}
    ${stamp("staged", "staged", `the drift: one budget tightened, ${was} ms to ${tight} ms, then put back`, 1)}
    ${stamp("staged", "ours", `the traffic: ${back["handle.claim"]} claims and ${back["profile.get"]} reads, on one machine`, 2)}
    ${stamp("unshown", "not shown", "reading a hosted store, Axiom: it was not available to us", 3)}
    ${stamp("missing", "missing today", "comparing weeks: watch prints one window", 4)}
    ${stamp("missing", "missing today", "a schedule: nothing runs it for you; someone has to ask", 5)}
    ${Loc.bars("s-bars", Loc.ops(D.cap["watch-back"].out).map((o) => ({ ...o, drawn: true, mark: o.ok ? "ok" : "no", budgets: [o.budget], calls: back[o.op], counts: [back[o.op]] })), { top: 660, title: "the calls we made, judged against the blueprint" })}
    <div class="abs next hidden0"><span class="lbl" style="font-size:28px">Next ·</span><span class="chip">Change it, months later</span></div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // e1: calls under ortho dev are not watched.
    const loc = s.$("#s-local"); s.in(loc, s.start + 0.5, { y: 14 }); Loc.type(s, loc, c("e1", "Ortho"), 0.6);
    Loc.print(s, s.$$("#s-local .o"), c("e1", "watched"), 0.15);
    s.in(".devs", c("e1", "made"), { y: 10 });
    s.fromTo(".devs .dot", { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.12, ease: "back.out(2)" }, c("e1", "three"));
    s.to(".devs .dot", { opacity: 0.3, duration: 0.3 }, c("e1", "none")); s.in(".devs .cnt", c("e1", "none"), { x: -10, y: 0 });
    Loc.lit(s, "#s-local", Loc.rows(s, "#s-local", /^no calls in the window$/), c("e1", "none"));
    // e2: under twenty, the numbers are thin.
    const th = s.$("#s-thin"); s.in(th, c("e2") - 0.1, { y: 12, dur: 0.35 }); Loc.type(s, th, c("e2") + 0.1, 0.4);
    s.in(".meter", c("e2", "few"), { y: 10 }); s.fromTo(".meter .slot.got", { autoAlpha: 0, scale: 1.4 }, { autoAlpha: 1, scale: 1, duration: 0.25, stagger: 0.12 }, c("e2", "few") + 0.2);
    s.fromTo(".meter .slot.want", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, stagger: 0.03 }, c("e2", "Under"));
    const thinRow = Loc.rows(s, "#s-thin", /^thin: /), drRow = Loc.rows(s, "#s-thin", /^drift none$/);
    Loc.print(s, [...thinRow, ...drRow], c("e2", "Watch"), 0.3); Loc.lit(s, "#s-thin", thinRow, c("e2", "thin")); Loc.lit(s, "#s-thin", [...thinRow, ...drRow], c("e2", "drift"));
    // e3: an environment starts only from committed work.
    const t3 = c("e3");
    s.out("#s-local, .devs", t3 - 0.35, { dur: 0.3 }); const un = s.$("#s-unc"); s.in(un, t3, { y: 12, dur: 0.35 }); Loc.type(s, un, c("e3", "environment"), 0.7);
    s.in(".strayf", c("e3", "stray"), { y: 10 }); const unRows = s.$$("#s-unc .o"); Loc.print(s, unRows, c("e3", "refused") - 0.3, 0.12);
    Loc.lit(s, "#s-unc", Loc.rows(s, "#s-unc", /^refused: /), c("e3", "refused"));
    // e4, e5: how this stands.
    const t4 = c("e4");
    s.out("#s-thin, .meter, #s-unc, .strayf", t4 - 0.4, { dur: 0.35 });
    [[".st0", c("e4", "honest")], [".st1", c("e4", "staged")], [".st2", c("e4", "traffic")], [".st3", c("e4", "axiom")], [".st4", c("e5", "Prince")], [".st5", c("e5", "nothing")]].forEach(([sel, t]) => s.in(sel, t, { x: -14, y: 0, dur: 0.4 }));
    s.fromTo("#s-bars", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, immediateRender: false }, c("e4", "traffic"));
    s.to("#s-bars", { autoAlpha: 0, duration: 0.35 }, c("e5") - 0.45);
    s.fromTo(".st5 span", { opacity: 0.6 }, { opacity: 1, duration: 0.3 }, c("e5", "ask"));
    s.in(".next", c("e5", "Next"), { y: 10 });
  },
});
