// Sheet 4. The one page the spike keeps, quoted from spikes/pay-by-name-reversal/README.md: its question and answer, its
// headings, and the lines that say what the owner now has to decide. Beside it, the strip it stands on and the two files left.
Film.scene("page", {
  step: "page",
  html: (D) => {
    const { text } = Loc.readme(D), R = Loc.run(D), rows = text.split("\n");
    const q = Kit.line(text, /^\*\*Question\.\*\*/), a = Kit.line(text, /^\*\*Answer\.\*\*/); if (a !== q + 1) throw new Error("page: the answer no longer follows the question");
    const heads = rows.map((l, k) => (/^## /.test(l) ? k + 1 : 0)).filter(Boolean);
    ["## What was tried", "## What was found", "## The decision it supports", "## Open risks"].forEach((h) => { if (!rows.includes(h)) throw new Error("page: the page has no heading " + h); });
    const none = Loc.span(text, /^None is made here, and a spike makes none\./, "written."), either = Loc.span(text, /^- The rule "a balance never goes below zero"/, "Either settled is final, or the page gains a thing.");
    // The page's own table of measurements, checked against the run it reports.
    const cut = (l) => l.split("|").map((x) => x.trim()).filter(Boolean), th = Kit.line(text, /^\| Orders played \|/), names = cut(rows[th - 1]), vals = cut(rows[th + 1]);
    if (names.length !== vals.length || [R.total, R.early, R.late, R.cannot].some((v, k) => +vals[k].replace(/,/g, "") !== v)) throw new Error("page: the page's measurements are not the ones its run printed");
    const files = D.cap["spike-files"].out.split("\n").filter(Boolean); Loc.said(D, "d5", files.length);
    if (!files.includes("README.md") || !files.includes("spike.mjs")) throw new Error("page: the folder no longer holds the page and the code");
    return `${Kit.css}${Loc.css("page")}<style>
      #scene-page .page .hit { transition: none; }
      #scene-page .carry { position: absolute; left: 1120px; top: 262px; width: 704px; } #scene-page .carry .strip { position: relative; margin-top: 10px; }
      #scene-page .meas { position: absolute; left: 1120px; top: 452px; width: 704px; } #scene-page .meas .row { display: flex; justify-content: space-between; align-items: center; height: 50px; border-bottom: 1px solid var(--rule); font-size: 24px; color: var(--text2); } #scene-page .meas .row b { font-family: var(--mono); font-size: 28px; font-weight: 500; color: var(--paper); } #scene-page .meas .lbl { margin-bottom: 6px; }
      #scene-page #pg-ls .screen { font-size: 23px; line-height: 38px; }
      #scene-page .never { left: 1120px; top: 760px; width: 704px; } #scene-page .never .say { font-size: 36px; }
      #scene-page .stand1 .kstand { flex-wrap: wrap; row-gap: 8px; width: 704px; }
    </style>
    <div class="head"><div class="eyebrow">What is kept</div><div class="hl">One page. It opens with the question.</div></div>
    <div class="who">${Kit.who("agent", "the spike")}</div>
    ${Loc.page(D, { id: "pg-qa", x: 96, y: 262, w: 1000, lines: [q, a] })}
    ${Loc.page(D, { id: "pg-heads", x: 96, y: 630, w: 1000, lines: heads, tag: '<span class="tag">its headings</span>' })}
    ${Loc.page(D, { id: "pg-dec", x: 96, y: 630, w: 1000, lines: [...none, ...either], size: "small", cls: "hidden0", tag: '<span class="tag">the decision it supports</span>' })}
    <div class="carry hidden0"><div class="lbl">what it stands on · the example its run printed</div>${Loc.strip(R.ways[0].example, { width: 176 })}</div>
    <div class="meas hidden0"><div class="lbl">what was found · the page's own table</div>${names.map((nm, k) => `<div class="row"><span>${Film.esc(nm)}</span><b>${Film.esc(vals[k])}</b></div>`).join("")}</div>
    ${Kit.term(D, { id: "pg-ls", cap: "spike-files", x: 1120, y: 470, w: 704, h: 216, title: "orthograph", cls: "hidden0" })}
    <div class="abs never hidden0"><div class="say">The app never imports them.</div></div>
    <div class="stand1 hidden0">${Kit.stand("practice", "a rule kept by hand", "left:1120px;top:826px")}</div>`;
  },
  build(s) {
    const c = s.cue, { text } = Loc.readme(s.D), n = (re) => Kit.line(text, re), q = n(/^\*\*Question\.\*\*/), a = q + 1;
    const qa = s.$("#pg-qa .code"), heads = s.$("#pg-heads .code"), dec = s.$("#pg-dec .code");
    const s1 = Loc.mark(Loc.ln(s, "#pg-qa", a), "Not with the rules as the plan page has them."), s2 = Loc.mark(Loc.ln(s, "#pg-qa", a), "Once the holder has withdrawn, a late reversal breaks one of three rules, and the app only chooses which.");
    const lit = (el, t) => s.to(el, { backgroundColor: "rgba(98,198,255,.26)", duration: 0.3 }, t), unlit = (el, t) => s.to(el, { backgroundColor: "rgba(98,198,255,0)", duration: 0.3 }, t);
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // d1: one page, opening with the question and the answer.
    s.in("#pg-qa", c("d1", "writing") - 0.2, { y: 14 }); s.in(".carry", c("d1", "writing") + 0.3, { y: 10 });
    s.fromTo("#pg-heads", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5 }, c("d1", "one page")); s.to("#pg-heads .ln", { opacity: 0.5, duration: 0.01 }, c("d1", "one page"));
    s.focus(qa, [q, q], c("d1", "question"));
    s.focus(qa, [a, a], c("d1", "answer"));
    // d2: the answer, read.
    lit(s1, c("d2", "Not")); unlit(s1, c("d2", "Once")); lit(s2, c("d2", "Once"));
    // d3: tried, found, and not tried.
    const hn = (h) => Kit.line(text, new RegExp("^## " + h + "$")), tried = hn("What was tried"), found = hn("What was found"), decide = hn("The decision it supports"), risks = hn("Open risks");
    unlit(s2, c("d3")); s.in(".meas", c("d3", "found"), { y: 12 }); s.out(".meas", c("d5") - 0.5, { dur: 0.3 });
    s.focus(heads, [tried, tried], c("d3", "tried")); s.focus(heads, [found, found], c("d3", "found")); s.focus(heads, [risks, risks], c("d3", "not tried"));
    s.in(Kit.call(s, heads, risks, "what was not tried"), c("d3", "not tried") + 0.05, { x: 14, y: 0, dur: 0.3 });
    // d4: it decides nothing; it says what you have to decide.
    const t4 = c("d4"), none = n(/^None is made here, and a spike makes none\./), bullet = Loc.span(text, /^- The rule "a balance never goes below zero"/, "Either settled is final, or the page gains a thing."), last = bullet[bullet.length - 1];
    s.focus(heads, [decide, decide], t4 - 0.4); s.out("#pg-heads", c("d4", "nothing") - 0.1, { dur: 0.3 }); s.in("#pg-dec", c("d4", "nothing") + 0.15, { y: 12 });
    s.focus(dec, [none, none], c("d4", "nothing") + 0.3); lit(Loc.mark(Loc.ln(s, "#pg-dec", none), "None is made here, and a spike makes none."), c("d4", "nothing") + 0.4);
    s.focus(dec, [bullet[0], last], c("d4", "what you")); lit(Loc.mark(Loc.ln(s, "#pg-dec", last), "Either settled is final, or the page gains a thing."), c("d4", "Either"));
    // d5: the code is thrown away; two files stay; the app never imports them.
    const ls = s.$("#pg-ls"), rows = s.$$("#pg-ls .o"), code = Loc.rows(s, "#pg-ls", /^spike\.mjs$/)[0], page = Loc.rows(s, "#pg-ls", /^README\.md$/)[0];
    s.in(ls, c("d5") - 0.2, { y: 12 }); Loc.type(s, ls, c("d5"), 0.7); Loc.print(s, rows, c("d5", "Two"), 0.15);
    s.in(Loc.label(code, "thrown away · the evidence"), c("d5", "evidence"), { x: 14, y: 0, dur: 0.3 }); s.in(Loc.label(page, "the page"), c("d5", "Two") + 0.4, { x: 14, y: 0, dur: 0.3 });
    s.in(".never", c("d5", "never") - 0.3, { y: 12 }); s.in(".stand1", c("d5", "imports"), { y: 0 });
  },
});
