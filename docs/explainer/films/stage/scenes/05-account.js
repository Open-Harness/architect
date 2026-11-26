// Sheet 5. The step that needs your account: `ortho env up staging --run demo1` without the plan, replayed with no account,
// stops and names two values; three more early stops, replayed; and the film's honest note. The three stay outlines.
Film.scene("account", {
  step: "account",
  html: (D) => {
    const no = D.cap["stage-up-no-account"], plan = D.cap["stage-plan"];
    if (no.cmd.includes("--plan") || no.cmd !== plan.cmd.replace(" --plan", "")) throw new Error("account: the real run is not the plan's command without the word plan");
    const first = no.out.split("\n")[0], names = [...new Set(first.match(/\b[A-Z][A-Z0-9_]+_[A-Z0-9_]+\b/g) ?? [])];
    if (names.length !== 2 || !/are not set/.test(first) || !/no connection was made/.test(first)) throw new Error("account: the narration says two values not set and no connection; the recording says " + first);
    const bad = D.cap["stage-bad-run"], prove = D.cap["stage-prove-no-address"], promote = D.cap["stage-promote"];
    if (!/[A-Z]/.test(bad.cmd.split("--run ")[1] ?? "") || !/^--run needs/m.test(bad.out)) throw new Error("account: the bad run name is not refused for its capital");
    if (!/^ORTHO_STAGING_SUBDOMAIN is not set/m.test(prove.out) || !/no logbook/.test(promote.out)) throw new Error("account: proving or promoting no longer stops early");
    const keep = (l) => l.trim() !== "";
    return `${Kit.css}${Stg.css("account")}<style>
      #scene-account .vals { position: absolute; left: 96px; top: 512px; width: 1120px; display: flex; gap: 20px; }
      #scene-account .val { flex: 1; border: 2px dashed var(--paper); padding: 14px 22px; background: rgba(11,23,39,.85); }
      #scene-account .val .nm { font-family: var(--mono); font-size: 25px; margin-top: 8px; } #scene-account .val .lbl { display: flex; justify-content: space-between; }
      #scene-account .holder { position: absolute; left: 96px; top: 672px; display: flex; align-items: center; gap: 18px; font-size: 30px; }
      #scene-account .side { position: absolute; left: 1260px; top: 512px; width: 564px; display: flex; flex-direction: column; gap: 18px; }
      #scene-account .side .num { display: flex; align-items: baseline; gap: 16px; } #scene-account .side .num b { font-size: 56px; font-weight: 500; line-height: 1; } #scene-account .side .num span { font-size: 28px; color: var(--text2); }
      #scene-account .side .never { font-size: 30px; border-left: 2px solid var(--paper); padding-left: 18px; }
      #scene-account .pr { position: absolute; left: 96px; top: 742px; } #scene-account .pr .kstand { position: static; }
      #scene-account .triocap { left: 96px; top: 790px; }
      #scene-account .hnote { position: absolute; left: 96px; top: 280px; width: 1728px; }
      #scene-account .hnote .big { font-size: 60px; font-weight: 500; letter-spacing: -.02em; line-height: 1.15; margin-top: 10px; }
      #scene-account .hnote .b2 { position: absolute; left: 0; top: 34px; } #scene-account .hnote .sub { font-size: 32px; color: var(--text2); margin-top: 18px; }
      #scene-account .stands { position: absolute; left: 96px; top: 560px; display: flex; flex-direction: column; gap: 16px; }
      #scene-account .stands .kstand { position: static; font-size: 22px; }
      #scene-account .next { position: absolute; left: 1240px; top: 600px; display: flex; align-items: center; gap: 18px; }
      #scene-account .next .chip { font-family: var(--sans); font-size: 36px; padding: 14px 30px; border-color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">The step that needs your account</div><div class="hl">It stops before it touches anything.</div></div>
    <div class="who">${Kit.who("you")}</div>
    <div class="g1">
      ${Kit.term(D, { id: "ac-up", cap: "stage-up-no-account", x: 96, y: 262, w: 1728, h: 222, cls: "hidden0", tag: '<span class="tag">no --plan</span>' })}
      <div class="vals">${names.map((nm, k) => `<div class="val v${k} hidden0"><div class="lbl"><span>from your cloud account</span><span class="cy">not set</span></div><div class="nm">${Film.esc(nm)}</div></div>`).join("")}</div>
      <div class="pr hidden0">${Kit.stand("practice", "keeping them from an agent", "")}</div>
      <div class="holder hidden0">${Kit.who("you")}<span>yours · set where the command runs</span></div>
      <div class="side"><div class="num n1 hidden0"><b>${names.length}</b><span>values, not set</span></div>
                <div class="never hidden0">The framework never prints them.</div></div>
    </div>
    <div class="g2">
      ${Kit.term(D, { id: "ac-bad", cap: "stage-bad-run", x: 96, y: 262, w: 1728, h: 160, size: 19, keep, cls: "hidden0", tag: '<span class="tag">a capital letter</span>' })}
      ${Kit.term(D, { id: "ac-prove", cap: "stage-prove-no-address", x: 96, y: 434, w: 1728, h: 160, size: 19, keep, cls: "hidden0", tag: '<span class="tag">where your servers go</span>' })}
      ${Kit.term(D, { id: "ac-promote", cap: "stage-promote", x: 96, y: 606, w: 1728, h: 160, size: 19, keep, cls: "hidden0", tag: '<span class="tag">no logbook</span>' })}
    </div>
    <div class="hnote hidden0"><div class="lbl" style="font-size:24px">one honest note</div><div class="big b1">There is no real deployment in this film.</div><div class="big b2 hidden0">The path to a real address.<br><span class="mu">Not yet an address.</span></div>
      <div class="sub s1 hidden0">Everything you saw ran with no cloud account.</div></div>
    <div class="stands hidden0">
      <div class="st0">${Kit.stand("real", "the plan, the build, staging on your machine", "")}</div>
      <div class="st1">${Kit.stand("practice", "who holds the two values", "")}</div>
      <div class="st2">${Kit.stand("missing", "the real run: it waits on the owner's cloud credential", "")}</div>
    </div>
    <div class="next hidden0"><span class="lbl" style="font-size:28px">Next ·</span><span class="chip">watch it</span></div>
    <div class="triocap hidden0">the plan · nothing was made</div>
    ${Stg.trio(D, { id: "ac-trio", x: 96, y: 828, w: 1728, layout: "row" })}`;
  },
  build(s) {
    const c = s.cue, U = s.$("#ac-up"), names = s.$$(".val .nm").map((n) => n.textContent);
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in("#ac-trio", s.start + 0.5, { y: 12 });
    // a1: the same command, without the word plan.
    s.in(U, c("a1") + 0.2, { y: 12 });
    s.run(U, c("a1", "same command"), { type: Math.max(0.8, c("a1", "plan") - c("a1", "same command")), at: c("a2", "stops"), each: 0.12 });
    // a2: it stops, names two values, and says no connection was made.
    const row = s.$$("#ac-up .o")[0], m = names.map((nm) => Stg.mark(row, nm)), none = Stg.mark(row, "no connection was made");
    Stg.lit(s, "#ac-up", [row], c("a2", "names"));
    Stg.hit(s, m[0], c("a2", "two values")); Stg.hit(s, m[1], c("a2", "two values") + 0.3);
    s.in(".n1", c("a2", "two values"), { x: 14, y: 0, dur: 0.35 });
    s.in(".val", c("a2", "account"), { y: 12, stagger: 0.15 });
    Stg.hit(s, none, c("a2", "connection")); s.in(".triocap", c("a2", "connection"), { y: 6 });
    // a3: they are yours; keeping them from an agent is practice; the framework never prints them.
    s.in(".holder", c("a3", "yours"), { x: 14, y: 0 }); s.to(".val", { borderColor: "#e9f0fa", borderStyle: "solid", duration: 0.3 }, c("a3", "set them"));
    s.in(".pr", c("a3", "Keeping"), { x: 14, y: 0 }); s.in(".never", c("a3", "never"), { x: 14, y: 0 });
    // a4: three more early stops, one after another.
    const t4 = c("a4");
    s.out(".g1", t4 - 0.2, { dur: 0.35 });
    [["#ac-bad", "capital", "run name", "Demo-1"], ["#ac-prove", "proving", "servers", "ORTHO_STAGING_SUBDOMAIN is not set"], ["#ac-promote", "promote", "logbook", "no logbook"]].forEach(([id, w, w2, words]) => {
      const el = s.$(id); s.in(el, c("a4", w) - 0.4, { y: 12, dur: 0.35 });
      s.run(el, c("a4", w) - 0.2, { type: 0.6, at: c("a4", w) + 0.6, each: 0.1 });
      const out = s.$$(id + " .o")[0]; Stg.hit(s, Stg.mark(out, words), c("a4", w2));
    });
    // a5: the honest note. a6: the path, not yet an address. Next: watch it.
    const t5 = c("a5");
    s.out(".g2", t5 - 0.3, { dur: 0.35 }); s.to(".triocap", { autoAlpha: 0, duration: 0.2 }, t5 - 0.3);
    s.in(".hnote", c("a5", "no real"), { y: 14 });
    s.in(".stands", c("a5", "waits") - 0.3, { y: 0, dur: 0.01 });
    s.fromTo(".stands > div", { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.25 }, c("a5", "waits") - 0.3);
    s.to(".st2 .kstand", { color: "#e9f0fa", duration: 0.3 }, c("a5", "credential"));
    s.in(".s1", c("a5", "Everything"), { y: 8 });
    s.out(".b1, .s1", c("a6") - 0.3, { dur: 0.3 }); s.in(".b2", c("a6", "path"), { y: 10 });
    s.in(".next", c("a6", "Next"), { x: 14, y: 0 });
  },
});
