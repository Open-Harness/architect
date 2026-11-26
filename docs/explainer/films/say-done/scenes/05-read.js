// Sheet 5. What you hold before any handler exists, what goes wrong here, and what is next.
Film.scene("read", {
  step: "read",
  html: (D) => {
    const e = D.facts.empty, steps = e.journeys.reduce((n, j) => n + j.steps, 0);
    return `${Kit.css}<style>
      #scene-read .hold { top: 284px; width: 852px; height: 176px; padding: 20px 28px; } #scene-read .hold1 { left: 96px; } #scene-read .hold2 { left: 972px; } #scene-read .hold .kbig b { font-weight: 500; }
      #scene-read .hold .fact { font-family: var(--mono); font-size: 22px; color: var(--muted); margin-top: 8px; }
      #scene-read .wrong { left: 96px; top: 500px; width: 1728px; } #scene-read .wrong > .lbl { font-size: 24px; margin-bottom: 6px; }
      #scene-read .item { display: flex; align-items: baseline; gap: 24px; padding: 17px 0; border-top: 1px solid var(--rule); font-size: 34px; } #scene-read .item i { font: 600 30px var(--label); font-style: normal; color: var(--cyan); width: 24px; flex: none; } #scene-read .item .then { margin-left: auto; font-size: 26px; color: var(--text2); white-space: nowrap; }
      #scene-read .item .kstand { position: static; font-size: 24px; flex-wrap: wrap; row-gap: 8px; } #scene-read .item .kstand span { text-transform: none; letter-spacing: 0; font: 400 30px var(--sans); color: var(--paper); }
      #scene-read .next { left: 96px; top: 470px; right: 96px; text-align: center; font-size: 64px; font-weight: 500; letter-spacing: -.015em; } #scene-read .next .lbl { display: block; font-size: 30px; color: var(--cyan); margin-bottom: 14px; }
    </style>
    <div class="head"><div class="eyebrow">Before a single handler exists</div><div class="hl">What you hold now.</div></div>
    ${Local.who("you")}
    <div class="kbox hold hold1"><div class="lbl">one</div><div class="kbig">the stories, <b>agreed</b></div><div class="fact">${e.journeys.length} journeys · ${steps} steps</div></div>
    <div class="kbox hold hold2"><div class="lbl">two</div><div class="kbig">a red run, <b>which shows they bite</b></div><div class="fact"><span class="rd">${e.red} red</span> on emptied handlers</div></div>
    <div class="abs wrong"><div class="lbl">what goes wrong</div>
      <div class="item it1"><i>1</i><span>green on the empty run, and not proved by the description: it can't fail</span><span class="then">send it back</span></div>
      <div class="item it2"><i>2</i><span>the author is also the builder</span><span class="then">use two sessions</span></div>
      <div class="item it3"><i>3</i>${Kit.stand("missing", "nothing enforces the split yet: you keep it by how you hand out work", "")}</div></div>
    <div class="abs next"><span class="lbl">Next</span>a builder gets one brief, and climbs</div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head, .whoat", s.start + 0.3);
    s.in(".hold1", c("e1", "the stories"), { y: 14 }); s.fromTo(".hold1 .kbig b", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, c("e1", "agreed"));
    s.in(".hold2", c("e1", "a red run"), { y: 14 }); s.fromTo(".hold2 .kbig b", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, c("e1", "bite"));
    s.in(".wrong > .lbl", c("e2"), { y: 8 }); s.to(".hold", { opacity: 0.45, duration: 0.4 }, c("e2"));
    s.in(".it1", c("e2", "A journey"), { y: 10 }); s.fromTo(".it1 .then", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, c("e2", "Send"));
    s.in(".it2", c("e3", "An author"), { y: 10 }); s.fromTo(".it2 .then", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, c("e3", "two sessions"));
    s.in(".it3", c("e4", "Nothing"), { y: 10 });
    const t5 = c("e5");
    s.out(".hold, .wrong", t5 - 0.45, { dur: 0.4 }); s.in(".next", t5, { y: 16 });
  },
});
