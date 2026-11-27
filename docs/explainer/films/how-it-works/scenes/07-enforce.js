// Sheet 7. One enforcer: every way in reaches the served operation, so a refusal reads the same from each of them.
Film.scene("enforce", {
  step: "enforce",
  html: (D) => {
    const row = /^\s+(HandleTaken: \{ code: "([^"]+)", exit: (\d+), status: (\d+) \}),/m.exec(D.src["generated/api/src/errors.ts"]), [, quote, code, exit, status] = row;
    const doors = [["HTTP", "POST /handle/claim", `status ${status}`], ["SDK", "Sdk.handle.claim(payload)", "a typed error"], ["CLI", "plugged-in handle claim", `exit ${exit}`], ["MCP tool", "handle.claim", "a tool refusal"]];
    const gates = [["who may call", "signed in?"], ["request key", "the same key is one call"], ["handler", "your behaviour runs"], ["rules", "handle.oneHolderPerName"], ["commit", "state, event, spans"]];
    const y = (k) => 290 + k * 116;
    return `<style>
      #scene-enforce .door { position: absolute; left: 96px; width: 500px; height: 98px; padding: 12px 20px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); font-family: var(--mono); font-size: 20px; }
      #scene-enforce .door .lbl { color: var(--paper); display: flex; justify-content: space-between; } #scene-enforce .door .lbl em { font-style: normal; color: var(--dim); }
      #scene-enforce .door .res { position: absolute; left: 20px; right: 20px; top: 46px; } #scene-enforce .door .res b { color: var(--red); font-weight: 500; } #scene-enforce .door .res i { font-style: normal; color: var(--paper); } #scene-enforce .door .res span { color: var(--muted); float: right; }
      #scene-enforce .door.plan { border-style: dashed; color: var(--muted); } #scene-enforce .door.plan .lbl { color: var(--muted); }
      #scene-enforce .box { left: 770px; top: 290px; width: 440px; height: 562px; border: 2px solid var(--cyan); background: linear-gradient(180deg, rgba(19,37,62,.96), rgba(12,24,42,.97)); padding: 18px 24px; }
      #scene-enforce .box .name { font-family: var(--mono); font-size: 30px; } #scene-enforce .gate { position: relative; margin-top: 12px; height: 76px; padding: 10px 16px; border: 1px solid var(--rule2); }
      #scene-enforce .gate b { display: block; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; } #scene-enforce .gate span { font-family: var(--mono); font-size: 17px; color: var(--muted); }
      #scene-enforce .gate i { position: absolute; right: 16px; top: 20px; font-style: normal; font-size: 28px; } #scene-enforce .g2 b { color: var(--amber); } #scene-enforce .g2 { border-color: rgba(255,181,92,.6); }
      #scene-enforce .side { left: 1270px; top: 290px; width: 554px; } #scene-enforce .side .lbl { margin: 0 0 8px; } #scene-enforce .side .q { font-family: var(--mono); font-size: 17px; line-height: 28px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); padding: 12px 16px; margin-bottom: 26px; white-space: pre-wrap; }
      #scene-enforce .same { left: 96px; top: 770px; width: 500px; font-size: 26px; color: var(--text2); } #scene-enforce .same b { color: var(--paper); font-weight: 500; }
    </style>
    <div class="head"><div class="eyebrow">One enforcer</div><div class="hl">Every way in reaches one place.</div></div>
    <svg class="ink" viewBox="0 0 1920 1080">${doors.map((_, k) => `<path class="w w${k} mu" d="M596 ${y(k) + 49}H770"/><circle class="req r${k} fillpaper" cx="596" cy="${y(k) + 49}" r="8"/>`).join("")}</svg>
    ${doors.map(([name, call, own], k) => `<div class="door d${k}" style="top:${y(k)}px"><div class="lbl"><span class="lbl" style="color:var(--paper)">${name}</span><em>holds no authority</em></div><div class="res call">${call}</div><div class="res back hidden0"><b>HandleTaken</b> <i>${code}</i><span>${own}</span></div></div>`).join("")}
    <div class="abs same hidden0">The same refusal, <b class="sn">by name</b> and <b class="sc">by code</b>, from every door.</div>
    <div class="abs box"><div class="lbl cy">the served operation</div><div class="name">handle.claim</div>
      ${gates.map(([name, what], k) => `<div class="gate g${k}"><b>${name}</b><span>${what}</span><i class="ok gr hidden0">✔</i><i class="no rd hidden0">✘</i></div>`).join("")}</div>
    <div class="abs side"><div class="s1"><div class="lbl">The call, from a journey</div><div class="q">bob.<span class="f">run</span>(claim, { name: <span class="s">"claimedname"</span> })</div></div>
      <div class="s2"><div class="lbl">The rule that refuses it</div><div class="q">${D.src["blueprint/things/handle/invariants.ts"].split("\n").slice(6, 10).map(Film.esc).join("\n")}</div></div>
      <div class="s3"><div class="lbl">One row, read by every door</div><div class="q">${Film.esc(quote)}</div></div></div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3); s.in(".box", c("e1", "rule"), { y: 0, scale: 0.94 }); s.in(".gate", c("e1", "Each operation"), { stagger: 0.14, y: 8 }); s.fromTo(".box", { boxShadow: "0 0 0 0px rgba(98,198,255,0)" }, { boxShadow: "0 0 0 8px rgba(98,198,255,.16)", duration: 0.35, yoyo: true, repeat: 1 }, c("e1", "one place"));
    ["HTTP", "SDK", "command", "agent"].forEach((w, k) => { s.in(".d" + k, c("e2", w), { x: -20, y: 0, dur: 0.4 }); s.draw(".w" + k, c("e2", w) + 0.15, 0.4); });
    s.fromTo(".door .lbl em", { color: "#4d6382" }, { color: "#ffb55c", duration: 0.35, stagger: 0.06 }, c("e2", "None"));
    const bob = c("e3", "Bob");
    s.in(".s1", bob, { x: 20, y: 0 });
    s.fromTo(".req", { autoAlpha: 0, attr: { cx: 596 } }, { autoAlpha: 1, duration: 0.15 }, bob + 0.3); s.to(".req", { attr: { cx: 770 }, duration: 0.7, ease: "power2.in" }, bob + 0.45); s.to(".req", { autoAlpha: 0, duration: 0.15 }, bob + 1.1);
    [0, 1, 2].forEach((k) => { s.in(`.g${k} .ok`, bob + 1.2 + k * 0.28, { y: 0, dur: 0.2 }); s.to(".g" + k, { borderColor: "#54d898", duration: 0.2 }, bob + 1.2 + k * 0.28); });
    const taken = c("e3", "taken") + 0.2;
    s.in(".g3 .no", taken, { y: 0, dur: 0.2, scale: 1.6 }); s.to(".g3", { borderColor: "#ff7373", backgroundColor: "rgba(255,115,115,.12)", duration: 0.25 }, taken); s.to(".g4", { opacity: 0.35, duration: 0.3 }, taken); s.in(".s2", taken, { x: 20, y: 0 });
    const same = c("e3", "refusal");
    s.to(".w", { stroke: "#ff7373", duration: 0.3 }, same); s.to(".door .call", { autoAlpha: 0, duration: 0.2 }, same + 0.1); s.in(".door .back", same + 0.25, { x: 14, y: 0, stagger: 0.1, dur: 0.35 }); s.to(".door:not(.plan)", { borderColor: "#ff7373", duration: 0.3, stagger: 0.1 }, same + 0.25);
    s.in(".s3", c("e3", "everywhere"), { x: 20, y: 0 }); s.in(".same", c("e3", "everywhere"));
    s.fromTo(".door .back b, .sn", { scale: 1 }, { scale: 1.12, color: "#ff9d9d", duration: 0.22, yoyo: true, repeat: 1, transformOrigin: "0 50%" }, c("e3", "Same name"));
    s.fromTo(".door .back i, .sc", { scale: 1 }, { scale: 1.12, color: "#62c6ff", duration: 0.22, yoyo: true, repeat: 1, transformOrigin: "0 50%" }, c("e3", "Same code"));
  },
});
