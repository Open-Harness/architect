// Sheet 4. Red on purpose: the recorded run on emptied handlers, counted, then one red line read, then the six that are green already.
Film.scene("red", {
  step: "fail",
  html: (D) => {
    const out = D.cap["prove-empty"].out, facts = D.facts.empty, marks = []; let cur;
    out.split("\n").forEach((l) => { if (l.startsWith("journey ")) marks.push((cur = [])); else if (/^  [✔✘] /.test(l)) cur.push(l[2] === "✔"); });
    const js = facts.journeys.map((j, k) => { if (marks[k].length !== j.steps || marks[k].filter(Boolean).length !== j.green) throw new Error("red: the run's lines and its counts disagree for " + j.name); return { ...j, marks: marks[k] }; });
    const steps = js.reduce((n, j) => n + j.steps, 0); if (steps - facts.red !== facts.byDescription) throw new Error("red: green steps are not all proved by the description");
    const oneRed = /^  ✘ "an unclaimed name has no public page"/, oneGreen = /handler never runs": proved by the description$/; Local.one(D.cap["prove-empty-one"].out, oneRed); Local.one(out, oneGreen);
    return `${Kit.css}<style>
      #scene-red .board { left: 1010px; top: 262px; width: 814px; } #scene-red .counts { display: flex; gap: 44px; margin-bottom: 20px; } #scene-red .count { display: flex; align-items: baseline; gap: 12px; } #scene-red .count b { font-size: 68px; font-weight: 500; line-height: 1; letter-spacing: -.02em; font-variant-numeric: tabular-nums; } #scene-red .count .lbl { font-size: 24px; }
      #scene-red .count.bad b, #scene-red .count.bad .lbl { color: var(--red); }
      #scene-red .jrow { display: flex; align-items: center; height: 39px; font-size: 22px; color: var(--text2); } #scene-red .jrow span { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 12px; } #scene-red .jrow i { flex: none; width: 17px; height: 17px; margin-left: 7px; border-radius: 50%; background: var(--red); } #scene-red .jrow i.pass { background: var(--green); }
      #scene-red .odd { left: 1040px; top: 300px; font-size: 60px; font-weight: 500; letter-spacing: -.015em; } #scene-red .odd .lbl { font-size: 24px; margin-bottom: 10px; }
      #scene-red .stamp { left: 96px; top: 716px; padding: 16px 34px; border: 3px solid var(--paper); font-size: 50px; font-weight: 500; letter-spacing: -.01em; background: rgba(8,17,31,.9); }
      #scene-red .o .want { color: var(--text2); padding: 2px 0; } #scene-red .o .got { color: var(--text2); padding: 2px 0; }
      #scene-red .six { left: 96px; top: 282px; width: 860px; } #scene-red .six .count b { font-size: 150px; color: var(--green); } #scene-red .six .count .lbl { font-size: 34px; color: var(--green); }
      #scene-red .six .why { font-size: 34px; margin-top: 26px; line-height: 1.3; } #scene-red .six .so { font-size: 28px; color: var(--text2); margin-top: 10px; } #scene-red .six .free { font-size: 34px; margin-top: 22px; font-weight: 500; }
    </style>
    <div class="head"><div class="eyebrow">The first run</div><div class="hl">Red on purpose.</div></div>
    ${Local.who("author")}
    ${Kit.term(D, { id: "red-run", cap: "prove-empty", x: 96, y: 262, w: 880, h: 384, keep: (l) => /^journey /.test(l) || /^prove ✘ \d+ failing$/.test(l), tag: '<span class="tag emptied">every handler emptied</span>' })}
    <div class="abs board"><div class="counts"><div class="count n1"><b>${js.length}</b><span class="lbl">journeys</span></div><div class="count n2"><b>${steps}</b><span class="lbl">steps</span></div><div class="count n3 bad"><b>${facts.red}</b><span class="lbl">red</span></div></div>
      ${js.map((j) => `<div class="jrow"><span>${Film.esc(j.name)}</span>${j.marks.map((ok) => `<i class="${ok ? "pass" : "fail"}"></i>`).join("")}</div>`).join("")}</div>
    <div class="abs odd"><div class="lbl">something odd to prove</div>Can these journeys fail?</div>
    <div class="abs stamp">A check that can't fail proves nothing.</div>
    ${Kit.term(D, { id: "red-one", cap: "prove-empty-one", x: 96, y: 716, w: 1728, h: 184, size: 19.5, keep: (l) => oneRed.test(l) })}
    <div class="abs six"><div class="count"><b>${facts.byDescription}</b><span class="lbl">proved by the description</span></div><div class="why">The blueprint already says who may call.</div><div class="so">The runtime refuses a stranger before any handler runs.</div><div class="free">Nobody has to build those.</div></div>
    ${Kit.term(D, { id: "red-desc", cap: "prove-empty", x: 96, y: 716, w: 1728, h: 150, keep: (l) => oneGreen.test(l) })}`;
  },
  build(s) {
    const c = s.cue, tl = s.tl, run = s.$("#red-run");
    s.in(".head, .whoat", s.start + 0.3); s.in(run, c("r1", "prove") - 0.2, { y: 16 }); s.fromTo(".emptied", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, c("r2", "handlers"));
    s.run(run, c("r2", "Ortho"), { at: c("r2", "runs every"), each: 0.24 });
    s.in(".odd", c("r1", "odd"), { y: 12 }); s.out(".odd", c("r3") - 0.4, { dur: 0.3 });
    s.in(".n1", c("r3", "Seven"), { y: 10, dur: 0.35 }); s.in(".jrow span", c("r3", "Seven") + 0.1, { y: 0, dur: 0.3, stagger: 0.04 });
    s.in(".n2", c("r3", "56"), { y: 10, dur: 0.35 }); s.fromTo(".jrow i", { autoAlpha: 0, backgroundColor: "#4d6382" }, { autoAlpha: 1, backgroundColor: "#4d6382", duration: 0.15, stagger: 0.012 }, c("r3", "56") + 0.1);
    s.in(".n3", c("r3", "50"), { y: 10, dur: 0.35 }); tl.to(s.$$(".jrow i.fail"), { backgroundColor: "#ff7373", duration: 0.15, stagger: 0.012 }, c("r3", "50") + 0.1); tl.to(s.$$(".jrow i.pass"), { backgroundColor: "#54d898", duration: 0.2 }, c("r3", "$") + 0.2);
    s.fromTo(".n3", { scale: 1 }, { scale: 1.12, duration: 0.22, yoyo: true, repeat: 1, transformOrigin: "0 60%" }, c("r4", "result"));
    s.fromTo(".stamp", { autoAlpha: 0, scale: 1.25 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)", transformOrigin: "0 50%" }, c("r4", "A check"));
    // One red line, read.
    const t5 = c("r5"), one = s.$("#red-one"), row = one.querySelector(".o"), _w = Local.mark(row, "expected refused with ProfileNotFound", "want"), _g = Local.mark(row, "failed with 500", "got"), want = row.querySelector(".want"), got = row.querySelector(".got");
    s.out(".stamp", t5 - 0.4, { dur: 0.35 }); s.in(one, t5, { y: 14 }); s.run(one, t5 + 0.15, { type: 0.9, at: c("r5", "says what") });
    tl.to(want, { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.16)", duration: 0.3 }, c("r5", "Expected", 2)); tl.to(got, { color: "#ff7373", backgroundColor: "rgba(255,115,115,.14)", duration: 0.3 }, c("r5", "failed"));
    // Six are green already.
    const t6 = c("r6"), desc = s.$("#red-desc");
    s.out([run, one], t6 - 0.4, { dur: 0.35 }); s.in(".six .count", t6, { y: 12 }); s.fromTo(".six .count .lbl", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, c("r6", "proved by"));
    tl.to(s.$$(".jrow i.fail"), { opacity: 0.25, duration: 0.4 }, t6); tl.fromTo(s.$$(".jrow i.pass"), { scale: 1 }, { scale: 1.7, duration: 0.25, yoyo: true, repeat: 1, stagger: 0.08 }, c("r6", "green")); tl.to(".n3", { opacity: 0.35, duration: 0.4 }, t6);
    s.in(desc, c("r6", "marked") - 0.2, { y: 14 }); s.run(desc, c("r6", "marked") - 0.1, { type: 0.4, at: c("r6", "proved by") });
    s.in(".six .why", c("r6", "blueprint says"), { y: 8 }); s.in(".six .so", c("r6", "runtime refuses"), { y: 8 }); s.in(".six .free", c("r6", "Nobody"), { y: 8 });
  },
});
