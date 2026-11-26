// Sheet 16. The idea, in three lines.
Film.scene("close", {
  html: () => `<style>
      #scene-close .word { left: 0; right: 0; top: 300px; text-align: center; font-size: 160px; font-weight: 600; letter-spacing: -0.035em; line-height: 1; }
      #scene-close .lines { left: 0; right: 0; top: 540px; text-align: center; font-size: 46px; line-height: 1.6; color: var(--text2); } #scene-close .lines b { color: var(--paper); font-weight: 500; }
    </style>
    <div class="abs word">Orthograph</div>
    <div class="abs lines"><div class="l0"><b>Describe the system once,</b> at the level you think in.</div><div class="l1">The agent builds below it. The framework keeps it in step, <b>and proves it.</b></div><div class="l2">You decide <b>how it all fits together.</b></div></div>`,
  build(s) {
    const c = s.cue;
    s.in(".word", s.start + 0.3, { y: 30, dur: 0.9 }); s.in(".l0", c("z1", "Describe"), { y: 16 }); s.in(".l1", c("z2"), { y: 16 }); s.in(".l2", c("z3"), { y: 16 });
  },
});
