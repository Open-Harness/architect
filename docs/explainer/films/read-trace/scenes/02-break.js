// Sheet 2. Break it: the second claim is refused, with a code and a name. Then you say what you saw, and hand it to your agent.
Film.scene("break", {
  step: "break",
  html: (D) => `${Kit.css}${Loc.css}<style>
      #scene-break #br-term .o.said { font-size: 46px; line-height: 64px; color: var(--paper); margin: 20px 0 74px; } #scene-break #br-term .o.code { font-size: 22px; color: var(--muted); }
      #scene-break .verdict { left: 1360px; top: 300px; width: 464px; } #scene-break .verdict .kbig { color: var(--cyan); font-size: 60px; } #scene-break .verdict .lbl { font-size: 24px; color: var(--paper); margin-top: 4px; }
      #scene-break .bug { left: 1360px; top: 470px; width: 464px; font-size: 30px; color: var(--text2); line-height: 1.3; }
      #scene-break .saw { left: 96px; top: 672px; width: 1040px; } #scene-break .saw .lbl { font-size: 22px; }
      #scene-break .agent { left: 1440px; top: 722px; }
    </style>
    <div class="head"><div class="eyebrow">Break it</div><div class="hl">Then he claims a second name.</div></div>
    <div class="lwho">${Kit.who("you")}</div>
    ${Kit.term(D, { id: "br-term", cap: "claim-second", x: 96, y: 262, w: 1200, h: 352, title: "terminal 2", size: 28 })}
    <div class="abs verdict hidden0"><div class="kbig">Refused</div><div class="lbl">a declared answer</div></div>
    <div class="abs bug hidden0">Is that a bug?<br><span class="know hidden0">You don't have to know.</span></div>
    <div class="kbox saw hidden0"><div class="lbl">you say what you saw</div><div class="kbig">“I asked for a second name, and it said no.”</div></div>
    <svg class="ink"><path class="hand" d="M1150 745 H1410"/><polyline class="hand" points="1394,733 1412,745 1394,757"/></svg>
    <div class="abs agent hidden0">${Kit.who("agent", "your agent")}</div>`,
  build(s) {
    const c = s.cue, term = s.$("#br-term");
    const said = Loc.row(term, /^\[[A-Z]+-\d+\] \w+$/), exit = Loc.row(term, /^exit \d+$/); said.classList.add("said"); exit.classList.add("code");
    const code = Loc.mark(said, /[A-Z]+-\d+/), name = Loc.mark(said, /[A-Z][A-Za-z]+$/), n1 = Loc.note(code, "the code"), n2 = Loc.note(name, "the name");
    s.in(".head", s.start + 0.3); s.in(".lwho", s.start + 0.5, { y: 0 }); s.in(term, s.start + 0.4, { y: 16 });
    s.run(term, c("k1", "claims"), { type: 1.0, at: c("k2") - 0.05, each: 0.3 });
    s.in(".verdict", c("k2"), { x: 16, y: 0 });
    s.to(code, { color: "#62c6ff", duration: 0.3 }, c("k2", "HN002")); s.in(n1, c("k2", "code"), { y: 6, dur: 0.35 });
    s.to(name, { color: "#62c6ff", duration: 0.3 }, c("k2", "already")); s.in(n2, c("k2", "name"), { y: 6, dur: 0.35 });
    s.in(".bug", c("k3", "bug"), { y: 8 }); s.in(".know", c("k3", "You don't"), { y: 0 });
    s.in(".saw", c("k3", "I asked"), { y: 16 });
    s.draw(".hand", c("k3", "hand that"), 0.5); s.in(".agent", c("k3", "hand that") + 0.35, { x: -10, y: 0 });
  },
});
