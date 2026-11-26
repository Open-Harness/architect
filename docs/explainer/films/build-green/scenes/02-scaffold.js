// Sheet 2. Rung zero: the scaffold generate wrote, and the first recorded run of the one journey against it.
Film.scene("scaffold", {
  step: "scaffold",
  html: (D) => {
    const h = Loc.handler(D, 0), blank = Kit.line(h.text, /Handlers\.blank\(/), run = D.cap["climb-0-prove"].out, rung = D.facts.climb[0];
    // The journey's own steps, by name, and which of them this run left red.
    const names = [...D.src["journeys/claim-a-handle.ts"].matchAll(/s\.step\(\s*"([^"]+)"/g)].map((m) => m[1]);
    const steps = names.map((name) => ({ name, ok: !run.includes(`✘ "${name}"`) }));
    if (steps.length !== rung.stepsbox || steps.filter((x) => x.ok).length !== rung.green) throw new Error("scaffold: the journey's steps do not match the recorded count");
    const first = '  ✘ "aaron claims the free name"';
    return `${Kit.css}${Loc.css("scaffold")}<style>
      #scene-scaffold #sc-ed .code.small { line-height: 30px; } #scene-scaffold #sc-ed .tag { color: var(--cyan); }
      #scene-scaffold .stepsbox { left: 96px; top: 690px; width: 1728px; } #scene-scaffold .stepsbox .cols { display: grid; grid-template-columns: 1fr 1fr; grid-auto-flow: column; grid-template-rows: repeat(4, 38px); column-gap: 40px; margin-top: 12px; }
      #scene-scaffold .step { font-family: var(--mono); font-size: 22px; line-height: 38px; color: var(--text2); white-space: nowrap; } #scene-scaffold .step b { display: inline-block; width: 34px; font-weight: 400; }
      #scene-scaffold .needs { margin-top: 18px; font-size: 30px; }
      #scene-scaffold #sc-blank .tag { color: var(--cyan); } #scene-scaffold .goes { left: 1300px; top: 770px; width: 524px; }
    </style>
    <div class="head"><div class="eyebrow">Rung zero</div><div class="hl">It starts from a scaffold.</div></div>
    <div class="who">${Kit.who("builder", "the builder")}</div>${Loc.ladder(D, 0)}
    ${Kit.term(D, { id: "sc-gen", cap: "climb-0-generate", x: 96, y: 262, w: 1728, h: 150 })}
    ${Kit.ed(D, { id: "sc-ed", text: h.text, path: h.path, x: 96, y: 428, w: 1728, from: h.from, size: "small", tag: '<span class="tag">scaffolded</span>' })}
    ${Kit.term(D, { id: "sc-term", cap: "climb-0-prove", x: 96, y: 262, w: 1728, h: 400, cls: "hidden0", tag: '<span class="tag">rung 0 · the scaffold</span>', keep: (l) => l.startsWith("journey ") || l.startsWith(first) })}
    <div class="abs stepsbox hidden0"><div class="lbl">the eight steps of journeys/claim-a-handle.ts, in this run</div>
      <div class="cols">${steps.map((x) => `<div class="step ${x.ok ? "held" : "fell"}"><b class="${x.ok ? "gr" : "rd"}">${x.ok ? "✔" : "✘"}</b>${Film.esc(x.name)}</div>`).join("")}</div>
      <div class="needs hidden0">${rung.green} of ${rung.stepsbox} pass before a line is written: <span class="mu">the steps that never needed this handler.</span></div></div>
    ${Kit.ed(D, { id: "sc-blank", text: h.text, path: h.path, x: 96, y: 716, w: 1180, from: blank - 1, to: blank, cls: "hidden0", tag: '<span class="tag">the blank</span>' })}
    <div class="abs goes hidden0"><div class="say" style="font-size:38px">That is where the builder goes.</div></div>`;
  },
  build(s) {
    const c = s.cue, h = Loc.handler(s.D, 0), blank = Kit.line(h.text, /Handlers\.blank\(/), body = s.$("#sc-ed .code");
    s.in(".head", s.start + 0.3); s.in(".who, .ladder", s.start + 0.4, { y: 0 });
    // c1: generate has already written it.
    s.in("#sc-gen", c("c1", "Generate") - 0.5, { y: 14 }); Loc.type(s, s.$("#sc-gen"), c("c1", "Generate") - 0.3, 0.5); Loc.print(s, s.$$("#sc-gen .o"), c("c1", "written"));
    s.in("#sc-ed", c("c1", "scaffold"), { y: 16 });
    s.focus(body, [blank - 1, blank], c("c1", "blank")); s.in(Kit.call(s, body, blank - 1, "the blank"), c("c1", "blank") + 0.05, { x: 14, y: 0, dur: 0.35 });
    // c2: the first run, of the one journey.
    const t2 = c("c2");
    s.out("#sc-gen, #sc-ed", t2 - 0.4, { dur: 0.35 }); s.in("#sc-term", t2, { y: 14 });
    Loc.type(s, s.$("#sc-term"), c("c2", "proves"), Math.max(0.7, c("c2", "handle") - c("c2", "proves")));
    // c3: four of eight.
    const rows = s.$$("#sc-term .o"), journey = rows[0], fails = rows.slice(1);
    Loc.print(s, [journey], c("c3", "Four")); Loc.light(s, 0, c("c3", "Four") + 0.15);
    s.in(".stepsbox", c("c3", "steps"), { y: 12 }); s.in(".needs", c("c3", "Those"), { y: 8 });
    s.to(".step.fell", { opacity: 0.35, duration: 0.35 }, c("c3", "Those")); s.to(".step.held", { color: "#e9f0fa", duration: 0.35 }, c("c3", "Those"));
    // c4: the first failure names the blank, and the file.
    const t4 = c("c4");
    s.out(".stepsbox", t4 - 0.3, { dur: 0.3 }); Loc.print(s, fails, t4 + 0.05, 0.1);
    const names = Loc.rows(s, "#sc-term", "BlankReached: record: the work this step does"), file = Loc.rows(s, "#sc-term", "handler src/handle/claim.ts, declared in");
    Loc.lit(s, "#sc-term", names, c("c4", "names")); s.in(Loc.label(names[0], "names the blank"), c("c4", "names") + 0.05, { x: 14, y: 0, dur: 0.35 });
    Loc.lit(s, "#sc-term", [...names, ...file], c("c4", "file")); s.to(Loc.mark(file[0], "src/handle/claim.ts"), { backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, c("c4", "file") + 0.1);
    s.to(Loc.mark(names[0], "BlankReached: record: the work this step does"), { backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, c("c4", "names") + 0.1);
    s.in("#sc-blank", c("c4", "That's") - 0.3, { y: 14 }); s.focus(s.$("#sc-blank .code"), [blank, blank], c("c4", "That's"));
    s.in(".goes", c("c4", "where"), { x: 14, y: 0 });
  },
});
