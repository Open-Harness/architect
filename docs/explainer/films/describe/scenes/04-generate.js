// Sheet 4. The check's second complaint, drift; `ortho generate`, which does not wait for the blanks; what it left out; and the
// check again, failing only on the five questions that stay beside it.
Film.scene("generate", {
  step: "generate",
  html: (D) => {
    const b1 = Loc.blanks(D, "describe-1-check"), b2 = Loc.blanks(D, "describe-2-check"), c1 = D.cap["describe-1-check"].out.split("\n"), c2 = D.cap["describe-2-check"].out.split("\n");
    if (JSON.stringify(b1.rows) !== JSON.stringify(b2.rows)) throw new Error("generate: generating changed the list of blanks");
    const d0 = c1.findIndex((l) => /^drift ✘ \d+$/.test(l)), d1 = c1.findIndex((l) => /^ratchets /.test(l)); if (d0 < 0 || d1 < d0) throw new Error("generate: the check before generating has no drift");
    const stale = +/\d+/.exec(c1[d0])[0]; if (d1 - d0 - 1 !== stale) throw new Error("generate: drift counts " + stale + " files and lists " + (d1 - d0 - 1));
    Loc.spoken(D, "d1", /Drift, (\w+) files/i, stale); Loc.spoken(D, "d4", /on (\w+) blanks/i, b2.count);
    ["types ✔", "rules ✔", "drift ✔", "check ✘"].forEach((l) => { if (!c2.includes(l)) throw new Error("generate: the check after generating no longer prints " + l); });
    if (D.cap["describe-2-handlers"].out.split("\n").includes(b2.thing)) throw new Error("generate: a handler folder was written for the wallet");
    const model = D.cap["describe-2-model"].out.split("\n"), about = (l) => new RegExp(`^thing ${b2.thing} |^unfinished |^operation ${b2.thing}\\.`).test(l);
    if (model.some((l) => new RegExp(`^operation ${b2.thing}\\.`).test(l))) throw new Error("generate: the unfinished operation is in the model");
    const blanks = (l) => /^  blueprint\//.test(l);
    return `${Kit.css}${Loc.css("generate")}<style>
      #scene-generate #gn-drift .o { white-space: pre; overflow: hidden; text-overflow: ellipsis; padding-left: 0; text-indent: 0; }
      #scene-generate .tag { color: var(--muted); } #scene-generate #gn-drift .screen { padding: 18px 12px; }
      #scene-generate .anyway { left: 1040px; top: 330px; width: 784px; } #scene-generate .anyway .say { font-size: 48px; } #scene-generate .anyway .sub { margin-top: 14px; font-size: 30px; color: var(--text2); }
      #scene-generate .right { left: 1040px; top: 300px; width: 784px; } #scene-generate .right .say { font-size: 48px; } #scene-generate .right .sub { margin-top: 16px; font-size: 30px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Generate</div><div class="hl">The generated files fall behind.</div></div>
    ${Loc.who("designer", "the designer")}
    ${Kit.term(D, { id: "gn-drift", cap: "describe-1-check", x: 96, y: 262, w: 1728, h: 388, size: 19, keep: (l, k) => k >= d0 && k < d1, tag: `<span class="tag">the same check, further down</span>` })}
    ${Kit.term(D, { id: "gn-gen", cap: "describe-2-generate", x: 96, y: 262, w: 900, h: 420, cls: "hidden0" })}
    <div class="abs anyway hidden0"><div class="say">${b1.count} blanks left.<br>It generates anyway.</div><div class="sub">for the wallet as it stands</div></div>
    ${Kit.term(D, { id: "gn-model", cap: "describe-2-model", x: 1020, y: 262, w: 804, h: 208, size: 19, cls: "hidden0", keep: about, tag: `<span class="tag">${model.filter(about).length} of its ${model.length} lines</span>` })}
    ${Kit.term(D, { id: "gn-src", cap: "describe-2-handlers", x: 1020, y: 482, w: 804, h: 208, size: 19, cls: "hidden0" })}
    ${Kit.term(D, { id: "gn-check", cap: "describe-2-check", x: 96, y: 262, w: 900, h: 322, cls: "hidden0", keep: (l) => !blanks(l) && !/^exit /.test(l), tag: `<span class="tag">without its ${c2.filter(blanks).length} indented lines</span>` })}
    <div class="abs right hidden0"><div class="say">Unfinished, not broken.</div><div class="sub hidden0">That is right: the ${b2.count} are yours to decide.</div></div>
    ${Loc.band(D, "describe-1-check")}`;
  },
  build(s) {
    const c = s.cue, one = (sel, re) => Loc.rows(s, sel, re)[0];
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(".band", s.start + 0.3, { y: 0 });
    // d1: drift, eight files.
    const A = s.$("#gn-drift"), drift = s.$$("#gn-drift .o");
    s.in(A, s.start + 0.4, { y: 14 }); Loc.type(s, A, c("d1", "check") - 0.2, 0.4); Loc.print(s, drift, c("d1", "second"), 0.06);
    Loc.lit(s, "#gn-drift", [drift[0]], c("d1", "Drift")); Loc.lit(s, "#gn-drift", drift.slice(1), c("d1", "eight"));
    const fix = drift.slice(1).map((o) => Loc.mark(o, "run ortho generate")); s.tl.to(fix, { backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, c("d1", "stale"));
    // d2: generate. It doesn't wait.
    const t2 = c("d2"), G = s.$("#gn-gen"), made = s.$$("#gn-gen .o");
    s.out(A, t2 - 0.35, { dur: 0.3 }); s.in(G, t2 - 0.05, { y: 12, dur: 0.35 });
    const typed = Loc.type(s, G, c("d2", "run"), Math.max(0.5, c("d2", "It") - 0.35 - c("d2", "run")));
    Loc.print(s, made, typed + 0.15, 0.06);
    s.in(".anyway", c("d2", "doesn't"), { x: 14, y: 0 }); Loc.pulse(s, c("d2", "blanks"));
    // d3: types, a page of docs, a table. The operation is left out; no handler.
    [["types", /^created generated\/sdk\/src\/wallet\/types\.ts$/, "its types"], ["page", /^created generated\/docs\/wallet\/index\.md$/, "its page of docs"], ["table", /^updated generated\/server\/migrations\/\S+\.sql$/, "its table"]].forEach(([word, re, label], k, all) => {
      const row = one("#gn-gen", re), t = c("d3", word);
      Loc.lit(s, "#gn-gen", all.slice(0, k + 1).map((a) => one("#gn-gen", a[1])), t); s.in(Loc.label(row, label), t + 0.05, { x: 14, y: 0, dur: 0.3 });
    });
    const tu = c("d3", "The unfinished"), M = s.$("#gn-model"), S = s.$("#gn-src");
    s.out(".anyway", tu - 0.35, { dur: 0.3 });
    const show = (el, t) => { s.in(el, t, { y: 12, dur: 0.35 }); s.tl.fromTo(el.querySelector(".cmd"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t); s.tl.fromTo(el.querySelector(".typed"), { width: "auto" }, { width: "auto", duration: 0.01 }, t); Loc.print(s, [...el.querySelectorAll(".o")], t + 0.25, 0.08); };
    show(M, tu); const undone = one("#gn-model", /^unfinished \S+\.\S+  /);
    Loc.lit(s, "#gn-model", [undone], c("d3", "left out")); s.in(Loc.label(undone, "not an operation yet"), c("d3", "left out") + 0.05, { x: 14, y: 0, dur: 0.3 });
    show(S, c("d3", "no handler") - 0.3); const folders = s.$$("#gn-src .o");
    s.in(Loc.label(folders[folders.length - 1], "no wallet folder"), c("d3", "written"), { x: 14, y: 0, dur: 0.3 });
    // d4: check again. Types, rules, drift pass; check still fails, on five blanks.
    const t4 = c("d4"), K = s.$("#gn-check");
    s.out([G, M, S], t4 - 0.4, { dur: 0.3 }); s.in(K, t4 - 0.1, { y: 12, dur: 0.3 }); Loc.type(s, K, t4, 0.35);
    const count = one("#gn-check", /^\S+ has \d+ blanks$/), types = one("#gn-check", /^types ✔$/), rules = one("#gn-check", /^rules ✔$/), dr = one("#gn-check", /^drift ✔$/), ratchets = one("#gn-check", /^ratchets /), verdict = one("#gn-check", /^check ✘$/);
    Loc.print(s, [count], c("d4", "again") + 0.1); Loc.print(s, [types], c("d4", "types")); Loc.print(s, [rules], c("d4", "rules")); Loc.print(s, [dr, ratchets], c("d4", "drift"), 0.5); Loc.print(s, [verdict], c("d4", "check", 2));
    [[types, "types"], [rules, "rules"], [dr, "drift"]].forEach(([row, word]) => s.tl.to(row, { color: "#e9f0fa", duration: 0.25 }, c("d4", word) + 0.1));
    Loc.lit(s, "#gn-check", [verdict], c("d4", "fails")); Loc.lit(s, "#gn-check", [count, verdict], c("d4", "five"));
    s.tl.to(s.$(".band"), { borderColor: "#e9f0fa", duration: 0.3 }, c("d4", "five")); Loc.pulse(s, c("d4", "five") + 0.1);
    s.in(".right", c("d4", "fails"), { x: 14, y: 0 }); s.in(".right .sub", c("d4", "that is"), { y: 6 });
  },
});
