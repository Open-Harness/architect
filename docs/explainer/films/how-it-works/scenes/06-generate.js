// Sheet 6. What comes out for one operation. Each card is read from the generated file it names.
Film.scene("generate", {
  step: "generate",
  html: (D) => {
    const g = (f) => D.src["generated/" + f], esc = Film.esc, first = (f) => g(f).split("\n")[0].replace(/^(\/\/|<!--)\s*|\s*-->$/g, "");
    const [, verb, route] = /HttpApiEndpoint\.(\w+)\("\w+", "([^"]+)"/.exec(g("api/src/handle/claim.ts"));
    const errors = /error: \[([^\]]+)\]/.exec(g("api/src/handle/claim.ts"))[1].split(", ");
    const table = Object.fromEntries([...g("api/src/errors.ts").matchAll(/^\s+(\w+): \{ code: "([^"]+)", exit: (\d+), status: (\d+) \}/gm)].map((m) => [m[1], { code: m[2], exit: m[3], status: m[4] }]));
    const tool = /"handle\.claim": \{ description: "([^"]+)"/.exec(g("mcp/src/index.ts"))[1], split = tool.indexOf(" Refuses");
    const flag = /Flag\.String\("(\w+)"\)\.pipe\(Flag\.withMetavar\("([^"]+)"\), Flag\.withDescription\("([^"]+?)\. Text\."\)/.exec(g("cli/src/handle/claim.ts"));
    const how = /```sh\n(.+)\n```/.exec(g("docs/handle/claim.md"))[1].replace("<name>", "aaron");
    const who = /\*\*Who may call:\*\* (.+)/.exec(g("docs/handle/claim.md"))[1];
    const served = /const handleClaimServed = Handlers\.serve\(\{ (.+) \}\);/.exec(g("server/main.ts"))[1].split(/, (?=\w+: )/);
    const card = (k, label, file, body) => `<div class="card k${k}" style="left:${96 + (k % 3) * 584}px;top:${368 + Math.floor(k / 3) * 296}px"><div class="lbl"><span class="cy">${label}</span><em>generated/${file}</em></div>${body}<div class="stamp">${esc(first(file))}</div></div>`;
    return `<style>
      #scene-generate .card { width: 560px; height: 280px; font-family: var(--mono); font-size: 19px; line-height: 30px; border-color: rgba(98,198,255,.45); overflow: hidden; }
      #scene-generate .card .row { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #scene-generate .card .row em { float: right; font-style: normal; font-family: var(--label); text-transform: uppercase; letter-spacing: .12em; font-size: 16px; color: var(--muted); } #scene-generate .card .big { font-size: 22px; color: var(--paper); margin-bottom: 4px; }
      #scene-generate .card .prose { font-family: var(--sans); font-size: 19.5px; line-height: 28px; color: var(--text2); white-space: normal; } #scene-generate .card .prose b { color: var(--paper); font-weight: 500; }
      #scene-generate .k5 .row { font-size: 17.5px; line-height: 26.5px; } #scene-generate .k5 .big { font-size: 21px; margin-bottom: 0; } #scene-generate .stamp { position: absolute; left: 22px; right: 22px; bottom: 12px; font-size: 14.5px; line-height: 20px; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #scene-generate table { border-collapse: collapse; width: 100%; font-size: 18px; line-height: 27px; } #scene-generate td { padding: 0 14px 0 0; white-space: nowrap; } #scene-generate td:nth-child(n+2) { color: var(--text2); }
      #scene-generate .srcrow { left: 96px; right: 96px; top: 262px; height: 60px; display: flex; align-items: center; gap: 16px; } #scene-generate .srcrow .term { font-family: var(--mono); font-size: 24px; margin-right: auto; }
      #scene-generate .term .cmd { color: var(--paper); } #scene-generate .more { left: 96px; top: 964px; display: flex; gap: 12px; align-items: center; } #scene-generate .more .chip { font-size: 19px; color: var(--cyan); border-color: rgba(98,198,255,.45); padding: 5px 14px; }
      #scene-generate .proj { left: 96px; top: 322px; right: 96px; text-align: center; font-size: 25px; color: var(--cyan); }
      #scene-generate .veil { inset: 240px 40px 40px 40px; background: rgba(8,17,31,.78); } #scene-generate .drift { left: 250px; top: 668px; width: 1420px; border-color: var(--red); } #scene-generate .tweak { color: var(--red); }
    </style>
    <div class="head"><div class="eyebrow">What comes out</div><div class="hl">One operation, projected.</div></div>
    <div class="abs srcrow"><div class="term gen"><div class="cmd"><span class="ps">$</span><span class="typed">ortho generate</span><span class="cur"></span></div></div>
      <span class="chip src1">verbs/claim.ts <span class="mu">10 lines</span></span><span class="mu ar1">→</span><span class="chip src2 cy" style="border-color:var(--cyan)">model.json</span><span class="mu ar2">→</span><span class="chip src3 cy" style="border-color:var(--cyan)">generated/ <span class="mu">${D.facts.generatedFiles} files</span></span></div>
    ${card(0, "HTTP API", "api/src/handle/claim.ts", `<div class="row big">${verb.toUpperCase()} ${route}</div><div class="row a1"><em>payload</em>{ <span class="p">"name"</span>: <span class="s">"aaron"</span> }</div><div class="row a2"><em>answer</em>{ <span class="p">"handle"</span>: <span class="s">"hdl_…"</span> }</div><div class="row a3"><span class="n">${table.HandleTaken.status}</span> {<span class="p">"_tag"</span>:<span class="s">"HandleTaken"</span>,<span class="p">"code"</span>:<span class="s">"${table.HandleTaken.code}"</span>}</div><div class="row a3 mu">and ${errors.length - 1} more refusals, each typed</div>`)}
    ${card(1, "SDK", "sdk/src/handle/claim.ts", `<div class="row big"><span class="t">Sdk</span>.handle.<span class="f">claim</span>({ name: <span class="s">"aaron"</span> })</div><div class="row c">// typed from the declaration</div><div class="row c">// refuses ${errors.slice(0, 2).join(" | ")} | …</div><div class="row c">// one request key across retries</div><div class="row tweak hidden0">// my little tweak</div>`)}
    ${card(2, "CLI", "cli/src/handle/claim.ts", `<div class="row big"><span class="cy">$</span> ${esc(how)}</div><div class="row"><span class="mu">--${flag[1]}</span> &lt;${flag[2]}&gt;</div><div class="prose">${esc(flag[3])}.</div>`)}
    ${card(3, "MCP tool", "mcp/src/index.ts", `<div class="row big"><span class="s">"handle.claim"</span></div><div class="prose"><span class="d1">${esc(tool.slice(0, split))}</span><b class="d2">${esc(tool.slice(split))}</b></div>`)}
    ${card(4, "Docs", "docs/handle/claim.md", `<div class="row big"># handle.claim</div><div class="prose" style="margin-bottom:4px">Who may call: ${esc(who)}</div><table>${errors.map((e) => `<tr class="tr"><td class="rd">${e}</td><td>exit ${table[e].exit}</td><td>${table[e].code}</td></tr>`).join("")}</table>`)}
    ${card(5, "Server", "server/main.ts", `<div class="row big"><span class="t">Handlers</span>.<span class="f">serve</span>({</div>${served.map((e, k) => `<div class="row">  ${esc(e)}${k < served.length - 1 ? "," : " })"}</div>`).join("")}`)}
    <div class="abs more">${D.facts.generatedFolders.filter((f) => !["api", "sdk", "cli", "mcp", "docs", "server"].includes(f)).map((f) => `<span class="chip m-${f}">generated/${f}</span>`).join("")}</div>
    <div class="abs veil hidden0"></div>
    <div class="panel term drift hidden0"><div class="bar"><span class="dots"></span><span>plugged-in</span><span class="tag rd">after editing generated/sdk by hand</span></div><div class="screen">${Film.term("ortho check", D.cap.drift, { keep: (l) => !/^(blanks|ratchets)/.test(l) })}</div></div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3);
    s.run(s.$(".gen"), c("g1", "ortho"));
    s.in(".src1", c("g2", "lines"), { y: 8 }); s.in(".ar1, .src2", c("g2", "lines") + 0.35, { y: 8, stagger: 0.1 }); s.in(".ar2, .src3", c("g2", "you get"), { y: 8, stagger: 0.1 });
    const show = (k, t) => s.in(".k" + k, t, { y: 26, dur: 0.5 });
    show(0, c("g2", "HTTP")); s.fromTo(".k0 .a1", { opacity: 0.25 }, { opacity: 1, duration: 0.3 }, c("g2", "payload")); s.fromTo(".k0 .a2", { opacity: 0.25 }, { opacity: 1, duration: 0.3 }, c("g2", "answer")); s.fromTo(".k0 .a3", { opacity: 0.25 }, { opacity: 1, duration: 0.3 }, c("g2", "refusals"));
    show(1, c("g3", "SDK")); show(2, c("g4", "command"));
    show(3, c("g5", "MCP")); s.fromTo(".k3 .d2", { opacity: 0.3 }, { opacity: 1, duration: 0.4 }, c("g5", "including"));
    show(4, c("g6", "docs")); s.fromTo(".k4 .tr", { opacity: 0.25 }, { opacity: 1, duration: 0.25, stagger: 0.1 }, c("g6", "every refusal"));
    show(5, c("g7", "served")); s.in(".m-portal", c("g7", "portal"), { y: 8 }); s.in(".m-infra", c("g7", "infrastructure"), { y: 8 }); s.in(".more .chip:not(.m-portal):not(.m-infra)", c("g7", "$"), { y: 8, stagger: 0.1 });
    s.to(".card", { borderColor: "#62c6ff", boxShadow: "0 0 0 3px rgba(98,198,255,.16)", duration: 0.4, stagger: 0.06 }, c("g8", "projection"));
    s.to(".card", { boxShadow: "0 0 0 0px rgba(98,198,255,0)", borderColor: "rgba(98,198,255,.45)", duration: 0.5 }, c("g8", "$") + 0.2);
    s.to(".stamp", { color: "#e9f0fa", duration: 0.35, stagger: 0.05 }, c("g9", "never"));
    const hand = c("g9", "Change one");
    s.in(".tweak", hand, { y: 0, dur: 0.25 }); s.to(".k1", { borderColor: "#ff7373", duration: 0.3 }, hand);
    const fails = c("g9", "check") - 0.5;
    s.fromTo(".veil", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, fails); s.to(".k1", { zIndex: 3 }, fails); s.in(".drift", fails, { y: 24 });
    s.run(s.$(".drift"), fails + 0.2, { type: 0.5, at: fails + 0.95, each: 0.1 });
  },
});
