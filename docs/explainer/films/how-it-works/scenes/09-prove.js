// Sheet 9. Proof. First the journey's own lines, then two recorded runs of `ortho prove`: on an emptied handler, and on the real one.
Film.scene("prove", {
  step: "prove",
  html: (D) => {
    const file = "journeys/claim-a-handle.ts", src = D.src[file], rows = src.split("\n"), step = rows.findIndex((l) => l.includes('"aaron claims the free name"')), from = step, to = step + 7;
    const red = D.cap["prove-red"].trimEnd().split("\n"), green = D.cap["prove-green"].trimEnd().split("\n");
    const journeys = green.filter((l) => l.startsWith("journey ")).map((l) => { const m = /^journey (.+) ✔ (\d+)\/(\d+) steps$/.exec(l); return { name: m[1], steps: +m[3] }; });
    journeys.forEach((j) => { const l = red.find((r) => r.startsWith(`journey ${j.name} `)), m = / (\d+)\/\d+ steps$/.exec(l); j.red = m ? +m[1] : 0; });
    const ops = D.facts.operations, evals = green.filter((l) => l.startsWith(ops[0] + " ") && !/\d+ evals/.test(l)).map((l) => l.slice(ops[0].length + 1).replace(/ [✔✘].*$/, ""));
    const total = journeys.reduce((n, j) => n + j.steps, 0), was = journeys.reduce((n, j) => n + j.red, 0);
    const inClaim = () => { let on = false; return (l) => { if (l.startsWith("journey ")) { on = l.startsWith("journey claim a handle"); return true; } return on && l.includes('"aaron claims the free name"'); }; };
    return `<style>
      #scene-prove .ed { left: 96px; top: 262px; width: 1728px; } #scene-prove .call { position: absolute; right: 30px; transform: translateY(-50%); font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; display: flex; align-items: center; gap: 14px; } #scene-prove .call::before { content: ""; width: 54px; height: 1px; background: var(--rule2); }
      #scene-prove .roles { left: 96px; top: 690px; display: flex; gap: 20px; align-items: stretch; } #scene-prove .role { width: 420px; padding: 16px 22px 18px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); } #scene-prove .role b { display: block; font-size: 30px; font-weight: 500; } #scene-prove .role span { font-family: var(--mono); font-size: 19px; color: var(--muted); }
      #scene-prove .role .lbl { margin-bottom: 4px; } #scene-prove .then { align-self: center; font-size: 40px; color: var(--muted); }
      #scene-prove .trace { left: 1090px; top: 690px; width: 734px; padding: 16px 22px 20px; } #scene-prove .span { position: relative; height: 34px; margin-top: 10px; font-family: var(--mono); font-size: 18px; line-height: 34px; } #scene-prove .span i { position: absolute; top: 0; bottom: 0; background: rgba(98,198,255,.2); border: 1px solid var(--cyan); transform-origin: 0 50%; } #scene-prove .span span { position: relative; padding-left: 12px; }
      #scene-prove .term { left: 96px; top: 262px; width: 960px; height: 700px; overflow: hidden; } #scene-prove .term .screen { position: absolute; left: 0; right: 0; top: 46px; font-size: 19px; line-height: 31px; }
      #scene-prove .board { left: 1090px; top: 262px; width: 734px; } #scene-prove .count { display: flex; align-items: baseline; gap: 14px; margin-bottom: 10px; } #scene-prove .count b { font-size: 64px; font-weight: 500; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
      #scene-prove .jr { display: flex; align-items: center; height: 31px; font-size: 18.5px; color: var(--text2); } #scene-prove .jr span { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px; } #scene-prove .jr i { flex: none; width: 15px; height: 15px; margin-left: 6px; border-radius: 50%; background: var(--red); }
      #scene-prove .grid { margin-top: 26px; } #scene-prove .gh { display: flex; height: 106px; padding-left: 196px; } #scene-prove .gh span { width: 57px; position: relative; } #scene-prove .gh em { position: absolute; left: 20px; bottom: 6px; transform: rotate(-42deg); transform-origin: 0 100%; white-space: nowrap; font: 600 16px var(--label); font-style: normal; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
      #scene-prove .gr_ { display: flex; align-items: center; height: 30px; font-family: var(--mono); font-size: 17px; color: var(--text2); } #scene-prove .gr_ span { width: 196px; } #scene-prove .gr_ i { width: 57px; text-align: center; font-style: normal; color: var(--green); }
      #scene-prove .plan { left: 1090px; top: 282px; width: 734px; } #scene-prove .pl { display: flex; gap: 22px; align-items: baseline; padding: 20px 0; border-bottom: 1px solid var(--rule); } #scene-prove .pl i { font: 600 30px var(--label); font-style: normal; color: var(--cyan); width: 26px; } #scene-prove .pl b { display: block; font-size: 38px; font-weight: 500; line-height: 1.15; } #scene-prove .pl span { font-family: var(--mono); font-size: 19px; color: var(--muted); }
      #scene-prove .alone { position: absolute; left: 0; top: 300px; font-size: 26px; color: var(--amber); border: 1px solid var(--amber); padding: 10px 20px; background: rgba(255,181,92,.08); }
      #scene-prove .verdict { left: 640px; top: 604px; font: 600 62px var(--mono); color: var(--green); border: 4px solid var(--green); padding: 6px 30px; transform: rotate(-5deg); background: rgba(8,17,31,.92); }
    </style>
    <div class="head"><div class="eyebrow">Proof</div><div class="hl">A journey is the spec. <span class="mono" style="font-size:.84em">ortho prove</span> is the judge.</div></div>
    <div class="a panel ed">${Film.editor("j", file, Film.code(src, { from, to }), '<span class="tag">written first, by another agent</span>')}</div>
    <div class="a abs roles"><div class="role r1"><div class="lbl cy">first</div><b>The journey author</b><span>journeys/claim-a-handle.ts</span></div><div class="then">→</div><div class="role r2"><div class="lbl am">then</div><b>The builder</b><span>src/handle/claim.ts</span></div></div>
    <div class="a panel trace"><div class="lbl">the trace this step must leave</div><div class="span"><i style="left:0;right:0"></i><span>handle.claim</span></div><div class="span"><i style="left:14%;right:36%"></i><span style="padding-left:calc(14% + 12px)">handle.claim.record</span></div><div class="span"><i style="left:66%;right:6%"></i><span style="padding-left:calc(66% + 12px)">handle.claim.commit</span></div></div>
    <div class="b panel term"><div class="bar"><span class="dots"></span><span>plugged-in</span><span class="tag runtag rd">the claim handler emptied</span><span class="tag runtag2 gr hidden0" style="position:absolute;right:18px">the real handler</span></div>
      <div class="screen red">${Film.term("ortho prove", red.join("\n"), { keep: inClaim() })}</div>
      <div class="screen green">${Film.term("ortho prove", green.join("\n"), { keep: (l) => /^(journey |handle\.claim |prove )/.test(l) })}</div></div>
    <div class="b abs plan"><div class="pl p1"><i>1</i><div><b>Starts a world</b><span>real stores, on your machine</span></div></div><div class="pl p2"><i>2</i><div><b>Runs every journey</b><span>each step a real call to a real operation</span></div></div><div class="pl p3"><i>3</i><div><b>Judges what they left behind</b><span>answers, events, states, spans</span></div></div></div>
    <div class="b abs board" data-total="${total}" data-was="${was}"><div class="count"><b class="n">${was}</b><span class="lbl" style="font-size:24px">of ${total} steps green, in ${journeys.length} journeys</span></div>
      ${journeys.map((j) => `<div class="jr"><span>${Film.esc(j.name)}</span>${Array.from({ length: j.steps }, (_, k) => `<i class="${k < j.red ? "was" : "todo"}"></i>`).join("")}</div>`).join("")}
      <div class="grid" style="position:relative"><div class="alone hidden0">A loop a coding agent can run by itself.</div><div class="gh">${evals.map((e) => `<span><em>${e}</em></span>`).join("")}</div>${ops.map((o) => `<div class="gr_"><span>${o}</span>${evals.map(() => "<i>✔</i>").join("")}</div>`).join("")}</div></div>
    <div class="b abs verdict hidden0">prove ✔</div>`;
  },
  build(s) {
    const c = s.cue, body = s.$(".ed .code"), n0 = +s.$$(".ed .ln")[0].dataset.n;
    s.in(".head", s.start + 0.3); s.in(".ed", c("v1", "A journey") - 0.1, { y: 20 });
    s.in(".r1", c("v2", "different agent"), { y: 12 }); s.in(".then, .r2", c("v2", "before"), { y: 12, stagger: 0.12 });
    [[2, "the call", "Aaron claims"], [3, "the answer", "id back"], [4, "the event", "event"], [5, "the state", "state"], [6, "the trace", "spans"]].forEach(([k, label, word]) => {
      const el = document.createElement("div"); el.className = "call hidden0"; el.textContent = label; el.style.top = s.lineY(body, n0 + k) + "px"; body.appendChild(el);
      s.focus(body, [n0 + k, n0 + k], c("v3", word), 0.35); s.in(el, c("v3", word) + 0.05, { x: 16, y: 0, dur: 0.4 });
    });
    s.in(".trace", c("v3", "spans") - 0.2, { y: 16 }); s.fromTo(".span i", { scaleX: 0 }, { scaleX: 1, duration: 0.5, stagger: 0.18, ease: "power2.out" }, c("v3", "spans")); s.fromTo(".span span", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.18 }, c("v3", "spans") + 0.1);
    s.focus(body, [n0 + 1, n0 + 7], c("v3", "$") + 0.2);
    // The two runs.
    const t4 = c("v4");
    s.out(".a", t4 - 0.35, { dur: 0.35 }); s.in(".term", t4, { y: 16 }); s.fromTo(".green", { autoAlpha: 0 }, { autoAlpha: 0, duration: 0.01 }, t4);
    s.run(s.$(".red"), t4 + 0.1, { at: c("v5") - 0.2, each: 0.11 });
    s.in(".p1", c("v4", "real world"), { x: 20, y: 0 }); s.in(".p2", c("v4", "runs every"), { x: 20, y: 0 }); s.in(".p3", c("v4", "judges"), { x: 20, y: 0 }); s.out(".plan", c("v5") - 0.7, { dur: 0.3 });
    s.in(".board .count, .board .jr", c("v5") - 0.3, { stagger: 0.06, y: 8 }); s.fromTo(".jr i.was", { backgroundColor: "#ff7373" }, { backgroundColor: "#54d898", duration: 0.2, stagger: 0.04 }, c("v5") + 0.5);
    const where = s.$$(".red .o").filter((o) => o.textContent.includes("handler src/handle/claim.ts"));
    s.to(where, { color: "#e9f0fa", backgroundColor: "rgba(255,115,115,.14)", duration: 0.3 }, c("v5", "exactly"));
    const climb = c("v6", "Fix"), dots = s.$$(".jr i.todo"), board = s.$(".board"), total = +board.dataset.total, was = +board.dataset.was, n = s.$(".count .n"), tick = { v: was };
    s.to(".red", { autoAlpha: 0, duration: 0.3 }, climb - 0.2); s.to(".runtag", { autoAlpha: 0, duration: 0.3 }, climb - 0.2); s.in(".runtag2", climb, { y: 0 }); s.to(".green", { autoAlpha: 1, duration: 0.2 }, climb);
    s.run(s.$(".green"), climb + 0.1, { type: 0.6, at: climb + 1.0, each: 0.13 });
    const span = c("v6", "green") + 0.5 - climb - 0.9;
    s.tl.to(dots, { backgroundColor: "#54d898", duration: 0.18, stagger: span / dots.length, ease: "none" }, climb + 0.9);
    s.tl.to(tick, { v: total, duration: span, ease: "none", onUpdate: () => { n.textContent = Math.round(tick.v); } }, climb + 0.9);
    s.to(".count .n", { color: "#54d898", duration: 0.3 }, climb + 0.9 + span);
    s.in(".alone", c("v6", "coding agent"), { y: 10 }); s.out(".alone", c("v7", "Nine") - 0.4, { dur: 0.3 });
    s.fromTo(".jr span", { color: "#a9bcd6" }, { color: "#e9f0fa", duration: 0.3, stagger: 0.05 }, c("v7", "Seven"));
    s.fromTo(".count", { scale: 1 }, { scale: 1.08, duration: 0.22, yoyo: true, repeat: 1, transformOrigin: "0 50%" }, c("v7", "steps"));
    s.in(".gh span", c("v7", "Nine"), { y: 0, stagger: 0.03, dur: 0.3 }); s.in(".gr_ span", c("v7", "Nine"), { y: 0, stagger: 0.04, dur: 0.3 });
    s.fromTo(".gr_ i", { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.18, stagger: { each: 0.016, from: "start" } }, c("v7", "Nine") + 0.25);
    s.fromTo(".verdict", { autoAlpha: 0, scale: 1.7, rotate: -5 }, { autoAlpha: 1, scale: 1, rotate: -5, duration: 0.35, ease: "back.out(2)" }, c("v7", "verdict"));
  },
});
