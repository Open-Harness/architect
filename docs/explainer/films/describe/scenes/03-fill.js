// Sheet 3. Two of the seven are answered on the plan page: thing.ts and machine.ts as they stood, then as the recording left
// them, beside the page's own line. The check again: two rows leave the list and the number becomes five.
Film.scene("fill", {
  step: "fill",
  html: (D) => {
    const b0 = Loc.blanks(D, "describe-0-check"), b1 = Loc.blanks(D, "describe-1-check"), plan = Loc.plan(D);
    Loc.spoken(D, "c1", /^(\w+) of the (\w+) are/i, b0.count - b1.count, b0.count); Loc.spoken(D, "c4", /(\w+) blanks/i, b1.count);
    const t0 = D.cap["describe-0-thing-ts"], t1 = D.cap["describe-1-thing-ts"], m0 = D.cap["describe-0-machine-ts"], m1 = D.cap["describe-1-machine-ts"];
    if (t0.path !== t1.path || m0.path !== m1.path) throw new Error("fill: the before and after recordings are not of the same files");
    const gone = b0.rows.filter((a) => !b1.rows.some((z) => z.file === a.file && z.ask === a.ask)).map((a) => a.file).sort();
    if (gone.join() !== [m0.path, t0.path].sort().join()) throw new Error("fill: the blanks that left are not the two this sheet fills");
    const from = Kit.line(m0.text, /^export const machine/);
    return `${Kit.css}${Loc.css("fill")}<style>
      #scene-fill .slot .tag { color: var(--muted); } #scene-fill .slot.after .tag { color: var(--paper); }
      #scene-fill .ask1 { left: 1284px; top: 262px; width: 540px; } #scene-fill .ask1 .words { font-size: 30px; line-height: 1.3; font-weight: 500; margin-top: 4px; }
      #scene-fill .ask1 .why { margin-top: 14px; font-size: 24px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Fill</div><div class="hl">Fill only what the page already says.</div></div>
    ${Loc.who("designer", "the designer")}
    ${Loc.strip(D, { id: "fl-strip", x: 96, y: 262, w: 1728, cls: "hidden0" })}
    ${Kit.ed(D, { id: "fl-t0", text: t0.text, path: t0.path, x: 96, y: 364, w: 1728, cls: "hidden0 slot", tag: '<span class="tag">as ortho add wrote it</span>' })}
    ${Kit.ed(D, { id: "fl-t1", text: t1.text, path: t1.path, x: 96, y: 364, w: 1728, cls: "hidden0 slot after", tag: '<span class="tag">filled, in the page\'s words</span>' })}
    ${Kit.ed(D, { id: "fl-m0", text: m0.text, path: m0.path, x: 96, y: 364, w: 1728, from, cls: "hidden0 slot", tag: '<span class="tag">as ortho add wrote it</span>' })}
    ${Kit.ed(D, { id: "fl-m1", text: m1.text, path: m1.path, x: 96, y: 364, w: 1728, from, cls: "hidden0 slot after", tag: '<span class="tag">filled, in the page\'s words</span>' })}
    ${Kit.term(D, { id: "fl-check", cap: "describe-1-check", x: 96, y: 262, w: 1164, h: 318, cls: "hidden0", keep: (l, k) => k < b1.lines, tag: `<span class="tag">its first ${b1.lines} lines</span>` })}
    <div class="kbox ask1 hidden0"><div class="lbl">the plan page · first question</div><div class="words">${Film.esc(plan.first[0])}</div><div class="why">You haven't answered it.</div></div>
    ${Loc.band(D, "describe-0-check", "describe-1-check")}`;
  },
  build(s) {
    const c = s.cue, D = s.D, t0 = D.cap["describe-0-thing-ts"].text, m0 = D.cap["describe-0-machine-ts"].text, tl = Kit.line(t0, /^\s*description: Blueprint\.todo\(/), ml = Kit.line(m0, /^\s*states: Blueprint\.todo\(/);
    if (!/^\s*description: "/.test(D.cap["describe-1-thing-ts"].text.split("\n")[tl - 1]) || !/^\s*states: \[/.test(D.cap["describe-1-machine-ts"].text.split("\n")[ml - 1])) throw new Error("fill: the filled lines are not where the blanks were");
    Loc.todo(s.$("#fl-t0 .code")); Loc.todo(s.$("#fl-m0 .code"));
    const what = Loc.asks(s, "what a wallet is"), states = Loc.asks(s, "the states a wallet can be in"), strip = s.$("#fl-strip .pline");
    const money = Loc.mark(strip, "a handle's money"), four = Loc.mark(strip, /States: [\w, ]+\./), per = Loc.mark(strip, "One per claimed handle.");
    const lightOn = (m, t) => s.tl.to(m, { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.24)", duration: 0.3 }, t), fillBox = (rows, t) => s.tl.to(rows.map((r) => r.querySelector(".box")), { backgroundColor: "#e9f0fa", borderStyle: "solid", duration: 0.3 }, t);
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(".band", s.start + 0.3, { y: 0 });
    // c1: two of the seven are on the page.
    Loc.only(s, [...what, ...states], c("c1", "Two")); s.in("#fl-strip", c("c1", "plan page") - 0.2, { y: 12 });
    s.in("#fl-t0", c("c1", "fills") - 0.1, { y: 14 });
    // c2: what a wallet is.
    Loc.only(s, what, c("c2")); s.focus("#fl-t0 .code", [tl, tl], c("c2", "What"));
    const tf = c("c2", "handle's"); s.tl.set(s.$("#fl-t1 .code .focusbar"), { autoAlpha: 0 }, 0);
    Loc.becomes(s, "#fl-t0", "#fl-t1", tf); s.focus("#fl-t1 .code", [tl, tl], tf, 0.01); lightOn(money, tf); lightOn(per, c("c2", "one for")); fillBox(what, tf + 0.2);
    // c3: and its states.
    const t3 = c("c3");
    s.out("#fl-t1", t3 - 0.3, { dur: 0.25 }); s.in("#fl-m0", t3 - 0.05, { y: 0, dur: 0.3 }); Loc.only(s, states, t3); s.focus("#fl-m0 .code", [ml, ml], t3 + 0.1);
    s.tl.to([money, per], { backgroundColor: "rgba(98,198,255,0)", color: "#a9bcd6", duration: 0.3 }, t3);
    const ts = c("c3", "Opening");
    Loc.becomes(s, "#fl-m0", "#fl-m1", ts); s.focus("#fl-m1 .code", [ml, ml], ts, 0.01); lightOn(four, ts); fillBox(states, ts + 0.2);
    // c4: check again. Five.
    const t4 = c("c4"), K = s.$("#fl-check"), out = s.$$("#fl-check .o"), five = c("c4", "five");
    s.out("#fl-strip, #fl-m1", t4 - 0.35, { dur: 0.3 }); s.in(K, t4 - 0.1, { y: 12, dur: 0.3 });
    Loc.type(s, K, t4, Math.max(0.35, five - 0.3 - t4)); Loc.print(s, out, five - 0.2, 0.05);
    Loc.only(s, [], t4); s.tl.to(out[0], { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.13)", duration: 0.3 }, five + 0.1);
    s.tl.to(s.$$(".band .brow.goes"), { height: 0, autoAlpha: 0, duration: 0.5, ease: "power2.inOut" }, five);
    s.tl.to(s.$(".band .cnt.was"), { autoAlpha: 0, y: -24, duration: 0.3 }, five); s.tl.fromTo(s.$(".band .cnt.next"), { autoAlpha: 0, y: 24, scale: 1.3 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(2)" }, five + 0.1);
    // c5: the designer stops. Who may open depends on a question you haven't answered.
    const may = Loc.asks(s, "who may open"), mayOut = Loc.rows(s, "#fl-check", "who may open");
    s.tl.to(out[0], { backgroundColor: "rgba(98,198,255,0)", color: "#a9bcd6", duration: 0.3 }, c("c5", "who may"));
    Loc.only(s, may, c("c5", "who may")); Loc.lit(s, "#fl-check", mayOut, c("c5", "who may"));
    s.in(".ask1", c("c5", "question"), { x: 14, y: 0 });
    const stay = may[0].querySelector(".stay"); stay.textContent = "stays a blank"; s.in(stay, c("c5", "stays"), { x: -10, y: 0, dur: 0.35 });
  },
});
