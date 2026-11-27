// Sheet 4. The two parts where real systems go wrong: what waits, as a thing in a state and what it waits for; and two places that must agree.
Film.scene("joins", {
  step: "joins",
  html: (D) => {
    const P = Loc.page(D), esc = Film.esc, waits = P.part("What waits"), agree = P.part("Where two places must agree");
    // The first line of each part, cut where its own words cut it.
    const w = /^- (An? \w+) in (\w+) (waits for) (.+)\.$/.exec(waits.lines[0]); if (!w) throw new Error("joins: the first thing that waits is no longer a thing in a state that waits for something");
    const a = /^- (The .+?) and (the .+?)\.$/.exec(agree.lines[0]); if (!a) throw new Error("joins: the first join is no longer two places");
    const short = /^(.+ really holds)( .+)$/.exec(a[2]); if (!short) throw new Error("joins: the first join lost the words really holds");
    const of = (part) => `<span class="tag">the first of its ${part.lines.length} lines</span>`;
    return `${Kit.css}${Loc.css("joins")}<style>
      #scene-joins .half { position: absolute; left: 96px; width: 1128px; padding: 18px 26px; border: 1.5px dashed var(--rule2); }
      #scene-joins .half .top { display: flex; align-items: center; justify-content: space-between; } #scene-joins .half .tag { color: var(--muted); font-size: 20px; }
      #scene-joins .half .plbl { color: var(--muted); }
      #scene-joins .half .line { font-size: 27px; line-height: 1.3; color: var(--text2); margin-top: 10px; white-space: nowrap; }
      #scene-joins .draw { display: flex; align-items: center; margin-top: 22px; height: 160px; }
      #scene-joins .bx { height: 160px; padding: 14px 22px; border: 1.5px solid var(--paper); background: #0b1727; display: flex; flex-direction: column; justify-content: center; }
      #scene-joins .bx .big { font-size: 40px; font-weight: 500; letter-spacing: -.01em; line-height: 1.15; } #scene-joins .bx .mid { font-size: 31px; font-weight: 500; line-height: 1.22; }
      #scene-joins .thing { width: 400px; } #scene-joins .thing .st { display: flex; align-items: center; gap: 12px; margin-top: 12px; } #scene-joins .thing .chip { font-size: 26px; padding: 5px 16px; border-color: var(--paper); }
      #scene-joins .arrow { flex: none; width: 230px; display: flex; flex-direction: column; align-items: center; gap: 6px; } #scene-joins .arrow .lbl { color: var(--paper); font-size: 24px; }
      #scene-joins .arrow i { display: block; width: 190px; height: 2px; background: var(--paper); position: relative; } #scene-joins .arrow i::after { content: ""; position: absolute; right: 0; top: -7px; width: 14px; height: 14px; border: 2px solid var(--paper); border-width: 2px 2px 0 0; transform: rotate(45deg); }
      #scene-joins .what { flex: 1; } #scene-joins .place { flex: 1; } #scene-joins .place.blank { border-style: dashed; border-color: var(--text2); }
      #scene-joins .eq { flex: none; width: 150px; text-align: center; } #scene-joins .eq b { display: block; font-size: 84px; line-height: 70px; font-weight: 400; color: var(--paper); } #scene-joins .eq .lbl { color: var(--paper); }
      #scene-joins .place .tail { color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">The joins</div><div class="hl">Two parts are where real systems go wrong.</div></div>
    <div class="who">${Kit.who("designer", "the designer")}</div>
    <div class="half hw hidden0" style="top:282px;height:330px"><div class="top"><div class="plbl">${esc(waits.name)}</div><span class="tg hidden0">${of(waits)}</span></div>
      <div class="line hidden0">${Loc.rich(P.bare(waits.lines[0]))}</div>
      <div class="draw"><div class="bx thing hidden0"><div class="lbl">a thing</div><div class="big">${esc(w[1])}</div><div class="st hidden0"><span class="lbl">in a state</span><span class="chip">${esc(w[2])}</span></div></div>
        <div class="arrow hidden0"><span class="lbl">${esc(w[3])}</span><i></i></div>
        <div class="bx what hidden0"><div class="lbl">what it is waiting for</div><div class="mid">${esc(w[4])}</div></div></div></div>
    <div class="half ha hidden0" style="top:632px;height:340px"><div class="top"><div class="plbl">${esc(agree.name)}</div><span class="tg hidden0">${of(agree)}</span></div>
      <div class="line hidden0">${Loc.rich(P.bare(agree.lines[0]))}</div>
      <div class="draw"><div class="bx place blank p1 hidden0"><div class="lbl">one place</div><div class="mid hidden0">${esc(a[1])}</div></div>
        <div class="eq hidden0"><b>=</b><span class="lbl">must agree</span></div>
        <div class="bx place blank p2 hidden0"><div class="lbl">another</div><div class="mid hidden0">${esc(short[1])}<span class="tail">${esc(short[2])}</span></div></div></div></div>
    ${Loc.sheet(D, ["The idea, said back", "Things", "Who may do what", "What must stay true"])}`;
  },
  build(s) {
    const c = s.cue, WAITS = "What waits", AGREE = "Where two places must agree", paper = "#e9f0fa", solid = { borderStyle: "solid", borderColor: paper, duration: 0.3 };
    const pulse = (sel, t) => { s.to(sel, { backgroundColor: "rgba(98,198,255,.22)", duration: 0.2 }, t); s.to(sel, { backgroundColor: "#0b1727", duration: 0.5 }, t + 0.45); };
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(".pg", s.start + 0.3, { y: 0 });
    // j1: two parts of the page, still to be written.
    s.in(".hw, .ha", c("j1", "Two"), { y: 12, stagger: 0.25 }); Loc.now(s, [WAITS, AGREE], c("j1", "Two"));
    // j2: what waits: a thing, in a state, and what it is waiting for.
    const t2 = c("j2", "waits");
    Loc.fill(s, WAITS, t2); Loc.now(s, WAITS, c("j2")); s.to(".hw", solid, c("j2")); s.to(".hw .plbl", { color: "#62c6ff", duration: 0.3 }, c("j2"));
    s.in(".hw .line, .hw .tg", t2, { y: 8 }); Loc.lightMini(s, WAITS, /^- A wallet in opening waits/, c("j2", "page"));
    s.in(".thing", c("j2", "thing"), { y: 10 }); s.in(".thing .st", c("j2", "state"), { x: -10, y: 0 }); s.in(".arrow", c("j2", "says"), { x: -14, y: 0 }); s.in(".what", c("j2", "waiting"), { x: -14, y: 0 });
    pulse(".thing", c("j2", "wallet")); s.to(".thing .chip", { color: "#62c6ff", borderColor: "#62c6ff", duration: 0.25 }, c("j2", "opening"));
    s.to(".arrow .lbl", { color: "#62c6ff", duration: 0.25 }, c("j2", "waits", 2)); pulse(".what", c("j2", "money provider"));
    // j3: two records of one fact, and they must agree.
    const t3 = c("j3", "second");
    Loc.fill(s, AGREE, t3); Loc.now(s, AGREE, t3); s.to(".ha", solid, t3); s.to(".ha .plbl", { color: "#62c6ff", duration: 0.3 }, t3); s.to(".hw", { opacity: 0.55, duration: 0.4 }, t3);
    s.in(".ha .line, .ha .tg", t3 + 0.1, { y: 8 }); Loc.lightMini(s, AGREE, /^- The app's balance and the money/, c("j3", "two records"));
    s.in(".p1, .p2", c("j3", "two records"), { y: 10, stagger: 0.25 }); s.in(".eq", c("j3", "agree"), { y: 0, scale: 0.6, dur: 0.4 });
    s.in(".p1 .mid", c("j3", "apps"), { y: 6 }); s.to(".p1", solid, c("j3", "apps"));
    s.in(".p2 .mid", c("j3", "money"), { y: 6 }); s.to(".p2", solid, c("j3", "money"));
  },
});
