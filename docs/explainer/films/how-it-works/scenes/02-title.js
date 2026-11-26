// Sheet 2. The name, and the picture the name comes from: one solid, drawn as the views projected from it.
Film.scene("title", {
  html: () => `<style>
      #scene-title .word { left: 0; right: 0; top: 478px; text-align: center; font-size: 176px; font-weight: 600; letter-spacing: -0.035em; line-height: 1; }
      #scene-title .tagline { left: 0; right: 0; top: 706px; text-align: center; font-size: 50px; line-height: 1.3; color: var(--text2); }
      #scene-title .tagline b { color: var(--paper); font-weight: 500; }
    </style>
    <svg class="ink" viewBox="0 0 1920 1080"><g transform="translate(768 132)">
      <path class="solid" d="M0 300H170V236H74V150H0Z"/><path class="solid" d="M0 20H170V104H0Z"/><path class="solid" d="M74 20V104"/>
      <path class="solid" d="M300 150H384V300H300Z"/><path class="solid" d="M300 236H384"/>
      <path class="proj cy dash" d="M0 150V104"/><path class="proj cy dash" d="M74 150V104"/><path class="proj cy dash" d="M170 236V104"/>
      <path class="proj cy dash" d="M74 150H300"/><path class="proj cy dash" d="M170 236H300"/><path class="proj cy dash" d="M170 300H300"/>
      <text class="v" x="85" y="334" text-anchor="middle">front</text><text class="v" x="85" y="6" text-anchor="middle">top</text><text class="v" x="342" y="334" text-anchor="middle">side</text>
    </g></svg>
    <div class="abs word">Orthograph</div>
    <div class="abs tagline"><div class="l1"><b>Describe a system once.</b></div><div class="l2">Everything else falls out of it.</div></div>`,
  build(s) {
    const c = s.cue;
    s.draw(".solid", s.start + 0.25, 1.1);
    s.fromTo(".proj", { autoAlpha: 0 }, { autoAlpha: 0.9, duration: 0.6, stagger: 0.08 }, s.start + 1.0);
    s.in("text.v", s.start + 1.3, { y: 0, stagger: 0.1 });
    s.in(".word", c("t1") - 0.1, { y: 30, dur: 0.9 });
    s.in(".l1", c("t2", "Describe"), { y: 18 }); s.in(".l2", c("t2", "everything"), { y: 18 });
  },
});
