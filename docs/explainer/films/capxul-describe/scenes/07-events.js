// Sheet 7. What a move records, and what a refusal is called: events and errors as files, and one code that reads the same everywhere.
Film.scene("events", {
  step: "rules",
  html: (D) => `<style>
      #scene-events .place { position: absolute; top: 262px; width: 250px; height: 92px; border: 1px solid var(--rule2); background: rgba(14,28,48,.92); padding: 12px 18px; } #scene-events .place b { display: block; font-size: 28px; font-weight: 500; color: var(--paper); }
      #scene-events svg.ink text { font-family: var(--mono); font-size: 21px; letter-spacing: 0; text-transform: none; fill: var(--paper); }
      #scene-events .lock { left: 1180px; top: 668px; font-family: var(--mono); font-size: 21px; color: var(--text2); border: 1px solid var(--rule2); padding: 6px 14px; background: rgba(14,28,48,.9); white-space: nowrap; }
      #scene-events .same { position: absolute; left: 1180px; width: 644px; height: 62px; display: flex; align-items: center; gap: 16px; border: 1px solid var(--rule2); background: rgba(14,28,48,.92); padding: 0 18px; }
      #scene-events .same .lbl { width: 220px; } #scene-events .same .code1 { font-family: var(--mono); font-size: 24px; color: var(--red); white-space: nowrap; }
    </style>
    <div class="head"><div class="eyebrow">Describe · what is recorded, and what is refused</div><div class="hl">One event for each move. One code for each refusal.</div></div>
    ${Kit.ed(D, { id: "e-ev", file: "blueprint/things/budget/events.ts", x: 96, y: 262, w: 1050, size: "small", tag: '<span class="tag">you write</span>' })}
    <div class="place pl0" style="left:1180px"><div class="lbl">the chain</div><b>the contract</b></div><div class="place pl1" style="left:1574px"><div class="lbl">ours</div><b>the server</b></div>
    <svg class="ink" viewBox="0 0 1920 1080"><path class="cross" d="M1430 320H1558"/><path class="crossh fillpaper" d="M1572 320l-16-8v16z"/><text class="crosst" x="1502" y="392" text-anchor="middle">BudgetSpent</text></svg>
    ${Kit.ed(D, { id: "e-er", file: "blueprint/things/budget/errors.ts", x: 1180, y: 430, w: 644, size: "small", tag: '<span class="tag">you write</span>' })}
    <div class="abs lock">blueprint/refusals.lock · BU-001 · only ever grows</div>
    ${[["the contract", 0], ["the command line", 1], ["the app", 2]].map(([who, k]) => `<div class="same sm${k}" style="top:${730 + k * 70}px"><span class="lbl">${who}</span><span class="code1">BU-001 · BudgetExceeded</span></div>`).join("")}${Kit.legend}`,
  build(s) {
    const c = s.cue, D = s.D, f = "blueprint/things/budget/events.ts", body = s.$("#e-ev .code"), L = (re) => Kit.line(D, f, re);
    s.in(".head", s.start + 0.3); s.in("#e-ev", c("e1") - 0.1, { y: 14 }); s.in(".klegend", s.start + 0.8);
    s.focus(body, [L(/export const BudgetSpent/), L(/reason: Blueprint\.sealed/) + 1], c("e1", "one event"));
    s.in(".pl0, .pl1", c("e1", "Events are") - 0.2, { y: 10, stagger: 0.15, dur: 0.35 }); s.draw(".cross", c("e1", "crosses") - 0.1, 0.6); s.in(".crossh, .crosst", c("e1", "crosses") + 0.4, { y: 0, dur: 0.25 });
    s.focus(body, null, c("e2")); s.in("#e-er", c("e2", "refusal") - 0.3, { y: 14 }); s.in(".lock", c("e2", "one code"), { y: 8, dur: 0.35 });
    ["contract", "command line", "app"].forEach((w, k) => s.in(".sm" + k, c("e2", w), { x: 14, y: 0, dur: 0.3 }));
  },
});
