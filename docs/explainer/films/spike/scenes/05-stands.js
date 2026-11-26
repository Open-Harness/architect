// Sheet 5. What you read: the page, its answer and its open risks. How a spike goes wrong. And how this one stands: practice, no
// command, run by an agent for this chapter on a design nobody has agreed, and the page's other spike not run.
Film.scene("stands", {
  step: "stands",
  html: (D) => {
    const { text } = Loc.readme(D), R = Loc.run(D), plan = D.cap["plan-page"].out.split("\n");
    const a = Kit.line(text, /^\*\*Answer\.\*\*/), who = Loc.span(text, /Nobody has agreed that page/, "It is small, and it is real."), risks = Kit.line(text, /^## Open risks$/), first = Loc.span(text, /^- No provider was called\./, "That is the other spike on the page."), small = Loc.span(text, /^- One wallet, one reversal, eight events\./, "were not played.");
    if (small[0] !== first[first.length - 1] + 1) throw new Error("stands: the page's first two open risks no longer follow each other");
    if (!/agent ran this spike on .* for chapter 2 of the manual/.test(who.map((k) => text.split("\n")[k - 1]).join(" "))) throw new Error("stands: the page no longer says an agent ran it for this chapter");
    const spikes = plan.filter((l) => / Spike\.$/.test(l)), other = spikes.filter((l) => !/late reversal/.test(l)); if (spikes.length !== 2 || other.length !== 1 || !/provider/.test(other[0])) throw new Error("stands: the plan page no longer has one other spike, about the provider");
    return `${Kit.css}${Loc.css("stands")}<style>
      #scene-stands .carry { position: absolute; left: 1130px; top: 262px; width: 694px; } #scene-stands .carry .strip { position: relative; margin-top: 10px; }
      #scene-stands .wrong { position: absolute; left: 1130px; top: 430px; width: 694px; } #scene-stands .wrong .lbl { margin-bottom: 6px; }
      #scene-stands .wrong .way { display: flex; align-items: center; gap: 16px; height: 62px; border-bottom: 1px solid var(--rule); font-size: 29px; } #scene-stands .wrong .way i { font-style: normal; font-family: var(--mono); font-size: 24px; color: var(--muted); }
      #scene-stands .wrong .askit { height: 56px; display: flex; align-items: center; padding-left: 34px; font-size: 27px; color: var(--cyan); border-bottom: 1px solid var(--rule); }
      #scene-stands .other { position: absolute; left: 1130px; top: 724px; width: 694px; font-family: var(--mono); font-size: 22px; line-height: 32px; color: var(--text2); } #scene-stands .other .tag { display: inline-block; color: var(--paper); font-size: 20px; margin-bottom: 10px; }
      #scene-stands .next { position: absolute; right: 96px; top: 890px; display: flex; align-items: center; gap: 18px; } #scene-stands .next .chip { font-family: var(--sans); font-size: 38px; padding: 12px 30px; border-color: var(--paper); }
      #scene-stands .ran { position: absolute; left: 1130px; top: 430px; width: 694px; } #scene-stands .ran .fact { display: flex; align-items: center; height: 62px; border-bottom: 1px solid var(--rule); font-size: 29px; }
    </style>
    <div class="head"><div class="eyebrow">What you read</div><div class="hl">You read the page, and nothing else.</div></div>
    <div class="who">${Kit.who("you")}</div>
    ${Loc.page(D, { id: "st-page", x: 96, y: 262, w: 1000, lines: [a, ...who, risks, ...first, ...small], size: "small", tag: '<span class="tag">the page</span>' })}
    <div class="carry"><div class="lbl">what the spike played</div>${Loc.strip(R.ways[0].example, { width: 173 })}</div>
    <div class="wrong"><div class="lbl hidden0">a spike goes wrong when</div>
      <div class="way w1 hidden0"><i>1</i>it answers a different question</div>
      <div class="way w2 hidden0"><i>2</i>it only shows the idea working</div><div class="askit hidden0">ask what it did to break it</div>
      <div class="way w3 hidden0"><i>3</i>the code gets kept</div>
      <div class="way w4 hidden0"><i>4</i>the answer is read as a decision</div></div>
    <div class="ran"><div class="lbl hidden0">this spike</div><div class="fact f1 hidden0">an agent ran it, for this chapter</div><div class="fact f2 hidden0">it is small</div><div class="fact f3 hidden0">it called no provider</div><div class="fact f4 hidden0">nobody has agreed the design it tests</div></div>
    <div class="st1 hidden0">${Kit.stand("practice", "spiking: one agent, one question, one page", "left:96px;top:900px")}</div>
    <div class="st2 hidden0">${Kit.stand("missing", "no command runs a spike", "left:96px;top:942px")}</div>
    <div class="other hidden0"><span class="tag">the other spike · not run</span><br><span>${Film.esc(other[0])}</span></div>
    <div class="next"><span class="lbl nx hidden0" style="font-size:28px">Next ·</span><span class="chip k1 hidden0">Describe it</span></div>`;
  },
  build(s) {
    const c = s.cue, { text } = Loc.readme(s.D), body = s.$("#st-page .code");
    const a = Kit.line(text, /^\*\*Answer\.\*\*/), who = Loc.span(text, /Nobody has agreed that page/, "It is small, and it is real."), risks = Kit.line(text, /^## Open risks$/), first = Loc.span(text, /^- No provider was called\./, "That is the other spike on the page."), small = Loc.span(text, /^- One wallet, one reversal, eight events\./, "were not played.");
    const lit = (el, t) => s.to(el, { backgroundColor: "rgba(98,198,255,.26)", duration: 0.3 }, t);
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // e1: the page; the answer, then the open risks.
    s.fromTo("#st-page", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5 }, s.start + 0.5); s.fromTo(".carry", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, s.start + 0.7);
    s.focus(body, [a, a], c("e1", "answer")); s.focus(body, [risks, small[small.length - 1]], c("e1", "open"));
    // e2, e3: the four ways a spike goes wrong.
    s.in(".wrong .lbl", c("e2", "wrong"), { y: 0 }); s.focus(body, null, c("e2", "wrong"));
    s.in(".w1", c("e2", "different"), { x: 12, y: 0 }); s.in(".w2", c("e2", "only"), { x: 12, y: 0 }); s.in(".askit", c("e2", "Ask"), { x: 12, y: 0 });
    s.in(".w3", c("e3", "code"), { x: 12, y: 0 }); s.in(".w4", c("e3", "answer"), { x: 12, y: 0 });
    // e4: how this one stands.
    const t4 = c("e4");
    s.out(".wrong", t4 - 0.35, { dur: 0.3 }); s.in(".st1", c("e4", "how"), { y: 0 }); s.in(".st2", c("e4", "No command"), { y: 0 });
    s.in(".ran .lbl", c("e4", "An agent") - 0.1, { y: 0 }); s.in(".f1", c("e4", "An agent"), { x: 12, y: 0 }); s.focus(body, [who[0], who[who.length - 1]], c("e4", "An agent"));
    lit(Loc.mark(Loc.ln(s, "#st-page", who[who.length - 1]), "It is small"), c("e4", "small")); s.focus(body, [small[0], small[small.length - 1]], c("e4", "small") + 0.5); lit(Loc.mark(Loc.ln(s, "#st-page", small[0]), "One wallet, one reversal, eight events."), c("e4", "small") + 0.6); s.in(".f2", c("e4", "small"), { x: 12, y: 0 });
    s.focus(body, [first[0], first[first.length - 1]], c("e4", "called")); lit(Loc.mark(Loc.ln(s, "#st-page", first[0]), "No provider was called."), c("e4", "called") + 0.1); s.in(".f3", c("e4", "called"), { x: 12, y: 0 });
    s.focus(body, [who[0], who[who.length - 1]], c("e4", "nobody")); lit(Loc.mark(Loc.ln(s, "#st-page", who[0]), "Nobody has agreed that page"), c("e4", "nobody") + 0.1); s.in(".f4", c("e4", "nobody"), { x: 12, y: 0 });
    // e5: the other spike was not run. Next.
    s.focus(body, [first[first.length - 1], first[first.length - 1]], c("e5", "other")); s.in(".other", c("e5", "other"), { y: 8 });
    s.in(".nx", c("e5", "Next"), { y: 0 }); s.in(".k1", c("e5", "describe"), { y: 10 });
  },
});
