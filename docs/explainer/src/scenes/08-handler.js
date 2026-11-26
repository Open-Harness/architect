// Sheet 8. The one freehand part: the handler, scaffolded once. First its header (what the runtime already does), then its body.
Film.scene("handler", {
  step: "behave",
  html: (D) => {
    const file = "src/handle/claim.ts", src = D.src[file], rows = src.split("\n"), at = (re) => rows.findIndex((l) => re.test(l)) + 1;
    const table = at(/The handle's machine/), runtime = at(/What the runtime does/), closes = at(/^ \*\/$/), fn = at(/^const claim: Handler/), end = at(/^export default claim/) - 2;
    const head = Film.code(src, { from: 1, to: 1, size: "small" }) + `<div class="gap">⋮</div>` + Film.code(src, { from: table, to: closes, size: "small" });
    const bp = D.src["blueprint/things/handle/verbs/claim.ts"].split("\n"), inv = D.src["blueprint/things/handle/invariants.ts"].split("\n");
    const never = [["check who is calling", bp.find((l) => l.includes("allowed:")).trim()], ["parse a request", bp.find((l) => l.includes("payload:")).trim()], ["refuse a taken name", inv.find((l) => l.includes("refuse: HandleTaken")).trim() + "  // invariants.ts"]];
    return `<style>
      #scene-handler .eyebrow { color: var(--amber); } #scene-handler .ed { left: 96px; top: 262px; width: 1728px; border-color: rgba(255,181,92,.55); } #scene-handler .ed .tag { color: var(--amber); }
      #scene-handler .code.small { line-height: 29px; } #scene-handler .ed .focusbar { background: rgba(255,181,92,.1); border-left-color: var(--amber); } #scene-handler .gap { padding: 0 0 0 30px; color: var(--dim); font-size: 22px; line-height: 26px; } #scene-handler #hd-head .code { padding: 10px 0; }
      #scene-handler .facts { left: 96px; top: 832px; display: flex; gap: 18px; } #scene-handler .facts .chip { font-family: var(--sans); font-size: 28px; padding: 12px 24px; border-color: var(--amber); color: var(--amber); }
      #scene-handler .never { left: 1010px; top: 392px; width: 790px; padding: 24px 28px 28px; background: #0b1727; border: 1px solid var(--rule2); box-shadow: -40px 0 60px 10px rgba(8,17,31,.9); }
      #scene-handler .nv { margin-top: 20px; } #scene-handler .nv .what { position: relative; display: inline-block; font-size: 34px; color: var(--text2); } #scene-handler .nv .what s { position: absolute; left: -4px; right: -4px; top: 54%; height: 3px; background: var(--red); transform-origin: 0 50%; }
      #scene-handler .nv .where { font-family: var(--mono); font-size: 18.5px; color: var(--muted); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    </style>
    <div class="head"><div class="eyebrow">The code you write</div><div class="hl">Behaviour is the only freehand.</div></div>
    <div class="panel ed" id="hd-head">${Film.editor("h", file, head, '<span class="tag">yours</span>')}</div>
    <div class="abs facts"><span class="chip f1">scaffolded once</span><span class="chip f2">yours from then on</span><span class="chip f3">never overwritten</span></div>
    <div class="panel ed" id="hd-body" data-fn="${fn}" data-end="${end}" data-rt="${runtime}" data-close="${closes}">${Film.editor("b", file, Film.code(src, { from: fn, to: end, size: "small" }), '<span class="tag">yours</span>')}</div>
    <div class="abs never"><div class="lbl" style="font-size:24px">What this handler never does</div>${never.map(([what, where], k) => `<div class="nv n${k}"><div class="what">${what}<s></s></div><div class="where">declared: ${Film.esc(where)}</div></div>`).join("")}</div>`;
  },
  build(s) {
    const c = s.cue, body = s.$("#hd-body"), rt = +body.dataset.rt, close = +body.dataset.close, rows = s.D.src["src/handle/claim.ts"].split("\n"), at = (re) => rows.findIndex((l) => re.test(l)) + 1;
    s.in(".head .eyebrow", s.start + 0.3); s.in(".head .hl", c("h1", "Behaviour") - 0.15);
    const top = s.$$("#hd-head .code")[0], doc = s.$$("#hd-head .code")[1];
    s.in("#hd-head", c("h2", "scaffolds"), { y: 20 }); s.focus(top, [1, 1], c("h2", "scaffolds") + 0.2);
    s.in(".f1", c("h2", "once"), { y: 10 }); s.in(".f2", c("h2", "yours"), { y: 10 }); s.in(".f3", c("h2", "never"), { y: 10 });
    s.focus(top, null, c("h3", "header")); s.focus(doc, [rt, close - 1], c("h3", "everything"));
    const t4 = c("h4");
    s.out("#hd-head, .facts", t4 - 0.3, { dur: 0.3 }); s.in("#hd-body", t4, { y: 14 });
    const code = s.$("#hd-body .code");
    s.focus(code, [at(/yield\* steps\.record\(/), at(/^    \);$/)], c("h4", "Save")); s.focus(code, [at(/yield\* move\(\)/), at(/yield\* move\(\)/)], c("h4", "Make the move")); s.focus(code, [at(/return \{ handle: id \}/), at(/return \{ handle: id \}/)], c("h4", "Answer"));
    s.focus(code, null, c("h5") - 0.1);
    s.in(".never", c("h5") - 0.1, { x: 30, y: 0 });
    [["never checks", 0], ["never parses", 1], ["never refuses", 2]].forEach(([w, k]) => { s.in(".n" + k, c("h5", w), { y: 10, dur: 0.35 }); s.fromTo(`.n${k} .what s`, { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, c("h5", w) + 0.3); });
    s.to(".nv .where", { color: "#62c6ff", duration: 0.35, stagger: 0.12 }, c("h5", "declaration"));
  },
});
