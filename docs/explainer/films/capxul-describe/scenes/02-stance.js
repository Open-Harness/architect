// Sheet 2. The position: a person works on the system and reads the blueprint; the agent and the framework do the rest, and it is proved.
Film.scene("stance", {
  step: "problem",
  html: () => `<style>
      #scene-stance .you { left: 96px; top: 262px; width: 1728px; height: 250px; border-color: var(--paper); } #scene-stance .you .row { display: flex; gap: 16px; margin-top: 14px; align-items: center; }
      #scene-stance .you .kpill { font-family: var(--sans); font-size: 30px; color: var(--paper); padding: 12px 22px; border-color: var(--paper); } #scene-stance .read { margin-left: auto; font-size: 30px; color: var(--cyan); }
      #scene-stance .below { left: 96px; top: 560px; width: 1728px; height: 250px; } #scene-stance .below .row { display: flex; gap: 12px; margin-top: 14px; flex-wrap: wrap; align-items: center; }
      #scene-stance .proved { margin-left: auto; font-size: 30px; color: var(--green); } #scene-stance .line { left: 96px; right: 96px; top: 535px; height: 2px; background: var(--paper); transform-origin: 0 50%; }
      #scene-stance .veil { inset: 37px; background: rgba(8,17,31,.9); } #scene-stance .say { left: 0; right: 0; top: 372px; text-align: center; font-size: 64px; line-height: 1.25; font-weight: 500; letter-spacing: -.015em; } #scene-stance .say .b { color: var(--cyan); } #scene-stance .say .d { font-size: 44px; color: var(--text2); margin-top: 14px; }
    </style>
    <div class="head"><div class="eyebrow">Where you work</div><div class="hl">A position on the morning after.</div></div>
    <div class="kbox you"><div class="lbl" style="color:var(--paper);font-size:24px">You · the blueprint</div><div class="row"><span class="kpill y0">the things in it</span><span class="kpill y1">who may do what</span><span class="kpill y2">what must always be true</span><span class="read">you read this</span></div></div>
    <div class="abs line"></div>
    <div class="kbox below"><div class="lbl" style="font-size:24px">The agent writes it · the framework makes it</div><div class="row">${["the contract", "the server", "the database", "the client", "the app", "the agent's tools", "the docs"].map((t) => `<span class="kpill b">${t}</span>`).join("")}<span class="proved">proved, against journeys ✔</span></div></div>
    <div class="abs veil hidden0"></div><div class="abs say"><div class="a">You never read the code to know it's correct.</div><div class="b">You read the blueprint,</div><div class="d">down to whatever level you care about.</div></div>`,
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3);
    s.in(".you", c("s2") - 0.1, { y: 16 }); ["things", "who may", "always"].forEach((w, k) => s.in(".y" + k, c("s2", w), { y: 8, dur: 0.35 })); s.in(".read", c("s2", "you read"), { x: 16, y: 0 });
    s.fromTo(".line", { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, c("s3") - 0.3);
    s.in(".below", c("s3"), { y: 16 }); s.in(".below .b", c("s3", "agent"), { y: 8, stagger: 0.07, dur: 0.3 }); s.in(".proved", c("s3", "proved"), { x: 16, y: 0 });
    s.fromTo(".veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, c("s4") - 0.4); s.in(".say .a", c("s4") - 0.1, { y: 20, dur: 0.7 }); s.in(".say .b", c("s4", "You read"), { y: 20, dur: 0.7 }); s.in(".say .d", c("s4", "down to"), { y: 16, dur: 0.6 });
  },
});
