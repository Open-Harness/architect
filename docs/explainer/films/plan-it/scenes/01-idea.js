// Sheet 1. The page, empty, with the names of its parts; the owner's one sentence; and what the designer is given.
Film.scene("idea", {
  step: "idea",
  html: (D) => {
    const P = Loc.page(D), esc = Film.esc;
    // The owner's sentence is the narration's own line, shown as its caption; the page's first line quotes the idea in three words.
    const spoken = D.timing.scenes.flatMap((sc) => sc.lines).find((l) => l.id === "i3"); if (!spoken) throw new Error("idea: the script has no line i3");
    const said = spoken.text.match(/[^.]+\./g); if (!said || said.length !== 2) throw new Error("idea: the owner's sentence is no longer two sentences");
    if (!D.facts.things.length) throw new Error("idea: the app has no things");
    return `${Kit.css}${Loc.css("idea")}<style>
      #scene-idea .fits { left: 96px; top: 282px; width: 1128px; }
      #scene-idea .fits .count { font-size: 64px; font-weight: 500; letter-spacing: -.02em; line-height: 1.1; }
      #scene-idea .fits .names { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; grid-auto-flow: column; grid-template-rows: repeat(4, 112px); column-gap: 40px; }
      #scene-idea .fits .nm { display: flex; align-items: baseline; gap: 20px; font-size: 34px; white-space: nowrap; font-weight: 500; color: var(--text2); border-top: 1px solid var(--rule2); padding-top: 22px; }
      #scene-idea .fits .nm i { font-family: var(--mono); font-style: normal; font-size: 24px; color: var(--muted); }
      #scene-idea .say { left: 96px; top: 282px; width: 1128px; padding: 24px 30px 30px; border: 1.5px solid var(--paper); background: #0b1727; }
      #scene-idea .say .top { display: flex; align-items: center; gap: 18px; margin-bottom: 20px; } #scene-idea .say .top .chip { margin-left: auto; font-family: var(--sans); font-size: 24px; color: var(--text2); } #scene-idea .say .top .chip b { color: var(--paper); font-weight: 500; }
      #scene-idea .say .words { font-size: 42px; line-height: 1.28; font-weight: 500; letter-spacing: -.01em; } #scene-idea .say .sent { display: block; }
      #scene-idea .give { position: absolute; left: 96px; width: 560px; padding: 14px 22px 16px; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); }
      #scene-idea .give .what { font-size: 34px; font-weight: 500; line-height: 1.2; } #scene-idea .give .chips { display: flex; gap: 12px; margin-top: 12px; }
      #scene-idea .give.not { border-style: dashed; display: flex; align-items: baseline; gap: 20px; white-space: nowrap; width: 700px; } #scene-idea .give.not .what { color: var(--text2); font-size: 30px; }
      #scene-idea .dz { left: 800px; top: 685px; } #scene-idea .dz .kwho { font-size: 30px; padding: 12px 24px; background: #0b1727; }
    </style>
    <div class="head"><div class="eyebrow">Plan it</div><div class="hl">It starts as one sentence.</div></div>
    <div class="who">${Kit.who("you")}</div>
    <div class="abs fits"><div class="count hidden0">One page. <span class="mu">${P.parts.length} parts.</span></div>
      <div class="names">${P.parts.map((p, k) => `<div class="nm hidden0"><i>${k + 1}</i>${esc(p.name)}</div>`).join("")}</div></div>
    <div class="abs say hidden0"><div class="top">${Kit.who("you")}<span class="lbl">one sentence, in your words</span><span class="chip hidden0">the page calls it <b>"${esc(P.about)}"</b></span></div>
      <div class="words">${said.map((w) => `<span class="sent hidden0">${esc(w.trim())} </span>`).join("")}</div></div>
    <div class="give g1 hidden0" style="top:600px"><div class="lbl">given</div><div class="what">your sentence</div></div>
    <div class="give g2 hidden0" style="top:708px"><div class="lbl"><span class="today">Plugged In today</span></div><div class="what hidden0">the app as it stands</div><div class="chips">${D.facts.things.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div></div>
    <div class="give not g3 hidden0" style="top:884px"><div class="lbl">not given</div><div class="what">nothing about how to build it</div></div>
    <svg class="ink"><path class="a1" d="M656 650 H730 V710 H792"/><path class="a2" d="M656 787 H730 V728 H792"/><path class="a1h" d="M782 702 L794 710 L782 718"/><path class="a2h" d="M782 720 L794 728 L782 736"/></svg>
    <div class="abs dz hidden0">${Kit.who("designer", "the designer")}</div>
    ${Loc.sheet(D)}`;
  },
  build(s) {
    const c = s.cue;
    s.$$("svg.ink path").forEach((p) => gsap.set(p, { autoAlpha: 0 }));
    // i1: the empty page, and the names of what it will hold.
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(".pg", s.start + 0.5, { y: 14 });
    s.in(".fits .nm", c("i1", "talk"), { y: 10, stagger: 0.2, dur: 0.4 });
    s.in(".fits .count", c("i1", "one page"), { y: 10 });
    s.to(".pg", { borderColor: "#e9f0fa", duration: 0.35 }, c("i1", "one page")); s.to(".pg", { borderColor: "rgba(132,170,222,.36)", duration: 0.5 }, c("i2") + 0.2);
    // i2: one sentence, and a real one.
    s.out(".fits", c("i2") - 0.1, { dur: 0.35 });
    s.in(".say", c("i2", "one sentence"), { y: 14 }); s.in(".say .chip", c("i2", "real"), { x: 12, y: 0 });
    s.in(".g2", c("i2", "plugged"), { y: 12 });
    // i3: the sentence itself.
    const sent = s.$$(".say .sent"); s.in(sent[0], c("i3", "People"), { y: 6, dur: 0.4 }); s.in(sent[1], c("i3", "handle"), { y: 6, dur: 0.4 });
    // i4: what the designer is given, and what it is not.
    s.in(".g1", c("i4", "That"), { y: 12 }); s.in(".dz", c("i4", "designer"), { x: -12, y: 0 });
    s.draw(".a1", c("i4", "designer") + 0.15, 0.5); s.in(".a1h", c("i4", "designer") + 0.6, { y: 0, dur: 0.2 });
    s.in(".g3", c("i4", "given"), { y: 12 });
    s.to(".g2", { borderColor: "#e9f0fa", duration: 0.3 }, c("i4", "app")); s.in(".g2 .what", c("i4", "app"), { y: 6, dur: 0.35 });
    s.to(".g2 .today", { color: "#7389a6", duration: 0.3 }, c("i4", "app"));
    s.draw(".a2", c("i4", "app") + 0.1, 0.5); s.in(".a2h", c("i4", "app") + 0.55, { y: 0, dur: 0.2 });
  },
});
