// Sheet 2. Stubs, made while planning: the app, the one thing the designer picks, one recorded command, one recorded stub, and its blanks.
Film.scene("stubs", {
  step: "stub",
  html: (D) => {
    const things = D.facts.things;
    if (!things.includes("handle")) throw new Error("stubs: no handle thing");
    const stub = D.cap["stub-refused-not-owner-ts"], name = stub.path.replace(/^.*\//, "").replace(/\.ts$/, "");
    const block = () => { let on = false; return (l) => { if (!l.startsWith("  ")) on = l.startsWith(`journeys/${name} `); return on; }; };
    if (D.cap["stubs-check"].out.split("\n").filter(block()).length < 2) throw new Error("stubs: ortho check has no block for " + name);
    return `${Kit.css}<style>
      #scene-stubs .app { left: 96px; top: 290px; width: 800px; height: 330px; padding: 26px 32px; } #scene-stubs .app .kbig { font-size: 64px; }
      #scene-stubs .things { display: flex; gap: 14px; margin: 14px 0 18px; } #scene-stubs .chip { font-size: 24px; } #scene-stubs .chip.given { border-color: var(--paper); color: var(--paper); }
      #scene-stubs .app .says { font-size: 32px; color: var(--text2); }
      #scene-stubs .hand { left: 940px; top: 290px; width: 884px; height: 330px; padding: 26px 32px; } #scene-stubs .hand .when { font-size: 40px; font-weight: 500; line-height: 1.2; margin-top: 4px; } #scene-stubs .hand .when span { color: var(--text2); }
      #scene-stubs .hand .one { display: flex; align-items: center; gap: 18px; margin-top: 34px; font-size: 30px; color: var(--text2); } #scene-stubs .hand .one .chip { font-size: 30px; padding: 8px 20px; }
      #scene-stubs .group { position: absolute; left: 1150px; border-left: 3px solid var(--cyan); padding-left: 22px; display: flex; flex-direction: column; justify-content: center; } #scene-stubs .group b { font-size: 30px; font-weight: 500; } #scene-stubs .group .lbl { color: var(--cyan); }
      #scene-stubs #stub-ed .code.small { line-height: 28px; } #scene-stubs #stub-ed .ln { transition: none; }
    </style>
    <div class="head"><div class="eyebrow">Stubs</div><div class="hl">Stubs, made while planning.</div></div>
    ${Local.who("designer", "the designer")}
    <div class="kbox app intro"><div class="lbl">the app, across this series</div><div class="kbig">Plugged In</div><div class="things">${things.map((t) => `<span class="chip thing" data-thing="${t}">${t}</span>`).join("")}</div><div class="says">a name, and a public page of links</div></div>
    <div class="kbox hand intro"><div class="lbl">the stubs are made</div><div class="when">while planning, <span class="before">before anyone builds</span></div><div class="one">${Kit.who("designer", "the designer")}<span>picks one thing</span><span class="chip given">handle</span></div></div>
    ${Kit.term(D, { id: "stub-run", cap: "stubs", x: 96, y: 290, w: 1010, h: 356 })}
    ${Kit.ed(D, { id: "stub-ed", text: stub.text, path: stub.path, x: 96, y: 262, w: 1728, to: 18, size: "small", tag: '<span class="tag">a stub, as it was written</span>' })}
    ${Kit.term(D, { id: "stub-check", cap: "stubs-check", x: 96, y: 752, w: 1728, h: 214, keep: block() })}
    ${Kit.stand("real", "recorded on examples/plugged-in")}`;
  },
  build(s) {
    const c = s.cue, tl = s.tl, text = s.D.cap["stub-refused-not-owner-ts"].text;
    s.in(".head, .whoat", s.start + 0.3);
    s.in(".app", c("s1", "plugged in") - 0.2, { y: 16 }); s.in(".thing", c("s1", "claims"), { y: 8, stagger: 0.25, dur: 0.35 }); s.in(".says", c("s1", "public page"), { y: 8 });
    s.in(".hand", c("s2", "planning") - 0.3, { y: 16 }); s.in(".before", c("s2", "before"), { y: 8 }); s.in(".one", c("s2", "designer"), { y: 8 }); s.fromTo(".given", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, c("s2", "handle"));
    s.to('.thing[data-thing="handle"]', { borderColor: "#e9f0fa", color: "#e9f0fa", duration: 0.3 }, c("s2", "handle"));
    // The recorded command, and its seven lines sorted by what each file is for.
    const t3 = c("s3"), run = s.$("#stub-run"), rows = [...run.querySelectorAll(".o")];
    s.out(".intro", t3 - 0.4, { dur: 0.35 }); s.in(run, t3, { y: 16 }); s.in(".kstand", t3 + 0.3, { y: 6 });
    s.run(run, c("s3", "ortho"), { at: c("s4") - 0.1, each: 0.13 });
    const kinds = [["paths through the states", /-(created-in|[a-z]+-to|refused-from)-/, "path"], ["roles", /-(refused-anonymous|refused-not-[A-Za-z]+|allowed-[a-z]+)\.ts/, "role"], ["declared errors", /-refused-handle-not-found\.ts/, "error"]];
    const sorted = kinds.map(([, re]) => rows.filter((r) => re.test(r.textContent)));
    if (sorted.some((g) => !g.length) || sorted.flat().length !== rows.length || new Set(sorted.flat()).size !== rows.length) throw new Error("stubs: the wrote lines no longer sort into paths, roles and declared errors");
    kinds.forEach(([label, , word], k) => {
      const g = sorted[k], top = 290 + 46 + g[0].offsetTop, bottom = 290 + 46 + g[g.length - 1].offsetTop + g[g.length - 1].offsetHeight;
      const el = document.createElement("div"); el.className = "group hidden0"; el.style.top = top + 3 + "px"; el.style.height = bottom - top - 6 + "px"; el.innerHTML = g.length > 1 ? `<span class="lbl">${g.length} files</span><b>${label}</b>` : `<b>${label}</b>`; s.el.appendChild(el);
      const t = c("s4", word); tl.fromTo(el, { autoAlpha: 0, x: 14 }, { autoAlpha: 1, x: 0, duration: 0.4 }, t);
      tl.to(rows.filter((r) => !g.includes(r)), { opacity: 0.4, duration: 0.3 }, t); tl.to(g, { opacity: 1, backgroundColor: "rgba(98,198,255,.1)", duration: 0.3 }, t);
    });
    tl.to(rows, { opacity: 1, backgroundColor: "rgba(98,198,255,0)", duration: 0.4 }, c("s4", "$") - 0.1);
    // One stub, opened.
    const t5 = c("s5"), body = s.$("#stub-ed .code"), ln = (re) => Kit.line(text, re), call = (n, label, t) => { const el = Kit.call(s, body, n, label); tl.fromTo(el, { autoAlpha: 0, x: 16 }, { autoAlpha: 1, x: 0, duration: 0.4 }, t); return el; };
    s.out([run, ...s.$$(".group")], t5 - 0.4, { dur: 0.35 }); s.in("#stub-ed", t5, { y: 16 });
    const says = ln(/^\s*"the stranger calls/), who = ln(/Who may call/), refused = ln(/^ \* Refused:/), must = ln(/refuses\(Blueprint\.NotAllowed\)/);
    s.focus(body, [says, says], c("s5", "stranger"));
    s.focus(body, [who, refused], c("s5", "who may call")); const k1 = call(who + 1, "who may call", c("s5", "who may call") + 0.1);
    s.focus(body, [must, must], c("s5", "must be refused")); const k2 = call(must, "must be refused", c("s5", "must be refused") + 0.1);
    // What it can't know.
    const blanks = text.split("\n").map((l, k) => (/Blueprint\.todo\(/.test(l) ? k + 1 : 0)).filter(Boolean); if (blanks.length !== 2) throw new Error("stubs: expected two blanks in the stub, found " + blanks.length);
    const t6 = c("s6", "blank"), lns = [...body.querySelectorAll(".ln")], lit = lns.filter((l) => blanks.includes(+l.dataset.n));
    s.out([k1, k2], c("s6") - 0.1, { dur: 0.3 });
    tl.to(body.querySelector(".focusbar"), { autoAlpha: 0, duration: 0.3 }, t6); tl.to(lns.filter((l) => !lit.includes(l)), { opacity: 0.32, duration: 0.35 }, t6); tl.to(lit, { opacity: 1, backgroundColor: "rgba(98,198,255,.12)", duration: 0.35 }, t6);
    blanks.forEach((n, k) => call(n, "a blank", t6 + 0.1 + k * 0.2));
    const check = s.$("#stub-check"), out = [...check.querySelectorAll(".o")];
    s.in(check, c("s6", "ortho") - 0.3, { y: 14 }); s.run(check, c("s6", "ortho") - 0.1, { type: 0.5, at: c("s6", "checklists") + 0.35, each: 0.3 });
    tl.to(out.slice(1), { color: "#e9f0fa", duration: 0.3, stagger: 0.15 }, c("s6", "question"));
    tl.fromTo(out.slice(1).map((o) => o.querySelector(".path")), { backgroundColor: "rgba(98,198,255,0)" }, { backgroundColor: "rgba(98,198,255,.18)", duration: 0.3, stagger: 0.1 }, c("s6", "file"));
  },
});
