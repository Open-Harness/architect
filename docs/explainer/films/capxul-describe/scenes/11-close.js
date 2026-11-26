// Sheet 11. What has been described, and what the next film shows.
Film.scene("close", {
  step: "all",
  html: () => `<style>
      #scene-close .ttl { left: 0; right: 0; top: 226px; text-align: center; font-size: 96px; font-weight: 600; letter-spacing: -0.03em; line-height: 1; }
      #scene-close .five { left: 0; right: 0; top: 388px; display: flex; flex-direction: column; align-items: center; gap: 10px; font-size: 40px; color: var(--paper); }
      #scene-close .trust { left: 0; right: 0; top: 730px; text-align: center; font-size: 34px; color: var(--text2); } #scene-close .next { left: 0; right: 0; top: 806px; text-align: center; font-size: 38px; color: var(--cyan); font-weight: 500; }
    </style>
    <div class="abs ttl">Described.</div>
    <div class="abs five"><div class="v0">the things</div><div class="v1">where they live</div><div class="v2">who may move them</div><div class="v3">what must stay true</div><div class="v4">how they join</div></div>
    <div class="abs trust">None of it is code you'd have to trust.</div>
    <div class="abs next">Next: what falls out, and how it runs.</div>`,
  build(s) {
    const c = s.cue;
    s.in(".ttl", s.start + 0.3, { y: 26, dur: 0.8 });
    ["things", "where they", "who may", "what must", "how they"].forEach((w, k) => s.in(".v" + k, c("z1", w), { y: 12, dur: 0.4 }));
    s.in(".trust", c("z2"), { y: 12 }); s.in(".next", c("z2", "next film") - 0.2, { y: 12 });
  },
});
