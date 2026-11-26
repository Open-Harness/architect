// Sheet 4. The ways in: the same spend through the SDK, the command line and an agent's tool. The accountant gets none of the three.
Film.scene("ways", {
  step: "ways in",
  html: (D) => {
    const tool = JSON.parse(D.src["falls-out/mcp.json"]);
    return `<style>
      #scene-ways .tool { left: 1200px; top: 262px; width: 624px; padding: 0 0 18px; } #scene-ways .tool .in { padding: 14px 22px 0; }
      #scene-ways .tool .nm { font-family: var(--mono); font-size: 30px; color: var(--cyan); } #scene-ways .tool .ds { font-size: 22px; line-height: 1.3; color: var(--text2); margin: 4px 0 12px; }
      #scene-ways .arg { display: grid; grid-template-columns: 120px 1fr; gap: 12px; font-size: 22px; line-height: 32px; color: var(--text2); } #scene-ways .arg b { font-family: var(--mono); font-size: 20px; font-weight: 400; color: var(--paper); }
      #scene-ways .tool .lbl { margin: 14px 0 6px; } #scene-ways .ref { display: flex; flex-wrap: wrap; gap: 8px; } #scene-ways .ref span { font-family: var(--mono); font-size: 19px; padding: 3px 10px; border: 1px solid var(--red); color: var(--red); }
      #scene-ways .sig { font-size: 23px; color: var(--paper); margin-top: 12px; } #scene-ways .sig.lim { color: var(--cyan); }
      #scene-ways .acct { left: 1200px; top: 762px; width: 624px; height: 188px; border: 1px dashed var(--rule2); padding: 16px 22px; } #scene-ways .acct .who { font-size: 28px; color: var(--text2); } #scene-ways .acct .gets { font-size: 22px; color: var(--muted); margin: 2px 0 12px; }
      #scene-ways .acct .not { display: flex; gap: 10px; align-items: center; } #scene-ways .acct .not span { font-size: 21px; padding: 3px 12px; border: 1px solid var(--rule2); color: var(--dim); text-decoration: line-through; } #scene-ways .acct .not b { font-weight: 500; font-size: 22px; color: var(--text2); margin-left: 6px; }
      #scene-ways .last { left: 96px; top: 850px; width: 1080px; }
    </style>
    <div class="head"><div class="eyebrow">Falls out · the ways in</div><div class="hl">The same spend, three times.</div></div>
    ${Kit.ed(D, { id: "e-sdk", file: "falls-out/client.ts", from: 2, x: 96, y: 262, w: 1080, size: "small nog", tag: '<span class="tag cy">the SDK · generated · a sketch</span>' })}
    ${Loc.term({ id: "cli", x: 96, y: 574, w: 1080, title: "the command line", tag: '<span class="tag cy">generated · a sketch</span>', text: D.src["falls-out/cli.txt"] })}
    <div class="panel tool"><div class="bar"><span class="dots"></span><span>an agent's <b>tool</b></span><span class="tag cy">generated · a sketch</span></div><div class="in">
      <div class="nm">${tool.name}</div><div class="ds">${tool.description}</div>
      ${Object.entries(tool.arguments).map(([name, what]) => `<div class="arg"><b>${name}</b><span>${what}</span></div>`).join("")}
      <div class="lbl rf">it can be refused with</div><div class="ref rf">${tool.refuses.map((r) => `<span>${r}</span>`).join("")}</div>
      <div class="sig own">It signs ${tool.signs}.</div><div class="sig lim">The contract holds its limit.</div></div></div>
    <div class="abs acct"><div class="who">The accountant</div><div class="gets">gets the books, and every payment's reason</div><div class="not"><span>the SDK</span><span>the command line</span><span>the tool</span><b>none of them</b></div></div>
    <div class="abs last kbig">One operation, three ways in. <span class="cy">You wrote none of them.</span></div>`;
  },
  build(s) {
    const c = s.cue, D = s.D, L = (re) => Kit.line(D, "falls-out/client.ts", re), body = s.$("#e-sdk .code"), cli = s.$("#cli"), out = s.$$("#cli .o");
    s.in(".head", s.start + 0.3);
    s.in("#e-sdk", c("k2") - 0.2, { y: 14 }); s.focus(body, [L(/sdk\.budget\.spend/), L(/sdk\.budget\.spend/)], c("k2") + 0.1);
    s.focus(body, [L(/call\.try/), L(/call\.try/)], c("k2", "try")); s.focus(body, [L(/call\.sign/), L(/call\.sign/)], c("k2", "sign")); s.focus(body, [L(/call\.follow/), L(/call\.follow/) + 2], c("k2", "follow"));
    const typed = Kit.call(s, body, L(/call\.try/), "a typed refusal", "am"); s.focus(body, [L(/call\.try/), L(/call\.try/)], c("k2", "Refusals")); s.in(typed, c("k2", "typed") - 0.2, { x: 10, y: 0, dur: 0.3 });
    s.focus(body, null, c("k3") - 0.1);
    s.in(cli, c("k3") - 0.3, { y: 14 }); const done = Loc.type(s, cli, c("k3", "one command") - 0.5, 0.9);
    Loc.row(s, out[0], done + 0.15); Loc.row(s, out[1], Math.max(done + 0.4, c("k3", "asks"))); Loc.row(s, out[2], c("k3", "$") + 0.1); Loc.row(s, out[3], c("k3", "$") + 0.5);
    s.to(out[1], { color: "#e9f0fa", duration: 0.3 }, c("k3", "key"));
    s.in(".tool", c("k4", "tool") - 0.3, { y: 14 }); s.in(".rf", c("k4", "refusals") - 0.1, { y: 6, dur: 0.3, stagger: 0.1 });
    s.in(".own", c("k4", "own key") - 0.2, { y: 6, dur: 0.3 }); s.in(".lim", c("k4", "limit") - 0.2, { y: 6, dur: 0.3 });
    s.to(".tool", { borderColor: "#62c6ff", boxShadow: "0 0 0 6px rgba(98,198,255,.14)", duration: 0.3 }, c("k4", "let it spend")); s.to(".tool", { boxShadow: "0 0 0 0px rgba(98,198,255,0)", duration: 0.4 }, c("k5") - 0.2);
    s.in(".last", c("k5", "write") - 0.2); s.in(".acct", c("k5", "accountant") - 0.2, { y: 12 }); s.fromTo(".acct .not b", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, c("k5", "none"));
  },
});
