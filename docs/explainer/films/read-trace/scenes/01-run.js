// Sheet 1. Run it: `ortho dev` on your machine, then the generated command line tool claims a first name. Both are recordings.
Film.scene("run", {
  step: "run",
  html: (D) => `${Kit.css}${Loc.css}<style>
      #scene-run .where { left: 96px; top: 468px; display: flex; gap: 18px; align-items: baseline; } #scene-run .where .lbl { font-size: 26px; color: var(--paper); } #scene-run .where u { text-decoration: none; color: var(--dim); font-size: 26px; }
      #scene-run .noscreens { left: 96px; top: 556px; font-size: 34px; color: var(--text2); }
      #scene-run #run-tool .o { color: var(--paper); } #scene-run #run-tool .tag { color: var(--cyan); }
    </style>
    <div class="head"><div class="eyebrow">Run it</div><div class="hl">Everything is green. So you try it yourself.</div></div>
    <div class="lwho">${Kit.who("you")}</div>
    ${Kit.term(D, { id: "run-dev", cap: "dev", x: 96, y: 262, w: 1728, h: 186, title: "terminal 1" })}
    <div class="abs where"><span class="lbl w1">on your machine</span><u class="w2">·</u><span class="lbl w2">a local world</span><u class="w3">·</u><span class="lbl w3">no cloud account</span></div>
    <div class="abs noscreens">Plugged In has no screens yet.</div>
    ${Kit.term(D, { id: "run-tool", cap: "claim-first", x: 96, y: 624, w: 1240, h: 196, title: "terminal 2", size: 28, tag: '<span class="tag gen">generated from the blueprint</span>' })}
    ${Kit.stand("real", "recorded on examples/plugged-in")}`,
  build(s) {
    const c = s.cue, dev = s.$("#run-dev"), tool = s.$("#run-tool");
    s.in(".head", s.start + 0.3); s.in(".lwho", c("r1", "yourself"), { y: 0 });
    s.in(dev, c("r2") - 0.3, { y: 16 }); s.run(dev, c("r2"), { type: 0.9, at: c("r2", "runs") + 0.2 });
    s.in(".w1", c("r2", "machine"), { y: 8 }); s.in(".w2", c("r2", "local world"), { y: 8 }); s.in(".w3", c("r2", "no cloud"), { y: 8 });
    s.in(".kstand", c("r2", "machine") + 0.3, { y: 0 });
    s.in(".noscreens", c("r3"), { y: 10 });
    s.in(tool, c("r3", "command line"), { y: 16 }); s.fromTo(".gen", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, c("r3", "generated"));
    s.run(tool, c("r4", "claims"), { type: 1.3, at: c("r4", "answers") });
    const id = Loc.mark(Loc.row(tool, /^\w+_\w+$/), /\S+/), note = Loc.note(id, "a handle's id", { side: true });
    s.to(id, { color: "#62c6ff", duration: 0.3 }, c("r4", "handles")); s.in(note, c("r4", "handles"), { x: 14, y: 0, dur: 0.4 });
  },
});
