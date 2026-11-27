// Sheet 1. The plan page, as an agent drew it: its sections, then its seven doubts, five blank and two to spike. One line of it,
// the late reversal, is handed to the spike exactly as it is written.
Film.scene("doubt", {
  step: "doubt",
  html: (D) => {
    const rec = D.cap["plan-page"]; if (!rec) throw new Error("no recording plan-page");
    const text = rec.cmd + "\n" + rec.out, rows = text.split("\n");
    // A section opens on the line after a blank one, and runs to the next blank line.
    const sections = []; rows.forEach((l, k) => { if (k > 0 && rows[k - 1] === "" && l) { let to = k; while (rows[to + 1]) to++; sections.push({ name: l, n: k + 1, count: to - k }); } });
    const at = sections.findIndex((x) => x.name === "Doubts"); if (at < 0) throw new Error("the plan page has no Doubts section");
    const sec = sections[at], doubts = rows.slice(sec.n, sec.n + sec.count), blank = doubts.filter((l) => / Blank\.$/.test(l)), spike = doubts.filter((l) => / Spike\.$/.test(l));
    if (blank.length + spike.length !== doubts.length) throw new Error("a doubt on the plan page is neither blank nor a spike");
    Loc.said(D, "a1", doubts.length); Loc.said(D, "a2", blank.length); Loc.said(D, "a2", spike.length);
    const line = spike.find((l) => /late reversal/.test(l)); if (!line) throw new Error("the plan page has no late reversal to spike");
    const question = line.replace(/^- /, "").replace(/ Spike\.$/, "");
    if (!Loc.readme(D).text.includes(question)) throw new Error("the spike's page does not open with the question it was given");
    const folder = D.cap["spike-files"].cmd.replace(/^ls /, "") + "/"; if (!Loc.readme(D).path.startsWith(folder)) throw new Error("the spike's folder is not the one that was listed");
    return `${Kit.css}${Loc.css("doubt")}<style>
      #scene-doubt .outline { left: 96px; top: 262px; width: 440px; height: 566px; }
      #scene-doubt .sect { display: flex; align-items: baseline; justify-content: space-between; height: 62px; padding: 16px 22px 0; border-bottom: 1px solid var(--rule); font-size: 22px; color: var(--text2); white-space: nowrap; }
      #scene-doubt .sect:last-child { border-bottom: 0; } #scene-doubt .sect b { font-family: var(--mono); font-weight: 400; font-size: 22px; color: var(--muted); }
      #scene-doubt #db-ed .code { font-size: 20.5px; line-height: 38px; } #scene-doubt #db-ed .hit { padding: 1px 8px; margin-left: 2px; border: 1.5px solid transparent; }
      #scene-doubt .count { position: absolute; top: 672px; width: 620px; height: 104px; display: flex; align-items: center; gap: 22px; padding: 0 26px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); }
      #scene-doubt .count b { font-size: 68px; font-weight: 500; line-height: 1; letter-spacing: -.02em; } #scene-doubt .count span { font-size: 26px; line-height: 1.2; color: var(--text2); }
      #scene-doubt .guess { left: 560px; top: 826px; width: 1264px; }
      #scene-doubt .hand { left: 560px; top: 672px; width: 1264px; padding: 20px 28px 24px; border: 1.5px solid var(--paper); background: #0b1727; box-shadow: 0 24px 60px -20px rgba(0,0,0,.9); }
      #scene-doubt .hand .pair { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; } #scene-doubt .hand .pair i { font-style: normal; font-size: 30px; color: var(--muted); } #scene-doubt .hand .pair .lbl { margin-left: 12px; }
      #scene-doubt .hand .ask { font-size: 42px; line-height: 1.22; font-weight: 500; letter-spacing: -.01em; }
      #scene-doubt .may { display: flex; gap: 40px; margin-top: 26px; min-height: 48px; } #scene-doubt .may > div { display: flex; align-items: center; gap: 16px; } #scene-doubt .may .chip.own { color: var(--cyan); border-color: var(--cyan); }
    </style>
    <div class="head"><div class="eyebrow">The plan page</div><div class="hl">Some doubts you decide. Some you spike.</div></div>
    <div class="who">${Kit.who("you")}<span class="arrow hidden0">→</span><span class="to hidden0">${Kit.who("agent", "the spike")}</span></div>
    <div class="panel outline"><div class="bar"><span class="dots"></span><span><b>plan-page.txt</b></span><span class="tag">one page</span></div>
      ${sections.map((x, k) => `<div class="sect${k === at ? " mine" : ""}"><span>${Film.esc(x.name)}</span><b>${x.count} ${x.count === 1 ? "line" : "lines"}</b></div>`).join("")}</div>
    <div class="panel hidden0" id="db-ed" style="left:560px;top:262px;width:1264px">${Film.editor("db-ed", "docs/manual/captures/plan-page.txt", Film.code(text, { lang: "text", from: sec.n, to: sec.n + sec.count }), '<span class="tag">drawn by an agent · not agreed</span>')}</div>
    <div class="count c5 hidden0" style="left:560px"><b>${blank.length}</b><span>blank<br><span class="mu">decisions only you can make</span></span></div>
    <div class="count c2 hidden0" style="left:1204px"><b class="cy">${spike.length}</b><span>to spike<br><span class="mu">thinking harder will not answer them</span></span></div>
    <div class="abs guess hidden0"><div class="say">Describe it now, and you build on a guess.</div></div>
    <div class="abs hand hidden0"><div class="pair">${Kit.who("you")}<i>→</i>${Kit.who("agent", "the spike")}<span class="lbl">one line of the page, as it is written</span></div>
      <div class="ask">${Film.esc(question)}</div>
      <div class="may"><div class="m1 hidden0"><span class="chip own">${Film.esc(folder)}</span><span class="lbl">throwaway code, a folder of its own</span></div><div class="m2 hidden0"><span class="chip">the app</span><span class="lbl">untouched</span></div></div></div>`;
  },
  build(s) {
    const c = s.cue, body = s.$("#db-ed .code"), lns = s.$$("#db-ed .ln"), head = lns[0], doubts = lns.slice(1);
    const blanks = doubts.filter((l) => / Blank\.$/.test(l.textContent)), spikes = doubts.filter((l) => / Spike\.$/.test(l.textContent));
    const mine = spikes.find((l) => /late reversal/.test(l.textContent)); if (!mine) throw new Error("doubt: the late reversal is not among the quoted lines");
    const tagB = blanks.map((l) => Loc.mark(l, "Blank.")), tagS = spikes.map((l) => Loc.mark(l, "Spike."));
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // a1: one page, and its doubts.
    s.fromTo(".outline", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5 }, s.start + 0.5);
    s.fromTo(".sect", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, stagger: 0.12 }, c("a1", "fits"));
    s.in("#db-ed", c("a1", "lists") - 0.2, { y: 14 }); s.fromTo(lns, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, stagger: 0.1 }, c("a1", "lists"));
    s.to(".sect.mine", { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.13)", duration: 0.3 }, c("a1", "seven")); s.to(".sect.mine b", { color: "#62c6ff", duration: 0.3 }, c("a1", "seven"));
    // a2: five are yours, two are spikes.
    s.to(tagB, { borderColor: "#e9f0fa", color: "#e9f0fa", duration: 0.3, stagger: 0.06 }, c("a2", "Five")); s.in(".c5", c("a2", "Five"), { y: 12 });
    s.to(tagS, { borderColor: "#62c6ff", color: "#08111f", backgroundColor: "#62c6ff", duration: 0.3, stagger: 0.1 }, c("a2", "Two")); s.in(".c2", c("a2", "Two"), { y: 12 });
    s.to(blanks, { opacity: 0.4, duration: 0.4 }, c("a2", "questions")); s.to(head, { opacity: 0.4, duration: 0.4 }, c("a2", "questions"));
    // a3: on a guess.
    s.in(".guess", c("a3", "Describe"), { y: 12 });
    // a4: one line of the page goes to the spike.
    const t4 = c("a4");
    s.out(".count, .guess", t4 - 0.3, { dur: 0.3 });
    s.in(".who .arrow, .who .to", c("a4", "spike"), { x: -10, y: 0, stagger: 0.1 });
    s.focus(body, [+mine.dataset.n, +mine.dataset.n], c("a4", "one line")); s.to(blanks, { opacity: 0.32, duration: 0.3 }, c("a4", "one line"));
    s.in(".hand", c("a4", "given"), { y: 16 }); s.fromTo(".hand .ask", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, c("a4", "Can"));
    // a5: a folder of its own; nothing in the app.
    s.in(".m1", c("a5", "throwaway"), { y: 8 }); s.in(".m2", c("a5", "nothing"), { y: 8 });
  },
});
