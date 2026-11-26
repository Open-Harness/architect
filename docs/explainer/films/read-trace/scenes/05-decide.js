// Sheet 5. Yours to decide: the question, its two answers, how to tell a refusal from a defect, and the two parts missing today.
Film.scene("decide", {
  step: "decide",
  html: () => `${Kit.css}${Loc.css}<style>
      #scene-decide .ask { left: 96px; top: 262px; font-size: 58px; font-weight: 500; letter-spacing: -.015em; line-height: 1.15; }
      #scene-decide .way { top: 400px; width: 852px; height: 122px; } #scene-decide .way.yes { left: 96px; } #scene-decide .way.nay { left: 972px; } #scene-decide .way .lbl { font-size: 24px; color: var(--paper); } #scene-decide .way div:last-child { font-size: 30px; color: var(--text2); }
      #scene-decide .kind { top: 566px; width: 800px; height: 150px; } #scene-decide .kind.ref { left: 96px; border-color: var(--cyan); } #scene-decide .kind.def { left: 1024px; border-color: var(--red); }
      #scene-decide .kind .word { font-family: var(--mono); font-size: 36px; } #scene-decide .kind.ref .word { color: var(--cyan); } #scene-decide .kind.def .word { color: var(--red); } #scene-decide .kind .means { font-size: 28px; color: var(--text2); margin-top: 6px; }
      #scene-decide .neq { left: 896px; top: 606px; width: 128px; text-align: center; font-size: 44px; color: var(--paper); }
      #scene-decide .askfor { left: 96px; top: 772px; font-size: 36px; } #scene-decide .askfor span { color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Yours to decide</div><div class="hl">Now the question is yours.</div></div>
    <div class="lwho">${Kit.who("you")}</div>
    <div class="abs ask hidden0">Should a person hold only one name?</div>
    <svg class="ink"><path class="mu b1" d="M300 346 V400"/><path class="mu b2" d="M1176 346 V400"/><path class="mu b0" d="M300 346 H1176"/></svg>
    <div class="kbox way yes hidden0"><div class="lbl">yes</div><div>the app is right, the message needs work</div></div>
    <div class="kbox way nay hidden0"><div class="lbl">no</div><div>change the rule <span class="mu">(a later chapter)</span></div></div>
    <div class="kbox kind ref hidden0"><div class="word">refused</div><div class="means">a declared answer, with a code</div></div>
    <div class="abs neq hidden0">≠</div>
    <div class="kbox kind def hidden0"><div class="word">✘ defect</div><div class="means">the server failing, and marked as one</div></div>
    <div class="abs askfor hidden0"><span>No line of the blueprint named?</span> Ask for the trace.</div>
    ${Kit.stand("missing", "no command signs a test person in to a local app", "left:96px;top:946px")}
    ${Kit.stand("missing", "the generated tool does not print the trace's id", "left:96px;top:992px")}`,
  build(s) {
    const c = s.cue, stands = s.$$(".kstand");
    s.in(".head", s.start + 0.3); s.in(".lwho", s.start + 0.5, { y: 0 });
    s.in(".ask", c("v1", "Should") - 0.1, { y: 14 });
    s.draw(".b1", c("v2") - 0.1, 0.4); s.in(".yes", c("v2", "yes"), { y: 10 }); s.draw(".b0, .b2", c("v2", "If no") - 0.1, 0.4); s.in(".nay", c("v2", "If no"), { y: 10 });
    s.to(".way, .ink", { opacity: 0.62, duration: 0.4 }, c("v3") - 0.1);
    s.in(".ref", c("v3", "Refused"), { y: 10 }); s.in(".def", c("v3", "defect"), { y: 10 }); s.in(".neq", c("v3", "Don't"), { y: 0, scale: 1.4 });
    s.in(".askfor", c("v4", "explanation"), { y: 10 }); s.to(".askfor", { color: "#62c6ff", duration: 0.3 }, c("v4", "ask"));
    s.fromTo(stands, { autoAlpha: 0 }, { autoAlpha: 0, duration: 0.01 }, s.start);
    s.in(stands[0], c("v5", "No command"), { y: 0 }); s.in(stands[1], c("v5", "generated tool"), { y: 0 });
  },
});
