// Sheet 10. A change to the blueprint, and the four recorded commands that follow it: check, generate, impact, prove.
Film.scene("change", {
  step: "change",
  html: (D) => {
    const file = "blueprint/things/handle/verbs/claim.ts", src = D.src[file];
    const hunks = [...D.cap.change.matchAll(/@@ -(\d+)[^\n]*\n-([^\n]*)\n\+([^\n]*)/g)].map((m) => ({ line: +m[1], now: m[3] }));
    const stale = /^stale (.+)$/m.exec(D.cap["change-impact"])[1].split(", "), cut = (text) => text.trimEnd().split("\n").map((l) => l.replace(/ {2}no-edited-output.*$/, "  no-edited-output: differs from what the blueprint generates")).join("\n");
    const screen = (id, cmd, text, keep) => `<div class="screen ${id}">${Film.term(cmd, text, keep ? { keep } : {})}</div>`;
    return `<style>
      #scene-change .ed { left: 96px; top: 262px; width: 850px; } #scene-change .ln.was { background: rgba(255,115,115,.1); } #scene-change .ln.now { background: rgba(84,216,152,.12); overflow: hidden; } #scene-change .ln.now > i { color: var(--green); } #scene-change .ln.was > i.minus { color: var(--red); }
      #scene-change .term { left: 980px; top: 262px; width: 844px; height: 560px; overflow: hidden; } #scene-change .term .screen { position: absolute; left: 0; right: 0; top: 46px; font-size: 19px; line-height: 31px; } #scene-change .term .o { white-space: pre; overflow: hidden; text-overflow: ellipsis; padding-left: 0; text-indent: 0; } #scene-change .term .C .o { white-space: pre-wrap; padding-left: 4ch; text-indent: -4ch; }
      #scene-change .ops { left: 96px; top: 858px; right: 96px; display: flex; gap: 10px; flex-wrap: wrap; } #scene-change .op { position: relative; padding: 8px 12px 8px 32px; border: 1px solid var(--green); color: var(--green); font-family: var(--mono); font-size: 17.5px; white-space: nowrap; } #scene-change .op::before { content: ""; position: absolute; left: 12px; top: 50%; width: 12px; height: 12px; margin-top: -6px; border-radius: 50%; background: currentColor; }
      #scene-change .op em { font: 600 15px var(--label); font-style: normal; text-transform: uppercase; letter-spacing: .12em; margin-left: 8px; display: inline-grid; } #scene-change .op em span { grid-area: 1 / 1; } #scene-change .op .st2 { opacity: 0; } #scene-change .opsl { left: 96px; top: 824px; }
    </style>
    <div class="head"><div class="eyebrow">Change</div><div class="hl">Edit the blueprint. See exactly what moved.</div></div>
    <div class="panel ed" data-hunks='${JSON.stringify(hunks).replace(/'/g, "&#39;")}'>${Film.editor("c", file, Film.code(src, { from: 7, size: "small" }), '<span class="tag">you write</span>')}</div>
    <div class="panel term"><div class="bar"><span class="dots"></span><span>plugged-in</span></div>
      ${screen("A", "ortho check", cut(D.cap["change-check"]))}${screen("B", "ortho generate", D.cap["change-generate"])}${screen("C", "ortho impact", D.cap["change-impact"])}${screen("E", "ortho prove", D.cap["change-prove"], (l) => /^(journey |prove )/.test(l))}</div>
    <div class="abs lbl opsl">every operation, after the change</div>
    <div class="abs ops">${D.facts.operations.map((o) => `<span class="op${stale.includes(o) ? " stale" : ""}">${o}<em>${stale.includes(o) ? '<span class="st1">stale</span><span class="st2">proven</span>' : "<span>proven</span>"}</em></span>`).join("")}</div>`;
  },
  build(s) {
    const c = s.cue, body = s.$(".ed .code"), hunks = JSON.parse(s.$(".ed").dataset.hunks);
    s.in(".head", s.start + 0.3); s.in(".ed", s.start + 0.4, { y: 20 });
    // Each changed line: the old one is marked, the new one opens under it.
    const made = hunks.map((h) => {
      const old = body.querySelector(`.ln[data-n="${h.line}"]`), now = old.cloneNode(true);
      now.classList.add("now"); now.querySelector("i").textContent = "+"; now.querySelector("code").innerHTML = Film.code(h.now + "\n").match(/<code>([\s\S]*?)<\/code>/)[1]; old.after(now);
      const height = now.offsetHeight; return { ...h, old, now, height };
    });
    made.forEach((m) => s.tl.set(m.now, { height: 0, autoAlpha: 0 }, 0));
    const edit = (m, t) => { s.tl.to(m.old, { backgroundColor: "rgba(255,115,115,.1)", opacity: 0.5, duration: 0.3 }, t); s.tl.to(m.old.querySelector("code"), { textDecoration: "line-through", duration: 0.01 }, t); s.tl.to(m.now, { height: m.height, autoAlpha: 1, duration: 0.45, ease: "power2.out" }, t + 0.1); };
    const budget = made.find((m) => m.now.textContent.includes("budget")), words = made.find((m) => m.now.textContent.includes("description"));
    edit(budget, c("x1", "budget") - 0.5); edit(words, c("x1", "reword"));
    const show = (id, t, v) => s.run(s.$("." + id), t, v), hide = (id, t) => s.to("." + id, { autoAlpha: 0, duration: 0.25 }, t - 0.3);
    s.in(".term", c("x2") - 0.2, { y: 16 });
    show("A", c("x2") + 0.1, { type: 0.5, each: 0.07 }); s.to(s.$$(".A .o").filter((o) => o.textContent.startsWith("drift")), { color: "#e9f0fa", backgroundColor: "rgba(255,115,115,.14)", duration: 0.3 }, c("x2", "eight"));
    const t3 = c("x3"); hide("A", t3); show("B", t3, { type: 0.5, at: c("x3", "remade") - 0.1, each: 0.07 });
    [["SDK", "/sdk/"], ["command", "/cli/"], ["MCP", "/mcp/"], ["docs", "/docs/"]].forEach(([w, part]) => s.to(s.$$(".B .o").filter((o) => o.textContent.includes(part)), { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.14)", duration: 0.25 }, c("x3", w)));
    const t4 = c("x4", "ortho impact") - 0.3; hide("B", t4); show("C", t4, { type: 0.5, at: c("x4", "stale") - 0.5, each: 0.25 });
    s.in(".opsl", c("x4", "stale") - 0.2); s.in(".op", c("x4", "stale") - 0.2, { stagger: 0.05, y: 10 });
    s.to(".op.stale", { color: "#ffb55c", borderColor: "#ffb55c", backgroundColor: "rgba(255,181,92,.1)", duration: 0.3 }, c("x4", "Only claim"));
    s.fromTo(".op:not(.stale)", { backgroundColor: "rgba(84,216,152,0)" }, { backgroundColor: "rgba(84,216,152,.14)", duration: 0.3, stagger: 0.04 }, c("x4", "Everything else"));
    const t5 = c("x5"); hide("C", t5); const done = show("E", t5, { type: 0.4, each: 0.12 });
    s.to(".op.stale", { color: "#54d898", borderColor: "#54d898", backgroundColor: "rgba(84,216,152,.14)", duration: 0.35 }, Math.max(done, c("x5", "green")));
    s.to(".op.stale .st1", { opacity: 0, duration: 0.2 }, Math.max(done, c("x5", "green"))); s.to(".op.stale .st2", { opacity: 1, duration: 0.2 }, Math.max(done, c("x5", "green")) + 0.1);
  },
});
