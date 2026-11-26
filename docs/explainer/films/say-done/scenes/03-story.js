// Sheet 3. The journey you read: its name and its sentences, taken from the file, then the lines under one sentence.
Film.scene("story", {
  step: "write",
  html: (D) => {
    const file = "journeys/claim-a-handle.ts", src = D.src[file], title = /Blueprint\.journey\("([^"]+)"/.exec(src)?.[1], steps = [...src.matchAll(/s\.step\(\s*\n\s*"([^"]+)"/g)].map((m) => m[1]);
    const read = ["a name nobody has claimed does not resolve", "aaron claims the free name", "aaron cannot claim a second name while he holds one"];
    if (!title || steps.length !== 8 || read.some((r) => !steps.includes(r))) throw new Error("story: the journey no longer has the name, the eight steps or the three sentences the narration reads");
    const at = Kit.line(src, /^\s*"aaron claims the free name",$/), rows = src.split("\n"); if (!/s\.step\($/.test(rows[at - 2]) || !/^\s*\),$/.test(rows[at + 5])) throw new Error("story: the step is no longer eight lines");
    const blanks = D.cap["stubs-check"].out.split("\n").map((l) => / has (\d+) blanks$/.exec(l)).filter(Boolean).reduce((n, m) => n + +m[1], 0); if (!blanks) throw new Error("story: ortho check listed no blanks");
    return `${Kit.css}<style>
      #scene-story .does { left: 1060px; top: 290px; width: 764px; } #scene-story .does .job { font-size: 38px; font-weight: 500; line-height: 1.25; margin-top: 22px; } #scene-story .does .job span { display: block; font: 400 26px var(--sans); color: var(--text2); margin-top: 4px; }
      #scene-story .does .yours { display: flex; align-items: center; gap: 18px; margin-top: 44px; padding-top: 30px; border-top: 1px solid var(--rule2); font-size: 34px; }
      #scene-story .tale { left: 96px; top: 262px; width: 900px; height: 600px; } #scene-story .tale .inner { padding: 22px 30px; }
      #scene-story .tale .name { font-size: 46px; font-weight: 500; letter-spacing: -.01em; margin: 2px 0 14px; }
      #scene-story .line { display: flex; align-items: baseline; gap: 18px; height: 52px; padding: 0 12px; margin: 0 -12px; font-size: 27px; color: var(--text2); border-left: 3px solid transparent; white-space: nowrap; } #scene-story .line i { font: 600 22px var(--label); font-style: normal; color: var(--muted); width: 18px; }
      #scene-story .under { left: 96px; top: 276px; display: flex; align-items: baseline; gap: 20px; font-size: 44px; font-weight: 500; } #scene-story .under i { font: 600 30px var(--label); font-style: normal; color: var(--muted); } #scene-story .under .lbl { margin-left: 18px; }
      #scene-story .say { left: 1090px; top: 300px; width: 640px; } #scene-story .say .ask { font-size: 30px; color: var(--text2); margin: 26px 0 22px; }
      #scene-story .choice { padding: 20px 28px; margin-top: 18px; border: 1.5px solid var(--paper); font-size: 40px; font-weight: 500; background: rgba(14,28,48,.9); }
    </style>
    <div class="head"><div class="eyebrow">The journeys</div><div class="hl">A journey reads as a story.</div></div>
    ${Local.who("you", "you, reading")}
    <div class="panel tale">${Film.editor("tale", file, "", '<span class="tag cy">written by the author</span>')}<div class="inner"><div class="lbl">journey</div><div class="name">${Film.esc(title)}</div>
      ${steps.map((t, k) => `<div class="line" data-read="${read.indexOf(t)}"><i>${k + 1}</i><span>${Film.esc(t)}</span></div>`).join("")}</div></div>
    <div class="abs does"><div>${Kit.who("author", "the author")}</div><div class="job job1">fills the blanks<span>all ${blanks} that ortho check listed</span></div><div class="job job2">writes the stories<span>the ones the stubs couldn't guess</span></div><div class="yours">${Kit.who("you")}<span>← this is the one you read</span></div></div>
    <div class="abs under"><i>${steps.indexOf(read[1]) + 1}</i><span>${Film.esc(read[1])}</span><span class="lbl">and under the sentence</span></div>
    ${Kit.ed(D, { id: "story-ed", file, x: 96, y: 362, w: 1728, from: at - 1, to: at + 6 })}
    <div class="abs say"><div>${Kit.who("you")}</div><div class="ask">You read the sentences, and say</div><div class="choice ch1">yes</div><div class="choice ch2">no</div><div class="choice ch3">you've missed one</div></div>`;
  },
  build(s) {
    const c = s.cue, tl = s.tl, src = s.D.src["journeys/claim-a-handle.ts"], at = Kit.line(src, /^\s*"aaron claims the free name",$/);
    s.in(".head, .whoat", s.start + 0.3);
    s.in(".does > div:first-child", c("j1", "author") - 0.1, { y: 8 }); s.in(".job1", c("j1", "fills"), { y: 10 }); s.in(".job2", c("j1", "writes the stories"), { y: 10 }); s.in(".yours", c("j1", "This is the one"), { y: 10 });
    s.in(".tale", c("j1", "This is the one") - 0.15, { y: 18 }); s.fromTo(".tale .inner .lbl, .tale .name", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, c("j2") - 0.1);
    const lines = s.$$(".line"), t0 = c("j2", "Eight"), t1 = c("j2", "sentence");
    s.in(lines, t0, { y: 6, dur: 0.3, stagger: (t1 - t0) / lines.length });
    const light = (k, t) => { const l = lines.find((x) => +x.dataset.read === k); tl.to(l, { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.1)", borderLeftColor: "#62c6ff", duration: 0.3 }, t); };
    light(0, c("j2", "A name nobody")); light(1, c("j2", "Aaron claims")); light(2, c("j2", "Aaron cannot"));
    // Under one sentence: the call, then what must be true afterwards.
    const t3 = c("j3"), body = s.$("#story-ed .code"), rows = src.split("\n");
    s.out(".tale, .does", t3 - 0.4, { dur: 0.35 }); s.in(".under", t3, { y: 10 }); s.in("#story-ed", c("j3", "sentence"), { y: 16 });
    [[/\.run\(/, "the call", "call"], [/expect\(/, "the answer", "answer"], [/emits\(/, "the event", "event"], [/isIn\(/, "the state", "state"], [/spans\(/, "the spans", "spans"]].forEach(([re, label, word], k) => {
      const n = at + 1 + k; if (!re.test(rows[n - 1])) throw new Error("story: line " + n + " is no longer " + label);
      const el = Kit.call(s, body, n, label), t = c("j3", word); s.focus(body, [n, n], t, 0.35); tl.fromTo(el, { autoAlpha: 0, x: 16 }, { autoAlpha: 1, x: 0, duration: 0.4 }, t + 0.05);
    });
    s.focus(body, [at + 1, at + 5], c("j3", "$") + 0.1);
    // You don't check the code.
    s.to("#story-ed", { opacity: 0.3, duration: 0.4 }, c("j4", "code")); const back = c("j4", "read the sentences");
    s.out("#story-ed, .under", back - 0.4, { dur: 0.35 }); s.fromTo(".tale", { autoAlpha: 0 }, { autoAlpha: 1, y: 0, duration: 0.45 }, back);
    s.in(".say > div:first-child, .say .ask", back + 0.1, { y: 8 }); s.in(".ch1", c("j4", "yes"), { y: 10, dur: 0.35 }); s.in(".ch2", c("j4", "no"), { y: 10, dur: 0.35 }); s.in(".ch3", c("j4", "missed"), { y: 10, dur: 0.35 });
  },
});
