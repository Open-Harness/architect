// Sheet 5. How to read the manual: the one app it follows, its spine drawn from docs/manual/spine.json, how its print stands, and
// the chapter the next film is for. No chapter title is typed here: each is read from the spine.
Film.scene("how", {
  step: "how",
  html: (D) => {
    const raw = D.repo["docs/manual/spine.json"]; if (raw === undefined) throw new Error("how: the manual's spine was not loaded");
    const spine = JSON.parse(raw), parts = spine.parts, chapters = parts.flatMap((p) => p.chapters);
    if (parts.length !== 4) throw new Error("how: the narration names four parts, the spine has " + parts.length);
    if (chapters.length !== 11) throw new Error("how: the narration says eleven chapters, the spine has " + chapters.length);
    if (!chapters.some((ch) => ch.n === 1)) throw new Error("how: the spine has no chapter 1");
    const written = chapters.filter((ch) => ch.file).length, things = D.facts.things, ops = D.facts.operations.length;
    const count = `<span class="tally">${things.length} things · ${ops} operations</span>`;
    return `${Kit.css}${Loc.css("how")}<style>
      #scene-how .app { left: 96px; top: 280px; width: 1104px; height: 172px; border: 1.5px solid var(--paper); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); padding: 18px 28px; }
      #scene-how .app .row { display: flex; align-items: center; gap: 16px; } #scene-how .app .title { font-size: 50px; line-height: 1.1; font-weight: 500; letter-spacing: -.015em; margin-right: 14px; } #scene-how .app .chip { font-size: 24px; }
      #scene-how .app .lbl { font-size: 22px; } #scene-how .app .gets { margin-top: 14px; font-size: 34px; line-height: 1.2; color: var(--text2); } #scene-how .app .gets b { font-weight: 500; color: var(--paper); }
      #scene-how .tally { font-family: var(--mono); font-size: 22px; color: var(--paper); white-space: nowrap; }
      #scene-how .top5 { left: 96px; top: 474px; width: 1728px; display: flex; justify-content: space-between; align-items: baseline; } #scene-how .top5 .lbl { font-size: 24px; } #scene-how .top5 .lbl b { color: var(--paper); font-weight: 600; }
      #scene-how .part { position: absolute; top: 516px; width: 414px; opacity: .4; } #scene-how .part .ptitle { font-size: 32px; line-height: 40px; font-weight: 500; letter-spacing: -.01em; border-bottom: 2px solid var(--rule2); padding-bottom: 6px; white-space: nowrap; }
      #scene-how .chap { position: relative; margin-top: 10px; height: 88px; display: flex; align-items: center; gap: 16px; padding: 0 18px; border: 1.5px solid var(--rule2); background: rgba(14,28,48,.9); }
      #scene-how .chap.planned { border-style: dashed; } #scene-how .chap i { flex: none; width: 40px; font: 500 30px var(--mono); font-style: normal; color: var(--muted); text-align: right; } #scene-how .chap span { font-size: 26px; line-height: 1.2; }
      #scene-how .chap .next { position: absolute; right: 16px; top: 29px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; line-height: 28px; padding: 0 12px; color: var(--bg); background: var(--paper); }
      #scene-how .kstand span { font-size: 22px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">How to read this manual</div><div class="hl">One small app, start to finish.</div></div>
    <div class="who">${Kit.who("you")}</div>
    <div class="abs app hidden0"><div class="row"><span class="title">Plugged In</span>${things.map((name) => `<span class="chip thing hidden0">${Film.esc(name)}</span>`).join("")}<span class="lbl thing hidden0">its things</span></div>
      <div class="gets"><span class="g1 hidden0">a person claims <b>a name</b>,</span> <span class="g2 hidden0">and gets <b>a public page of links</b></span></div></div>
    ${Loc.stack({ id: "hw-stack", x: 1264, y: 280, w: 560, h: [48, 54, 54], gap: 8, subs: false, bars: false, cls: "mini hidden0", top: count })}
    <div class="abs top5"><span class="lbl many hidden0"><b>${chapters.length} chapters</b> · ${parts.length} parts · in the order things happen</span><span class="lbl key hidden0">solid: written (${written}) · dashed: not written yet (${chapters.length - written})</span></div>
    ${parts.map((p, k) => `<div class="part pt${k}" style="left:${96 + k * 438}px"><div class="ptitle">${Film.esc(p.title)}</div>${p.chapters.map((ch) => `<div class="chap ${ch.file ? "" : "planned"} ch${ch.n}"><i>${ch.n}</i><span>${Film.esc(ch.title)}</span>${ch.n === 1 ? '<b class="next hidden0">the next film</b>' : ""}</div>`).join("")}</div>`).join("")}
    <div class="real hidden0">${Kit.stand("real", "everything a chapter prints was recorded from a real run", "left:96px;top:896px")}</div>
    <div class="gap hidden0">${Kit.stand("missing", "where something does not exist yet, the chapter says so", "left:96px;top:940px")}</div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    s.fromTo(".part", { autoAlpha: 0, y: 14 }, { autoAlpha: 0.4, y: 0, duration: 0.5, stagger: 0.08 }, s.start + 0.5);
    // h1: the one app, its things, and what a person gets.
    s.in(".app", c("h1", "manual"), { y: 14 }); s.in(".thing", c("h1", "plugged"), { y: 8, dur: 0.3, stagger: 0.1 });
    s.in("#hw-stack", c("h1", "plugged") + 0.3, { y: 14 }); Loc.light(s, s.$("#hw-stack .top"), c("h1", "plugged") + 0.6);
    s.in(".g1", c("h1", "person"), { y: 8, dur: 0.4 }); s.in(".g2", c("h1", "gets"), { y: 8, dur: 0.4 });
    // h2: eleven chapters, four parts, lit part by part.
    s.in(".many", c("h2"), { y: 0 }); s.in(".key", c("h2", "order"), { y: 0 });
    [["before"], ["Build"], ["Run"], ["Live"]].forEach(([word], k) => { const t = c("h2", word); s.to(".pt" + k, { opacity: 1, duration: 0.35 }, t); s.to(".pt" + k + " .ptitle", { borderBottomColor: "#e9f0fa", duration: 0.35 }, t); });
    // h3: how its print stands.
    s.in(".real", c("h3", "recorded"), { y: 0 }); s.in(".gap", c("h3", "doesn't"), { y: 0 });
    // h4: and the next film is chapter 1.
    const t4 = c("h4", "start");
    s.to(s.$$(".chap").filter((el) => !el.classList.contains("ch1")), { opacity: 0.5, duration: 0.5 }, t4); s.to(".ptitle", { opacity: 0.6, duration: 0.5 }, t4);
    s.to(".ch1", { borderColor: "#e9f0fa", backgroundColor: "rgba(233,240,250,.13)", duration: 0.4 }, t4); s.in(".next", t4 + 0.1, { y: 0, dur: 0.3 });
    s.fromTo(".ch1", { scale: 1 }, { scale: 1.06, duration: 0.3, yoyo: true, repeat: 1, ease: "power2.inOut" }, c("h4", "plan"));
  },
});
