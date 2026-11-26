// Sheet 3. What must stay true, read by its owner; one rule nobody would have said aloud, and what it decides.
Film.scene("rules", {
  step: "rules",
  html: (D) => {
    const P = Loc.page(D), esc = Film.esc, WHO = "Who may do what", TRUE = "What must stay true", rules = P.part(TRUE);
    const iOne = rules.lines.findIndex((l) => l.startsWith("- A name has at most one open wallet")), iSent = rules.lines.findIndex((l) => l.startsWith("- Money sent to @name reaches the person who held the name"));
    if (iOne < 0 || iSent < 0) throw new Error("rules: the page lost a rule this sheet lights");
    if (iSent !== 1) throw new Error("rules: the rule about who the money reaches is no longer the second one, and the narration calls it the second");
    const name = (/@\w+/.exec(rules.lines[iSent]) ?? [])[0], never = (/never a later one/.exec(rules.lines[iSent]) ?? [])[0];
    if (!name || !never) throw new Error("rules: the second rule lost its words");
    const row = (l, k) => { let html = Loc.rich(P.bare(l)); if (k === iSent) html = Loc.mark(html, never, "nev"); return `<div class="rule${k === iOne ? " one" : k === iSent ? " sent" : ""} hidden0">${html}</div>`; };
    return `${Kit.css}${Loc.css("rules")}<style>
      #scene-rules .list { left: 96px; top: 282px; width: 1128px; }
      #scene-rules .rule { position: relative; font-size: 27px; line-height: 36px; margin-top: 14px; padding: 4px 16px 4px 22px; border-left: 3px solid var(--rule2); color: var(--paper); }
      #scene-rules .aloud { left: 118px; top: 492px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 24px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; }
      #scene-rules .aloud::before { content: ""; width: 2px; height: 34px; background: var(--paper); margin-top: -18px; }
      #scene-rules .pic .seg { position: absolute; top: 620px; height: 64px; display: flex; align-items: center; padding: 0 22px; font-size: 28px; font-weight: 500; border: 1.5px solid var(--paper); background: #0b1727; white-space: nowrap; }
      #scene-rules .pic .segb { border-color: var(--rule2); color: var(--text2); }
      #scene-rules .pic .cap { position: absolute; white-space: nowrap; } #scene-rules .pic .cap b { font-family: var(--mono); font-weight: 500; color: var(--paper); text-transform: none; letter-spacing: 0; }
      #scene-rules .pic .dot { position: absolute; left: 409px; top: 749px; width: 22px; height: 22px; border-radius: 50%; background: var(--paper); }
      #scene-rules .pic .land { position: absolute; left: 96px; top: 858px; width: 540px; height: 78px; display: flex; align-items: center; gap: 18px; padding: 0 22px; border: 1.5px solid var(--rule2); background: #0b1727; font-size: 28px; font-weight: 500; white-space: nowrap; }
      #scene-rules .pic .nev { position: absolute; left: 990px; top: 800px; font-size: 28px; color: var(--muted); white-space: nowrap; }
    </style>
    <div class="head"><div class="eyebrow">The rules</div><div class="hl">What must stay true, in your words.</div></div>
    <div class="who">${Kit.who("you", "you, reading")}</div>
    <div class="abs list"><div class="plbl hidden0">${esc(rules.name)}</div>${rules.lines.map(row).join("")}</div>
    <div class="abs aloud hidden0">you might never have said this aloud</div>
    <div class="pic">
      <div class="lbl cap c1 hidden0" style="left:96px;top:578px">who holds <b>${esc(name)}</b></div>
      <div class="seg sega hidden0" style="left:96px;width:540px">the first holder</div>
      <div class="lbl cap c2 hidden0" style="left:660px;top:578px">the name changes hands</div>
      <div class="seg segb hidden0" style="left:660px;width:564px">a later holder</div>
      <svg class="ink"><line class="mu dash track" x1="96" y1="760" x2="1224" y2="760"/><line class="tick" x1="420" y1="686" x2="420" y2="748"/><line class="mu hands" x1="648" y1="600" x2="648" y2="800"/>
        <path class="home" d="M930 776 C 930 900, 800 897, 648 897"/><path class="homeh" d="M660 888 L646 897 L660 906"/></svg>
      <div class="lbl cap c3 hidden0" style="left:300px;top:790px">a payment, sent</div>
      <div class="lbl cap c4 hidden0" style="left:860px;top:712px">on its way</div>
      <div class="dot hidden0"></div>
      <div class="land hidden0"><span class="lbl">it reaches</span>the first holder</div>
      <div class="nev hidden0">${esc(never)}</div>
    </div>
    ${Loc.sheet(D, ["The idea, said back", "Things"])}`;
  },
  build(s) {
    const c = s.cue, WHO = "Who may do what", TRUE = "What must stay true", rules = s.$$(".rule"), one = s.$(".rule.one"), sent = s.$(".rule.sent");
    const light = (el, t) => { s.to(el, { opacity: 1, borderLeftColor: "#62c6ff", backgroundColor: "rgba(98,198,255,.1)", duration: 0.35 }, t); s.to(rules.filter((r) => r !== el), { opacity: 0.4, borderLeftColor: "rgba(132,170,222,.36)", backgroundColor: "rgba(98,198,255,0)", duration: 0.35 }, t); };
    s.$$("svg.ink line, svg.ink path").forEach((p) => gsap.set(p, { autoAlpha: 0 }));
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(".pg", s.start + 0.3, { y: 0 });
    // r1: who may do what is on the page too; then what must stay true.
    Loc.fill(s, WHO, c("r1", "Then"), 0.04);
    Loc.fill(s, TRUE, c("r1", "what must"), 0.06); Loc.now(s, TRUE, c("r1", "what must"));
    s.in(".list .plbl", c("r1", "what must"), { y: 8 }); s.in(rules, c("r1", "what must") + 0.2, { y: 8, stagger: 0.14, dur: 0.4 });
    // r2, r3: one wallet for a name; and who the money reaches.
    light(one, c("r2")); Loc.lightMini(s, TRUE, /^- A name has at most one open wallet/, c("r2"));
    light(sent, c("r3")); s.to(Loc.mini(s, TRUE, /^- A name has at most one open wallet/), { color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: 0.3 }, c("r3")); Loc.lightMini(s, TRUE, /^- Money sent to @name/, c("r3"));
    s.to(".rule .nev", { color: "#62c6ff", duration: 0.3 }, c("r3", "never"));
    // r4: nobody says this one aloud. What it decides: the name changes hands with a payment on its way.
    s.in(".aloud", c("r4", "might"), { y: -8 });
    s.out(rules.filter((r) => r !== sent && r !== one), c("r4", "aloud"), { dur: 0.45 });
    s.in(".c1, .sega", c("r4", "decides"), { y: 10, stagger: 0.1 }); s.fromTo(".track", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, c("r4", "decides") + 0.2);
    s.in(".c2, .segb", c("r4", "changes"), { x: -14, y: 0, stagger: 0.08 }); s.fromTo(".hands", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, c("r4", "changes"));
    s.in(".dot", c("r4", "payment"), { y: 0, scale: 0.3, dur: 0.35 }); s.in(".c3", c("r4", "payment"), { y: 6 }); s.draw(".tick", c("r4", "payment"), 0.3);
    s.to(".dot", { x: 510, duration: c("r4", "way") + 0.3 - c("r4", "on its"), ease: "power1.inOut" }, c("r4", "on its")); s.in(".c4", c("r4", "way"), { y: 6 });
    const home = c("r4", "way") + 0.55;
    s.draw(".home", home, 0.6); s.fromTo(".homeh", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, home + 0.55);
    s.in(".land", home + 0.5, { x: 12, y: 0 }); s.to(".land", { borderColor: "#e9f0fa", duration: 0.3 }, home + 0.9); s.to(".segb", { opacity: 0.5, duration: 0.3 }, home + 0.9); s.in(".pic .nev", home + 0.9, { y: 0 });
    s.to(".pg", { borderColor: "#e9f0fa", duration: 0.35 }, c("r4", "page"));
  },
});
