// Sheet 5. The page ends with doubts, each sorted; it asks one question first; and how this stands: a real page, half a session, and practice.
Film.scene("doubts", {
  step: "doubts",
  html: (D) => {
    const P = Loc.page(D), esc = Film.esc, doubts = P.part("Doubts"), first = P.part("First question");
    const list = doubts.lines.map((l) => { const m = /^- (.+) (Spike|Blank)\.$/.exec(l); if (!m) throw new Error("doubts: a doubt is sorted neither Spike nor Blank: " + l); return { text: m[1], sort: m[2] }; });
    // The narration counts them aloud.
    const spoken = D.timing.scenes.flatMap((sc) => sc.lines).find((l) => l.id === "d2"), words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    if (!spoken || !spoken.text.toLowerCase().startsWith(words[list.length] + " doubts")) throw new Error("doubts: the page has " + list.length + " doubts, and the narration counts another number");
    if (list.length !== 7) throw new Error("doubts: the page no longer has seven doubts");
    const why = first.lines.find((l) => l.startsWith("Why: ")), ask = first.lines.find((l) => l.endsWith("?")); if (!why || !ask) throw new Error("doubts: the first question lost its question or its reason");
    const count = (w) => list.filter((d) => d.sort === w).length;
    return `${Kit.css}${Loc.css("doubts")}<style>
      #scene-doubts .count { left: 96px; top: 280px; font-size: 40px; font-weight: 500; letter-spacing: -.01em; line-height: 44px; }
      #scene-doubts .colh { position: absolute; top: 284px; width: 548px; display: flex; align-items: baseline; gap: 14px; white-space: nowrap; } #scene-doubts .colh .lbl { font-size: 24px; color: var(--paper); } #scene-doubts .colh b { font-family: var(--mono); font-weight: 500; font-size: 24px; color: var(--muted); }
      #scene-doubts .doubt { position: absolute; width: 548px; height: 88px; padding: 13px 18px; font-size: 22px; line-height: 30px; border: 1.5px solid var(--rule2); background: #0b1727; color: var(--paper); }
      #scene-doubts .doubt .sort { position: absolute; right: 12px; bottom: 11px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 20px; line-height: 26px; font-weight: 600; padding: 0 9px; border: 1.5px solid currentColor; color: var(--muted); background: #0b1727; }
      #scene-doubts .ask { left: 96px; top: 556px; width: 548px; height: 366px; padding: 16px 24px; border: 1.5px solid var(--paper); background: #0b1727; overflow: hidden; }
      #scene-doubts .ask .plbl { font-size: 24px; } #scene-doubts .ask .q { font-size: 33px; line-height: 1.24; font-weight: 500; letter-spacing: -.01em; margin-top: 8px; }
      #scene-doubts .ask .why { font-size: 22px; line-height: 1.3; color: var(--text2); margin-top: 12px; }
      #scene-doubts .ask .ans { position: absolute; left: 24px; right: 24px; bottom: 16px; height: 46px; display: flex; align-items: center; padding: 0 14px; border: 2px dashed var(--text2); font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; color: var(--paper); }
      #scene-doubts .next { left: 676px; top: 858px; display: flex; align-items: center; gap: 18px; white-space: nowrap; } #scene-doubts .next .lbl { font-size: 28px; } #scene-doubts .next .chip { font-family: var(--sans); font-size: 32px; padding: 12px 26px; border-color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">The doubts</div><div class="hl">A plan ends with what it doesn't know.</div></div>
    <div class="who">${Kit.who("designer", "the designer")}</div>
    <div class="abs count hidden0">${list.length} doubts<span class="mu">, each one a question</span></div>
    <div class="colh h-spike hidden0" style="left:96px"><span class="lbl">try it in throwaway code</span><b>${count("Spike")}</b></div>
    <div class="colh h-blank hidden0" style="left:676px"><span class="lbl">leave it blank, for you to decide</span><b>${count("Blank")}</b></div>
    ${list.map((d) => `<div class="doubt is-${d.sort.toLowerCase()} hidden0">${Loc.rich(d.text)}<span class="sort">${esc(d.sort)}</span></div>`).join("")}
    <div class="abs ask hidden0"><div class="plbl">${esc(first.name)}</div><div class="q hidden0">${Loc.rich(ask)}</div><div class="why hidden0">${Loc.rich(why)}</div><div class="ans hidden0">your answer · not given yet</div></div>
    <div class="abs next"><span class="lbl nx hidden0">Next ·</span><span class="chip nc hidden0">the doubts become spikes</span></div>
    <div class="st1 hidden0">${Kit.stand("practice", "this page is real, and it is half a session: the owner has not answered yet")}</div>
    <div class="st2 hidden0">${Kit.stand("missing", "no command runs a planning session", "left:96px;top:950px")}</div>
    ${Loc.sheet(D, ["The idea, said back", "Things", "Who may do what", "What must stay true", "What waits", "Where two places must agree"])}`;
  },
  build(s) {
    const c = s.cue, DOUBTS = "Doubts", FIRST = "First question", all = s.$$(".doubt"), X = [96, 676], TOP = 340, STEP = 98;
    // First in the page's own order, down two columns; then sorted on their words: Spike to the left, Blank to the right.
    const rows = Math.ceil(all.length / 2), placed = { spike: 0, blank: 0 };
    all.forEach((el, k) => {
      const col = k < rows ? 0 : 1, row = k < rows ? k : k - rows; el.style.left = X[col] + "px"; el.style.top = TOP + row * STEP + "px";
      const kind = el.classList.contains("is-spike") ? "spike" : "blank", to = { x: X[kind === "spike" ? 0 : 1] - X[col], y: (placed[kind]++ - row) * STEP };
      s.tl.to(el, { ...to, duration: 0.8, ease: "power2.inOut" }, c("d2", "sorted") + 0.03 * k);
    });
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(".pg", s.start + 0.3, { y: 0 });
    // d1, d2: the doubts, counted, then sorted.
    const t1 = c("d1", "what it");
    Loc.fill(s, DOUBTS, t1, 0.08); Loc.now(s, DOUBTS, t1);
    s.in(all, t1 + 0.1, { y: 0, stagger: 0.12, dur: 0.35 }); s.in(".count", c("d2", "Seven"), { y: 8 });
    s.out(".count", c("d2", "sorted") - 0.1, { dur: 0.3 });
    s.in(".h-spike", c("d2", "Try"), { y: 8 }); s.to(".is-spike", { borderColor: "#62c6ff", duration: 0.3 }, c("d2", "Try")); s.to(".is-spike .sort", { color: "#62c6ff", duration: 0.3 }, c("d2", "Try"));
    s.in(".h-blank", c("d2", "leave"), { y: 8 }); s.to(".is-blank", { borderStyle: "dashed", borderColor: "#e9f0fa", duration: 0.3 }, c("d2", "leave")); s.to(".is-blank .sort", { color: "#e9f0fa", duration: 0.3 }, c("d2", "leave"));
    Loc.lightMini(s, DOUBTS, / Spike\.$/, c("d2", "Try"));
    // d3: one question first.
    const t3 = c("d3", "asks");
    Loc.fill(s, FIRST, t3, 0.2); Loc.now(s, FIRST, t3); s.to(Loc.mini(s, DOUBTS, / Spike\.$/), { color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: 0.3 }, t3);
    s.in(".ask", c("d3", "one question"), { y: 12 }); s.in(".ask .q", c("d3", "Is this"), { y: 8 }); s.in(".ask .why", c("d3", "wallet") + 0.3, { y: 6 });
    s.to(".doubt", { opacity: 0.6, duration: 0.4 }, c("d3", "Is this"));
    // d4: how it stands: a real page, complete, and half a session.
    Loc.now(s, null, c("d4", "this page")); s.to(".pg", { borderColor: "#e9f0fa", duration: 0.35 }, c("d4", "this page"));
    s.in(".st1", c("d4", "real"), { y: 0 }); s.in(".ask .ans", c("d4", "answered"), { y: 0 });
    s.to(".doubt", { opacity: 1, duration: 0.4 }, c("d4", "nothing"));
    // d5: no command runs it; and what comes next.
    s.in(".st2", c("d5", "No command"), { y: 0 });
    s.in(".nx", c("d5", "Next"), { y: 0 }); s.in(".nc", c("d5", "doubts"), { y: 10 });
    s.to(".is-spike", { backgroundColor: "rgba(98,198,255,.2)", duration: 0.3 }, c("d5", "spikes")); Loc.lightMini(s, DOUBTS, / Spike\.$/, c("d5", "spikes"));
  },
});
