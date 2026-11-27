// Sheet 1. Why done is said first, and by someone else: the question, the word "journey", and the two roles.
Film.scene("why", {
  step: "agree",
  html: () => `${Kit.css}<style>
      #scene-why .motif { left: 96px; top: 292px; display: flex; align-items: center; gap: 22px; font-size: 30px; color: var(--text2); }
      #scene-why .ask { left: 96px; font-size: 72px; font-weight: 500; letter-spacing: -.02em; line-height: 1.1; white-space: nowrap; }
      #scene-why .ask1 { top: 400px; } #scene-why .ask2 { top: 530px; }
      #scene-why .ask1 .strike { position: absolute; left: -8px; right: -8px; top: 56%; height: 4px; background: var(--paper); transform-origin: 0 50%; }
      #scene-why .else { left: 96px; top: 730px; padding: 22px 30px; }
      #scene-why .jdef { left: 96px; top: 290px; width: 1728px; padding: 26px 34px 30px; }
      #scene-why .jdef .word { font-size: 92px; font-weight: 500; letter-spacing: -.02em; line-height: 1.1; }
      #scene-why .jdef .means { font-size: 42px; color: var(--text2); margin-top: 6px; } #scene-why .jdef .means b { color: var(--paper); font-weight: 500; }
      #scene-why .role { top: 590px; width: 700px; height: 230px; padding: 24px 30px; } #scene-why .role .kbig { margin-top: 18px; }
      #scene-why .role1 { left: 96px; } #scene-why .role2 { left: 1124px; }
      #scene-why .role .not { font-size: 30px; color: var(--paper); margin-top: 8px; border-top: 1px solid var(--rule2); padding-top: 10px; }
      #scene-why .carry { left: 796px; top: 648px; width: 328px; text-align: center; }
    </style>
    <div class="head"><div class="eyebrow">Done, before the work</div><div class="hl">Say what done means before anyone builds.</div></div>
    ${Local.who("you")}
    <div class="abs motif phase1">${Kit.who("agent", "an agent")}<span>writes a handler in minutes</span></div>
    <div class="abs ask ask1 phase1"><span style="position:relative">Can it build this?<i class="strike"></i></span></div>
    <div class="abs ask ask2 phase1">How will you know it's right?</div>
    <div class="kbox else phase1"><div class="kbig">…and have someone else say it.</div></div>
    <div class="kbox jdef"><div class="lbl">in Orthograph, done is</div><div class="word">a journey</div><div class="means"><span class="m1">a story,</span> <span class="m2">told through <b>real calls</b></span> <span class="m3">to the real system</span></div></div>
    <div class="kbox role role1">${Kit.who("author")}<div class="kbig">writes the journeys</div></div>
    <div class="abs carry lbl">the journeys, one way</div>
    <svg class="ink"><path class="cy arrow" d="M 816 705 H 1100"/><path class="cy arrow" d="M 1084 693 L 1102 705 L 1084 717"/></svg>
    <div class="kbox role role2">${Kit.who("builder")}<div class="kbig">builds until they pass</div><div class="not">may not change them</div></div>
    ${Kit.stand("practice", "two agents, two sessions: nothing enforces it yet")}`,
  build(s) {
    const c = s.cue;
    s.in(".head .eyebrow, .whoat", s.start + 0.3); s.in(".motif", c("a1", "agent"), { y: 10 });
    s.in(".ask1", c("a1", "can it build"), { y: 14 });
    s.fromTo(".strike", { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.inOut" }, c("a1", "the question is", 2)); s.to(".ask1", { color: "#7389a6", duration: 0.4 }, c("a1", "the question is", 2));
    s.in(".ask2", c("a1", "how will you"), { y: 14 });
    s.in(".head .hl", c("a2", "say what done"), { y: 12 }); s.in(".else", c("a2", "someone else"), { y: 12 });
    const t3 = c("a3");
    s.out(".phase1", t3 - 0.4, { dur: 0.35 }); s.in(".jdef", c("a3", "journey") - 0.25, { y: 16 }); s.in(".jdef .word", c("a3", "journey"), { y: 10 });
    s.in(".m1", c("a3", "short story"), { y: 8 }); s.in(".m2", c("a3", "real calls"), { y: 8 }); s.in(".m3", c("a3", "real system"), { y: 8 });
    s.in(".role1", c("a4", "One agent"), { y: 16 }); s.fromTo(".role1 .kwho", { autoAlpha: 0.25 }, { autoAlpha: 1, duration: 0.3 }, c("a4", "author"));
    s.in(".carry", c("a4", "different agent") - 0.1, { y: 0 }); s.draw(".arrow", c("a4", "different agent") - 0.1, 0.6);
    s.in(".role2", c("a4", "different agent") + 0.15, { y: 16 }); s.fromTo(".role2 .kbig", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, c("a4", "builds"));
    s.in(".role2 .not", c("a4", "may not"), { y: 8 }); s.in(".kstand", c("a4", "may not") + 0.3, { y: 8 });
  },
});
