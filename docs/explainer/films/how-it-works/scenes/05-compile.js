// Sheet 5. `ortho check` compiles the blueprint to the model. The terminal is the recorded run; the JSON is cut from the real model.
Film.scene("compile", {
  step: "compile",
  html: (D) => {
    const c = D.facts.claim, flat = (v) => JSON.stringify(v, null, 1).replace(/\n\s*/g, " ").replace(/\[ /g, "[").replace(/ \]/g, "]");
    const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));
    const refs = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, pick(v, ["named", "ref"])]));
    const rows = [`"handle.claim": {`, ...[["thing", c.thing], ["file", c.file], ["payload", refs(c.payload)], ["answer", refs(c.answer)], ["move", c.move], ["refusals", c.refusals], ["allowed", c.allowed], ["steps", c.steps], ["idempotent", c.idempotent], ["budget", c.budget], ["hash", c.hash]]
      .map(([k, v], i, all) => `  ${JSON.stringify(k)}: ${flat(v)}${i < all.length - 1 ? "," : ""}`), "}"];
    return `<style>
      #scene-compile .term { left: 96px; top: 282px; width: 560px; } #scene-compile .json { left: 690px; top: 282px; width: 1134px; } #scene-compile .json .code { font-size: 18px; line-height: 33px; }
      #scene-compile .stat { top: 640px; left: 96px; width: 560px; display: flex; align-items: center; gap: 18px; } #scene-compile .stat b { font-size: 76px; font-weight: 500; line-height: 1; letter-spacing: -0.02em; } #scene-compile .stat div { flex: 1; }
      #scene-compile .stat .ar { flex: none; font-size: 44px; color: var(--muted); } #scene-compile .stat span { display: block; margin-top: 6px; }
      #scene-compile .rule { left: 690px; width: 1134px; top: 836px; font-size: 32px; color: var(--text2); } #scene-compile .rule b { color: var(--paper); font-weight: 500; }
    </style>
    <div class="head"><div class="eyebrow">Compile</div><div class="hl">The blueprint becomes one model.</div></div>
    <div class="panel term"><div class="bar"><span class="dots"></span><span>plugged-in</span></div><div class="screen">${Film.term("ortho check", D.cap.check)}</div></div>
    <div class="abs stat"><div class="in"><b>${D.facts.blueprintFiles}</b><span class="lbl">files in blueprint/</span></div><div class="ar">→</div><div class="outb"><b class="cy">1</b><span class="lbl">model, ${Math.round(D.facts.modelBytes / 1024)} KB of JSON</span></div></div>
    <div class="panel json"><div class="bar"><span class="dots"></span><span>generated/model/<b>model.json</b></span><span class="tag cy">an excerpt</span></div>${Film.code(rows.join("\n"), { lang: "json" }).replace('class="code ', 'class="code nog ')}</div>
    <div class="abs rule">Every output is made <b>from this file</b>, never from your files directly.</div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3); s.in(".term", s.start + 0.4, { y: 20 });
    s.run(s.$(".term"), c("c1", "ortho"), { at: c("c1", "$") + 0.35, each: 0.1 });
    const rows = s.$$(".term .o");
    s.to(rows.slice(1, 4), { color: "#e9f0fa", duration: 0.3, stagger: 0.12 }, c("c2", "refuses"));
    s.in(".json", c("c3", "the model"), { x: 30, y: 0 }); s.in(".stat .in", c("c3", "one JSON") - 0.5); s.in(".stat .ar, .stat .outb", c("c3", "one JSON"), { stagger: 0.12 });
    const last = s.$$(".json .ln").length - 1;
    s.focus(".json .code", [last, last], c("c3", "hashed"));
    s.focus(".json .code", null, c("c4")); s.in(".rule", c("c4", "made from"));
  },
});
