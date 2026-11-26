// Sheet 2. The designer says the idea back, says what it is not, then names the things and the states each can be in.
Film.scene("back", {
  step: "page",
  html: (D) => {
    const P = Loc.page(D), esc = Film.esc, idea = P.part("The idea, said back"), things = P.part("Things");
    // The idea's lines are one paragraph: its sentences, one to a row.
    const sents = idea.lines.join(" ").match(/[^.]+\./g).map((x) => x.trim()), iNot = sents.findIndex((x) => /\bNOT\b/.test(x));
    if (iNot !== 2) throw new Error("back: the idea no longer says what it is NOT in its third sentence");
    const sent = (x, k) => {
      let html = Loc.rich(x);
      if (k === iNot) ["NOT", "bank", "checkout", "exchange"].forEach((w) => { html = Loc.mark(html, w, "wd wd-" + w.toLowerCase()); });
      return `<div class="sent sent${k}${k === iNot ? " isnot" : ""} hidden0">${html}</div>`;
    };
    // A new thing's line: its name, how sure, what it is, the states it can be in, and anything after.
    const fresh = things.lines.filter((l) => l.includes("(new")).map((l) => {
      const m = /^- (\w+) \((new[^)]*)\): (.+?)\. States: ([^.]+)\.(.*)$/.exec(l); if (!m) throw new Error("back: a new thing's line lost its States: " + l);
      return { name: m[1], mark: m[2], what: m[3], states: m[4].split(", "), after: m[5].trim() };
    });
    if (fresh.length !== 3) throw new Error("back: the page no longer has three new things");
    const rest = things.lines.filter((l) => !l.includes("(new"));
    const card = (t, k) => `<div class="thing thing${k} hidden0"><div class="lbl">${t.mark.split(", ").map((w) => (w === "guess" ? '<span class="guess">(guess)</span>' : esc(w))).join(" ")}</div>
      <div class="nm">${esc(t.name)}</div><div class="what">${esc(t.what)}</div>
      <div class="sts hidden0"><div class="lbl">states</div><div class="chips">${t.states.map((st) => `<span class="chip">${esc(st)}</span>`).join("")}</div>${t.after ? `<div class="after">${esc(t.after)}</div>` : ""}</div></div>`;
    return `${Kit.css}${Loc.css("back")}<style>
      #scene-back .idea { left: 96px; top: 282px; width: 1128px; }
      #scene-back .idea .sent { font-size: 40px; line-height: 1.3; font-weight: 500; letter-spacing: -.01em; margin-top: 26px; padding-left: 22px; border-left: 3px solid var(--cyan); }
      #scene-back .idea .sent.isnot { border-left-color: var(--paper); } #scene-back .idea .wd { border-bottom: 3px solid transparent; }
      #scene-back .idea .sent3 { font-size: 30px; color: var(--text2); border-left-color: var(--rule2); }
      #scene-back .things { left: 96px; top: 282px; width: 1128px; }
      #scene-back .things .row { display: flex; gap: 24px; margin-top: 18px; }
      #scene-back .thing { flex: 1; height: 468px; padding: 18px 22px; border: 1.5px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); }
      #scene-back .thing .nm { font-size: 48px; font-weight: 500; letter-spacing: -.015em; line-height: 1.15; margin: 4px 0 8px; }
      #scene-back .thing .what { font-size: 25px; line-height: 1.3; color: var(--text2); height: 66px; }
      #scene-back .thing .sts { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--rule2); } #scene-back .thing .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
      #scene-back .thing .chip { font-size: 23px; padding: 6px 14px; } #scene-back .thing .after { margin-top: 14px; font-size: 22px; color: var(--muted); }
      #scene-back .touch { margin-top: 26px; font-size: 24px; line-height: 1.3; color: var(--text2); padding-left: 22px; border-left: 3px solid var(--rule2); } #scene-back .touch + .touch { margin-top: 12px; }
    </style>
    <div class="head"><div class="eyebrow">The page</div><div class="hl">It says your idea back.</div></div>
    <div class="who">${Kit.who("designer", "the designer")}</div>
    <div class="abs idea"><div class="plbl hidden0">${esc(idea.name)}</div>${sents.map(sent).join("")}</div>
    <div class="abs things"><div class="plbl hidden0">${esc(things.name)}</div><div class="row">${fresh.map(card).join("")}</div>${rest.map((l) => `<div class="touch hidden0">${Loc.rich(P.bare(l))}</div>`).join("")}</div>
    ${Loc.sheet(D)}`;
  },
  build(s) {
    const c = s.cue, IDEA = "The idea, said back", THINGS = "Things", lit = { color: "#62c6ff", borderBottomColor: "#62c6ff", duration: 0.25 };
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(".pg", s.start + 0.3, { y: 0 });
    // b1, b2: the idea, said back.
    s.in(".idea .plbl", c("b1", "say"), { y: 8 }); Loc.fill(s, IDEA, c("b1", "say"), 0.25); Loc.now(s, IDEA, c("b1", "say"));
    s.in(".sent0", c("b2", "claimed"), { y: 10 }); s.in(".sent1", c("b2", "Every"), { y: 10 });
    // b3: what it is not.
    s.in(".sent2, .sent3", c("b3", "what"), { y: 10, stagger: 0.25 }); s.to(".sent0, .sent1", { opacity: 0.45, duration: 0.4 }, c("b3", "what"));
    s.to(".wd-not", { color: "#62c6ff", duration: 0.25 }, c("b3", "not."));
    Loc.lightMini(s, IDEA, /\bNOT\b/, c("b3", "bank"));
    s.to(".wd-bank", lit, c("b3", "bank")); s.to(".wd-checkout", lit, c("b3", "checkout")); s.to(".wd-exchange", lit, c("b3", "exchange"));
    // b4: the things, and their states.
    const t4 = c("b4");
    s.out(".idea", t4 - 0.25, { dur: 0.3 });
    Loc.fill(s, THINGS, c("b4", "draws")); Loc.now(s, THINGS, c("b4", "draws")); s.in(".things .plbl", c("b4", "draws"), { y: 8 });
    s.in(".thing", c("b4", "things"), { y: 14, stagger: 0.12 }); s.in(".touch", c("b4", "things") + 0.5, { y: 8, stagger: 0.12 });
    s.in(".thing .sts", c("b4", "states"), { y: 8, stagger: 0.1 });
    ["wallet", "payment", "withdrawal"].forEach((w, k) => {
      const el = s.$(".thing" + k); if (el.querySelector(".nm").textContent.toLowerCase() !== w) throw new Error("back: the new things are no longer a wallet, a payment and a withdrawal, in that order");
      const t = c("b4", w), others = s.$$(".thing").filter((o) => o !== el);
      s.to(el, { borderColor: "#e9f0fa", opacity: 1, duration: 0.3 }, t); s.to(others, { borderColor: "rgba(132,170,222,.36)", opacity: 0.5, duration: 0.3 }, t);
      Loc.lightMini(s, THINGS, new RegExp("^- " + el.querySelector(".nm").textContent + " \\(new"), t);
    });
    s.to(".thing", { opacity: 1, duration: 0.3 }, c("b4", "$") + 0.1);
  },
});
