// Sheet 2. The next morning: the same five pieces, dimmed, the questions landing over them, and one line from all five to you.
Film.scene("morning", {
  step: "problem",
  html: () => {
    const cells = Loc.cellOf.map((n) => Loc.cell(n)), you = Loc.cell(5), busY = 627, mid = (b) => b.x + b.w / 2;
    const stubs = cells.map((b) => `<path class="stub" d="M${mid(b)} ${b.y < busY ? b.y + b.h : b.y} L${mid(b)} ${busY}"/>`).join("");
    const xs = cells.map(mid), endX = mid(you), endY = you.y + 42;
    const ask = (k, n, text, w = 500) => { const b = Loc.cell(n); return `<div class="ask q${k} hidden0" style="left:${b.x + 30}px;top:${b.y + 112}px;width:${w}px">${text}</div>`; };
    return `${Kit.css}${Loc.css("morning")}<style>
      #scene-morning .piece { opacity: .9; }
      #scene-morning .ask { position: absolute; padding: 16px 24px 18px; border: 1.5px solid var(--paper); background: #0b1727; box-shadow: 0 20px 50px -18px rgba(0,0,0,.9); font-size: 42px; line-height: 1.15; font-weight: 500; letter-spacing: -.01em; }
      #scene-morning .ask small { display: block; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; color: var(--muted); margin-bottom: 4px; }
      #scene-morning .reader { position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; padding-top: 44px; text-align: center; }
      #scene-morning .reader .say { font-size: 44px; } #scene-morning .reader .kwho { font-size: 34px; padding: 10px 26px; border-width: 2px; } #scene-morning .reader .kwho::before { width: 16px; height: 16px; }
      #scene-morning svg.ink .stub, #scene-morning svg.ink .bus { stroke: var(--paper); stroke-width: 2.5; }
    </style>
    <div class="head"><div class="eyebrow">The next morning</div><div class="hl">The hard part is the next morning.</div></div>
    <div class="who">${Kit.who("agent", "an agent wrote it")}<span class="arrow hidden0">→</span><span class="to hidden0">${Kit.who("you", "you read it")}</span></div>
    ${Loc.cards()}
    ${ask(1, 0, "Is it right?")}${ask(2, 1, "Is it fast enough?")}${ask(3, 2, "What happens when something fails?")}
    ${ask(4, 3, "<small>one rule changes</small>What else has to change?", 1084)}
    <svg class="ink">${stubs}<path class="bus" d="M${Math.min(...xs)} ${busY} L${endX} ${busY} L${endX} ${endY - 14}"/><path class="fillpaper tip" d="M${endX - 11} ${endY - 16} L${endX + 11} ${endY - 16} L${endX} ${endY} Z"/></svg>
    <div class="reader" style="${Loc.box(you)}"><div class="say all hidden0">someone has to read<br>all of it</div><div class="chipyou hidden0">${Kit.who("you")}</div></div>`;
  },
  build(s) {
    const c = s.cue, bar = (k, n) => s.$$(".pc" + k + " .bars i")[n];
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    s.tl.set(s.$$("svg.ink path"), { autoAlpha: 0 }, s.start);
    // m1, m2: the pieces go quiet and the questions land over them.
    s.to(".piece", { opacity: 0.42, duration: 0.6 }, c("m1", "next"));
    s.in(".q1", c("m2", "Is"), { y: 14, dur: 0.4 }); s.in(".q2", c("m2", "Is", 2), { y: 14, dur: 0.4 }); s.in(".q3", c("m2", "What"), { y: 14, dur: 0.4 });
    // m3: one rule changes in one piece; a line lights in each of the others.
    const t3 = c("m3", "one rule");
    s.to(".pc1", { opacity: 0.9, duration: 0.3 }, t3); s.to(bar(1, 2), { opacity: 1, backgroundColor: "#e9f0fa", duration: 0.3 }, t3);
    s.in(".q4", c("m3", "what else"), { y: 14, dur: 0.4 });
    [[0, 9], [2, 10], [3, 1], [4, 9]].forEach(([k, n], i) => { const t = c("m3", "what else") + 0.1 + i * 0.12; s.to(".pc" + k, { opacity: 0.75, duration: 0.3 }, t); s.to(bar(k, n), { opacity: 1, backgroundColor: "#e9f0fa", duration: 0.3 }, t); });
    // m4: someone has to read all of it, and that someone is you.
    const t4 = c("m4", "someone");
    s.to(".ask", { borderColor: "rgba(132,170,222,.36)", color: "#a9bcd6", duration: 0.4 }, t4 - 0.1);
    s.draw(".stub", t4, 0.3); s.draw(".bus", t4 + 0.25, 0.6); s.tl.to(s.$(".tip"), { autoAlpha: 1, duration: 0.15 }, t4 + 0.85);
    s.in(".all", c("m4", "read"), { y: 12 }); s.to(".piece", { opacity: 0.9, duration: 0.5 }, c("m4", "all"));
    s.fromTo(".chipyou", { autoAlpha: 0, scale: 1.7 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, c("m4", "you"));
    const first = s.$(".who .kwho"), shift = s.$(".who").offsetWidth - first.offsetWidth;
    s.tl.fromTo(first, { x: shift }, { x: 0, duration: 0.4, ease: "power2.inOut" }, c("m4", "you") - 0.3); s.in(".who .arrow, .who .to", c("m4", "you"), { x: -10, y: 0, stagger: 0.1 });
  },
});
