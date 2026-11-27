// Sheet 1. A change has come back: the two lines of claim's declaration you asked about, as they stood before it, the nine
// files the change touched (from review-stat), and the hand-over to a reviewer that wrote none of it.
Film.scene("hand", {
  step: "hand",
  html: (D) => {
    const F = Rv.facts(D), file = "blueprint/things/handle/verbs/claim.ts", text = D.src[file];
    const desc = Kit.line(text, /^\s*description: /), budget = Kit.line(text, /^\s*budget: \{ p95: /);
    // The lines the diff takes out are the lines this editor shows, so the quote is the "before" the change starts from.
    const lines = text.split("\n");
    Rv.must(F.df.outs.map((l) => l.slice(1)).join("\n") === [lines[desc - 1], lines[budget - 1]].join("\n"), "the editor's two lines are not what the change took out");
    return `${Kit.css}${Rv.css("hand")}<style>
      #scene-hand #hd-ed .tag { color: var(--text2); }
      #scene-hand .nine { left: 96px; top: 700px; }
      #scene-hand .rv { left: 96px; top: 290px; width: 760px; height: 370px; border-color: var(--cyan); }
      #scene-hand .rv .kbig { margin-top: 26px; }
      #scene-hand .given { left: 930px; width: 894px; } #scene-hand .given .kbig { font-size: 36px; }
      #scene-hand .given .ask { font-size: 32px; line-height: 1.35; color: var(--paper); } #scene-hand .given .ask::before { content: "·"; color: var(--muted); margin-right: 14px; }
      #scene-hand .arr { position: absolute; left: 872px; font-size: 40px; color: var(--muted); line-height: 1; }
      #scene-hand .verbs { left: 96px; top: 700px; display: flex; gap: 18px; align-items: center; }
      #scene-hand .verbs .chip { font-family: var(--sans); font-size: 30px; padding: 10px 24px; }
      #scene-hand .verbs .none { position: relative; color: var(--muted); } #scene-hand .verbs .none i { position: absolute; left: 12px; right: 12px; top: 52%; height: 2px; background: var(--paper); transform-origin: 0 50%; }
      #scene-hand .verbs .it { font-size: 30px; color: var(--muted); margin-right: 4px; }
    </style>
    <div class="head"><div class="eyebrow">The hand-over</div><div class="hl">A change has come back.</div></div>
    <div class="who">${Kit.who("you")}<span class="arrow hidden0">→</span><span class="to hidden0">${Kit.who("agent", "the reviewer")}</span></div>
    ${Kit.ed(D, { id: "hd-ed", file, x: 96, y: 262, w: 1728, size: "small", cls: "ph1", tag: `<span class="tag">before the change · ${F.df.hunks.length} things you asked about</span>` })}
    <div class="abs nine ph1 hidden0"><div class="say">You should not have to read ${F.st.total} files.</div></div>
    <div class="kbox rv ph2 hidden0">${Kit.who("agent", "the reviewer")}<div class="kbig">An agent that<br>wrote none of it.</div><div class="kbig mu" style="font-size:30px;margin-top:22px">It had no part in the work.</div></div>
    <div class="arr a1 ph2 hidden0" style="top:340px">←</div><div class="arr a2 ph2 hidden0" style="top:530px">←</div>
    <div class="kbox given g1 ph2 hidden0" style="top:290px;height:170px"><div class="lbl">given · the change</div><div class="kbig">${F.st.total} files: ${F.st.bp.length} blueprint, ${F.st.gen.length} generated</div></div>
    <div class="kbox given g2 ph2 hidden0" style="top:480px;height:180px"><div class="lbl">given · the brief it was made from · your ${F.df.hunks.length} sentences</div><div class="ask">a plainer description</div><div class="ask">a tighter time budget</div></div>
    <div class="abs verbs hidden0"><span class="it">it</span><span class="chip none v0">touches<i></i></span><span class="chip v1 hidden0">reads</span><span class="chip v2 hidden0">runs commands</span><span class="chip v3 hidden0">reports</span></div>
    ${Rv.tiles(D, "the change that came back")}`;
  },
  build(s) {
    const c = s.cue, body = s.$("#hd-ed .code"), text = s.D.src["blueprint/things/handle/verbs/claim.ts"];
    const desc = Kit.line(text, /^\s*description: /), budget = Kit.line(text, /^\s*budget: \{ p95: /);
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // a1: the two things you asked for, on the lines they are about.
    s.in("#hd-ed", s.start + 0.6, { y: 14 });
    s.focus(body, [desc, desc], c("a1", "description")); s.in(Kit.call(s, body, desc, "plainer"), c("a1", "description") + 0.05, { x: 14, y: 0, dur: 0.35 });
    s.to(body.querySelector(`.ln[data-n="${budget}"]`), { opacity: 1, backgroundColor: "rgba(98,198,255,.1)", boxShadow: "inset 3px 0 0 #62c6ff", duration: 0.4 }, c("a1", "budget"));
    s.in(Kit.call(s, body, budget, "tighter"), c("a1", "budget") + 0.05, { x: 14, y: 0, dur: 0.35 });
    // a2: nine files changed.
    s.in(".tiles .lbl", c("a2", "Nine") - 0.1, { y: 8, dur: 0.3 }); s.in(".tile", c("a2", "Nine"), { y: 12, dur: 0.35, stagger: 0.07 });
    s.in(".nine", c("a2", "should"), { y: 12 });
    // a3: the reviewer.
    const t3 = c("a3");
    s.out(".ph1", t3 - 0.35, { dur: 0.3 });
    s.in(".who .arrow, .who .to", c("a3", "reviewer"), { x: -10, y: 0, stagger: 0.1 });
    s.in(".rv", c("a3", "reviewer"), { y: 14 });
    // a4: given two things: the change, and the brief.
    s.in(".a1, .g1", c("a4", "change"), { x: 14, y: 0, stagger: 0.08 });
    s.fromTo(".tile", { borderColor: "rgba(132,170,222,.36)" }, { borderColor: "#62c6ff", duration: 0.3, yoyo: true, repeat: 1 }, c("a4", "change"));
    s.in(".a2, .g2", c("a4", "brief"), { x: 14, y: 0, stagger: 0.08 });
    s.fromTo(".g2 .ask", { color: "#a9bcd6" }, { color: "#e9f0fa", duration: 0.3, stagger: 0.25 }, c("a4", "sentences") - 0.3);
    // a5: it touches nothing. It reads, it runs commands, it reports.
    s.in(".verbs", c("a5", "touches") - 0.1, { y: 10 });
    s.fromTo(".verbs .none i", { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, c("a5", "nothing"));
    s.in(".v1", c("a5", "reads"), { y: 8, dur: 0.3 }); s.in(".v2", c("a5", "runs"), { y: 8, dur: 0.3 }); s.in(".v3", c("a5", "reports"), { y: 8, dur: 0.3 });
  },
});
