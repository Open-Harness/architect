// Sheet 11. The loop, and the three lists a viewer should leave with: what you write, what you get, what you know.
Film.scene("loop", {
  step: "all",
  html: () => {
    const nodes = [["Describe", "blueprint/"], ["Compile", "ortho check"], ["Generate", "ortho generate"], ["Behave", "src/ handlers"], ["Prove", "ortho prove"], ["Ship", "ortho promote"], ["Watch", "the portal"]];
    const cx = 500, cy = 606, r = 232, pos = (k, rad = r) => { const a = (-90 + (k * 360) / nodes.length) * Math.PI / 180; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; };
    return `<style>
      #scene-loop .nl { position: absolute; width: 260px; margin-left: -130px; text-align: center; transform: translateY(-50%); } #scene-loop .nl b { display: block; font: 600 30px var(--label); text-transform: uppercase; letter-spacing: .12em; } #scene-loop .nl span { font-family: var(--mono); font-size: 17px; color: var(--muted); }
      #scene-loop .mid { left: ${cx - 150}px; top: ${cy - 64}px; width: 300px; text-align: center; font-size: 27px; line-height: 1.5; } #scene-loop .foot { left: 96px; top: 968px; width: 1000px; font-size: 18px; color: var(--muted); }
      #scene-loop .cols { left: 1010px; top: 290px; width: 814px; } #scene-loop .col { margin-bottom: 44px; } #scene-loop .col .lbl { font-size: 26px; margin-bottom: 12px; } #scene-loop .col .chips { display: flex; flex-wrap: wrap; gap: 12px; } #scene-loop .col .chip { font-size: 25px; padding: 10px 20px; }
      #scene-loop .c2 .chip { color: var(--cyan); border-color: rgba(98,198,255,.6); } #scene-loop .c3 .chip { color: var(--green); border-color: var(--green); font-size: 30px; }
      #scene-loop .endw { left: 0; right: 0; top: 330px; text-align: center; font-size: 168px; font-weight: 600; letter-spacing: -0.035em; line-height: 1; } #scene-loop .endt { left: 0; right: 0; top: 556px; text-align: center; font-size: 48px; line-height: 1.3; color: var(--text2); } #scene-loop .endt b { color: var(--paper); font-weight: 500; }
      #scene-loop .endc { left: 0; right: 0; top: 776px; text-align: center; } #scene-loop .endc .chip { font-size: 24px; }
    </style>
    <div class="main head"><div class="eyebrow">The loop</div><div class="hl">Description flows down. Evidence flows back.</div></div>
    <svg class="ink main" viewBox="0 0 1920 1080"><circle class="track mu" cx="${cx}" cy="${cy}" r="${r}"/>
      <path class="flow cy" d="M${pos(0).join(" ")} A${r} ${r} 0 1 1 ${pos(6.92).join(" ")}"/>
      <path class="back gr dash" d="M${pos(6, r - 46).join(" ")} A${r - 46} ${r - 46} 0 1 0 ${pos(0.3, r - 46).join(" ")}"/>
      ${nodes.map((_, k) => `<circle class="nd nd${k}" cx="${pos(k)[0]}" cy="${pos(k)[1]}" r="11" style="fill:var(--bg)"/>`).join("")}</svg>
    ${nodes.map(([name, how], k) => { const [x, y] = pos(k, r + 92); return `<div class="main nl nl${k}" style="left:${x}px;top:${y}px"><b>${name}</b><span>${how}</span></div>`; }).join("")}
    <div class="main abs mid"><div class="m1 cy">description →</div><div class="m2 gr">← evidence</div></div>
    <div class="main abs cols">
      <div class="col c1"><div class="lbl" style="color:var(--paper)">You write</div><div class="chips"><span class="chip w0">the blueprint</span><span class="chip w1 am" style="border-color:var(--amber)">the handlers</span><span class="chip w2">the journeys</span></div></div>
      <div class="col c2"><div class="lbl cy">You get</div><div class="chips">${["the server", "the API", "the SDK", "the CLI", "agent tools", "the docs"].map((t, k) => `<span class="chip g${k}">${t}</span>`).join("")}</div></div>
      <div class="col c3"><div class="lbl gr">You know</div><div class="chips"><span class="chip">prove ✔ &nbsp;a verdict for every operation</span></div></div></div>
    <div class="main abs foot">Shown on examples/plugged-in, stage 1. Ship runs on this machine today; the first live staging run is milestone M7.04.</div>
    <div class="abs endw">Orthograph</div><div class="abs endt"><div class="e1"><b>Describe a system once.</b></div><div class="e2">Everything else falls out of it.</div></div>
    <div class="abs endc"><span class="chip">docs/canon/orthograph.mdx</span></div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3); s.draw(".track", s.start + 0.4, 1.0);
    ["Describe", "Compile", "Generate", "Write the", "Prove", "ship", "watch"].forEach((w, k) => { const t = c("l1", w); s.in(".nl" + k, t, { y: 8, dur: 0.35 }); s.fromTo(".nd" + k, { autoAlpha: 0, scale: 0.2, transformOrigin: "50% 50%" }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(3)" }, t); s.to(".nd" + k, { fill: "#62c6ff", stroke: "#62c6ff", duration: 0.2 }, t + 0.1); });
    s.draw(".flow", c("l1", "Describe"), c("l1", "$") - c("l1", "Describe"));
    s.in(".m1", c("l2", "description"), { y: 6 }); s.in(".m2", c("l2", "evidence"), { y: 6 }); s.fromTo(".back", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7 }, c("l2", "evidence")); s.in(".foot", c("l2", "$"));
    s.in(".c1 .lbl", c("l3")); [["blueprint", 0], ["handlers", 1], ["journeys", 2]].forEach(([w, k]) => s.in(".w" + k, c("l3", w), { y: 10, dur: 0.35 }));
    s.in(".c2 .lbl", c("l4")); [["server", 0], ["API", 1], ["SDK", 2], ["command", 3], ["agent", 4], ["docs", 5]].forEach(([w, k]) => s.in(".g" + k, c("l4", w), { y: 10, dur: 0.35 }));
    s.in(".c3 .lbl", c("l5")); s.in(".c3 .chip", c("l5", "proved") - 0.3, { y: 10, scale: 1.06 });
    const end = c("l6") - 0.5;
    s.out(".main", end, { dur: 0.45 }); s.in(".endw", end + 0.4, { y: 30, dur: 0.9 }); s.in(".e1", c("l6", "Describe"), { y: 18 }); s.in(".e2", c("l6", "everything"), { y: 18 }); s.in(".endc", c("l6", "$") + 0.3);
  },
});
