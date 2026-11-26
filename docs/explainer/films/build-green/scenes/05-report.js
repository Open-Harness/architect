// Sheet 5. What you read: the verdict lines. What a builder does when a journey looks wrong. And the film's own note: a replay.
Film.scene("report", {
  step: "report",
  html: (D) => {
    const h = Loc.handler(D, 2), full = D.cap["prove"].out.split("\n");
    if (!/^prove ✔$/.test(full[full.length - 1])) throw new Error("report: the full run does not end with prove ✔");
    const rung = (r, k) => `<div class="chipr"><span>rung ${k}</span><b class="${r.ok ? "gr" : "rd"}">${r.green}/${r.steps}</b></div>`;
    return `${Kit.css}${Loc.css("report")}<style>
      #scene-report #rp-ed { filter: blur(5px); height: 600px; overflow: hidden; } #scene-report .never { left: 1160px; top: 500px; padding: 16px 26px; border: 1.5px solid var(--paper); background: #0b1727; font-size: 34px; font-weight: 500; }
      #scene-report .reads { left: 96px; top: 690px; display: flex; gap: 18px; } #scene-report .reads .chip { font-family: var(--sans); font-size: 28px; padding: 12px 24px; }
      #scene-report .box { position: absolute; height: 210px; padding: 20px 26px; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); } #scene-report .box .txt { font-size: 38px; line-height: 1.2; font-weight: 500; margin-top: 14px; }
      #scene-report .box.then { border-color: var(--paper); } #scene-report .to { position: absolute; font-size: 44px; color: var(--muted); }
      #scene-report .nots { position: absolute; left: 1420px; width: 404px; display: flex; flex-direction: column; gap: 22px; justify-content: center; height: 210px; }
      #scene-report .not { position: relative; align-self: flex-start; font-size: 32px; color: var(--text2); } #scene-report .not i { position: absolute; left: -6px; right: -6px; top: 54%; height: 3px; background: var(--red); transform-origin: 0 50%; }
      #scene-report .replay { left: 96px; top: 300px; right: 96px; } #scene-report .replay .big { font-size: 76px; font-weight: 500; letter-spacing: -.02em; line-height: 1.1; }
      #scene-report .chips { display: flex; gap: 16px; margin-top: 44px; } #scene-report .chipr { display: flex; align-items: baseline; gap: 14px; padding: 10px 22px; border: 1.5px solid var(--rule2); background: rgba(14,28,48,.9); }
      #scene-report .chipr span { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 24px; font-weight: 600; color: var(--muted); } #scene-report .chipr b { font-family: var(--mono); font-size: 34px; font-weight: 500; }
      #scene-report .facts { display: flex; flex-direction: column; gap: 12px; margin-top: 44px; font-size: 36px; color: var(--text2); } #scene-report .facts b { color: var(--paper); font-weight: 500; }
      #scene-report .close { left: 96px; top: 330px; right: 96px; } #scene-report .close .big { font-size: 64px; font-weight: 500; letter-spacing: -.02em; line-height: 1.15; }
      #scene-report .next { display: flex; align-items: center; gap: 18px; margin-top: 70px; } #scene-report .next .chip { font-family: var(--sans); font-size: 36px; padding: 14px 30px; border-color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">What you read</div><div class="hl">You read the verdicts, not the code.</div></div>
    <div class="who">${Kit.who("you")}</div>
    ${Kit.term(D, { id: "rp-term", cap: "prove", x: 96, y: 262, w: 880, h: 392, cls: "h1", tag: '<span class="tag">the report you read</span>', keep: (l) => l.startsWith("journey ") || /^prove /.test(l) })}
    ${Kit.ed(D, { id: "rp-ed", text: h.text, path: h.path, x: 1010, y: 262, w: 814, from: h.from, size: "small", cls: "h1" })}
    <div class="abs never h1 hidden0">you never open this</div>
    <div class="abs reads h1"><span class="chip r1 hidden0">one line for each journey</span><span class="chip r2 hidden0">the last line of the full run</span></div>
    <div class="h2">
      <div class="box b1 hidden0" style="left:96px;top:300px;width:620px">${Kit.who("builder", "the builder")}<div class="txt">says a journey is wrong</div></div><div class="to t1 hidden0" style="left:738px;top:372px">→</div>
      <div class="box then b2 hidden0" style="left:810px;top:300px;width:570px">${Kit.who("author", "the author")}<div class="txt">it stops, and tells the author</div></div>
      <div class="nots" style="top:300px"><div class="not n1 hidden0">edit the story<i></i></div><div class="not n2 hidden0">work round it<i></i></div></div>
      <div class="box b3 hidden0" style="left:96px;top:590px;width:620px"><div class="lbl">a handler</div><div class="txt">decides something the blueprint never said</div></div><div class="to t3 hidden0" style="left:738px;top:662px">→</div>
      <div class="box then b4 hidden0" style="left:810px;top:590px;width:570px"><div class="lbl">review</div><div class="txt">a finding for review</div></div>
    </div>
    <div class="abs replay hidden0"><div class="lbl" style="font-size:24px">one honest note</div><div class="big">What you watched is a replay.</div>
      <div class="chips">${D.facts.climb.map(rung).join("")}</div>
      <div class="facts"><div class="f1 hidden0"><b>One handler</b> at three points.</div><div class="f2 hidden0"><b>The real run</b> recorded at each.</div><div class="f3 hidden0"><b>No agent</b> was filmed writing it.</div></div></div>
    <div class="abs close hidden0"><div class="big">The loop is real.<br><span class="alone hidden0">An agent can run it alone.</span></div>
      <div class="next"><span class="lbl nx hidden0" style="font-size:28px">Next ·</span><span class="chip k1 hidden0">run it</span><span class="chip k2 hidden0">break it</span><span class="chip k3 hidden0">read the trace</span></div></div>
    <div class="stand hidden0">${Kit.stand("practice", "one handler for each builder")}</div>`;
  },
  build(s) {
    const c = s.cue, rows = s.$$("#rp-term .o"), js = rows.filter((o) => o.textContent.startsWith("journey ")), last = rows[rows.length - 1];
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // h1: none of the code; one line for each journey, and the last line.
    s.fromTo("#rp-ed", { autoAlpha: 0 }, { autoAlpha: 0.5, duration: 0.5 }, s.start + 0.5); s.in(".never", c("h1", "none"), { y: 10 });
    s.in("#rp-term", s.start + 0.5, { y: 14 }); Loc.type(s, s.$("#rp-term"), s.start + 0.7, 0.4); Loc.print(s, rows, c("h1", "You read", 2) - 0.3, 0.06);
    Loc.lit(s, "#rp-term", js, c("h1", "one line")); s.in(".r1", c("h1", "one line"), { y: 10 });
    Loc.lit(s, "#rp-term", rows, c("h1", "last line")); s.to(last, { backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, c("h1", "last line") + 0.05); s.in(".r2", c("h1", "last line"), { y: 10 });
    // h2: a journey that looks wrong.
    const t2 = c("h2");
    s.out(".h1", t2 - 0.4, { dur: 0.35 });
    s.in(".b1", t2 + 0.1, { y: 14 }); s.in(".t1, .b2", c("h2", "stops"), { x: -14, y: 0, stagger: 0.1 });
    [[".n1", "edit"], [".n2", "work"]].forEach(([sel, w]) => { s.in(sel, c("h2", w), { y: 8, dur: 0.3 }); s.fromTo(sel + " i", { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, c("h2", w) + 0.3); });
    s.in(".stand", c("h2", "stops") + 0.6, { y: 0 });
    // h3: a handler that decides.
    s.in(".b3", c("h3") + 0.1, { y: 14 }); s.in(".t3, .b4", c("h3", "finding"), { x: -14, y: 0, stagger: 0.1 });
    // h4: the honest note.
    const t4 = c("h4");
    s.out(".h2, .stand", t4 - 0.35, { dur: 0.3 }); s.in(".replay", t4 + 0.05, { y: 0 });
    s.fromTo(".replay .big", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5 }, c("h4", "what you")); s.fromTo(".chipr", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.15 }, c("h4", "three points") - 0.3);
    s.in(".f1", c("h4", "one handler"), { y: 8 }); s.in(".f2", c("h4", "recorded"), { y: 8 }); s.in(".f3", c("h4", "No agent"), { y: 8 });
    // h5: the close.
    const t5 = c("h5");
    s.out(".replay", t5 - 0.4, { dur: 0.35 }); s.in(".close", t5, { y: 14 }); s.in(".alone", c("h5", "agent"), { y: 8 });
    s.in(".nx", c("h5", "Next"), { y: 0 }); s.in(".k1", c("h5", "run the app"), { y: 10 }); s.in(".k2", c("h5", "break"), { y: 10 }); s.in(".k3", c("h5", "read"), { y: 10 });
  },
});
