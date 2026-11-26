// Sheet 1. One agent, one afternoon: a clock runs from one to six while five pieces of a system land, each on its word.
Film.scene("afternoon", {
  step: "problem",
  html: () => `${Kit.css}${Loc.css("afternoon")}<style>
      #scene-afternoon .clock { position: absolute; right: 300px; top: 126px; width: 116px; height: 116px; border: 2px solid var(--paper); border-radius: 50%; background: rgba(14,28,48,.9); }
      #scene-afternoon .clock i { position: absolute; left: 50%; bottom: 50%; width: 3px; margin-left: -1.5px; background: var(--paper); transform-origin: 50% 100%; border-radius: 2px; }
      #scene-afternoon .clock .hour { height: 30px; width: 4px; margin-left: -2px; } #scene-afternoon .clock .minute { height: 44px; background: var(--cyan); }
      #scene-afternoon .clock u { position: absolute; left: 50%; top: 4px; width: 2px; height: 8px; margin-left: -1px; background: var(--muted); transform-origin: 50% 52px; }
      #scene-afternoon .clock b { position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; background: var(--paper); }
      #scene-afternoon .span { position: absolute; right: 440px; top: 166px; text-align: right; font-size: 22px; }
      #scene-afternoon .who { top: 164px; }
      #scene-afternoon .slot { position: absolute; border: 1.5px dashed var(--rule2); }
      #scene-afternoon .never { position: absolute; display: flex; align-items: center; } #scene-afternoon .never .say { font-size: 58px; line-height: 1.12; }
    </style>
    <div class="head"><div class="eyebrow">One afternoon</div><div class="hl">An agent can write all of it.</div></div>
    <div class="lbl span">one o'clock<br>to six</div>
    <div class="clock">${[0, 3, 6, 9].map((k) => `<u style="transform:rotate(${k * 30}deg)"></u>`).join("")}<i class="hour"></i><i class="minute"></i><b></b></div>
    <div class="who">${Kit.who("agent", "an agent")}</div>
    ${[0, 1, 2, 3, 4].map((n) => `<div class="slot" style="${Loc.box(Loc.cell(n))}"></div>`).join("")}
    ${Loc.cards("hidden0")}
    <div class="never hidden0" style="${Loc.box(Loc.cell(5))}"><div class="say">Writing it was never the hard part.</div></div>`,
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3); s.in(".who, .clock, .span", s.start + 0.4, { y: 0 }); s.in(".slot", s.start + 0.5, { y: 0, stagger: 0.05 });
    // a1, a2: the afternoon passes, from one o'clock to six, while the pieces land.
    const from = c("a1", "agent"), until = c("a2", "$");
    s.fromTo(".clock .hour", { rotation: 30 }, { rotation: 180, duration: until - from, ease: "none" }, from);
    s.fromTo(".clock .minute", { rotation: 0 }, { rotation: 1800, duration: until - from, ease: "none" }, from);
    [["server"], ["database"], ["command line"], ["tools"], ["page"]].forEach(([word], k) => { s.in(".pc" + k, c("a2", word), { y: 18, dur: 0.45 }); s.out(s.$$(".slot")[Loc.cellOf[k]], c("a2", word) + 0.2, { dur: 0.3 }); });
    // a3: and none of that was the hard part.
    s.to(".piece", { opacity: 0.5, duration: 0.5 }, c("a3"));
    s.in(".never", c("a3"), { y: 18, dur: 0.6 });
  },
});
