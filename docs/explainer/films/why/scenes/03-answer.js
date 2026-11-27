// Sheet 3. The answer: the five pieces fold into the two lower layers of a stack, and a small layer appears on top, the part you read.
// The editor quotes one real file of Plugged In's blueprint, whole; the stories are the journeys of the recorded full proof.
Film.scene("answer", {
  step: "answer",
  html: (D) => {
    const file = "blueprint/things/handle/invariants.ts", text = D.src[file]; if (text === undefined) throw new Error("answer: no file " + file);
    const lines = text.replace(/\n$/, "").split("\n").length, stories = D.facts.full.journeys, steps = stories.reduce((n, j) => n + j.steps, 0);
    if (!stories.length || stories.some((j) => !j.ok || j.green !== j.steps)) throw new Error("answer: the recorded full proof is not green on every journey");
    return `${Kit.css}${Loc.css("answer")}<style>
      #scene-answer .piece { opacity: .9; }
      #scene-answer .work { left: 740px; top: 280px; width: 1084px; } #scene-answer .work .lbl { font-size: 22px; } #scene-answer .work .three { display: flex; gap: 22px; margin-top: 6px; font-size: 34px; line-height: 1.2; font-weight: 500; white-space: nowrap; }
      #scene-answer .work .three span { padding: 6px 18px 8px; border: 1.5px solid var(--paper); background: rgba(14,28,48,.9); }
      #scene-answer #an-ed .tag { color: var(--paper); } #scene-answer #an-ed { height: 588px; overflow: hidden; } #scene-answer #an-ed .code.small { line-height: 28px; }
      #scene-answer .count { left: 1520px; top: 676px; padding: 14px 24px 16px; border: 1.5px solid var(--paper); background: #0b1727; box-shadow: 0 20px 50px -18px rgba(0,0,0,.9); }
      #scene-answer .count b { display: block; font-size: 52px; line-height: 1.05; font-weight: 500; letter-spacing: -.02em; } #scene-answer .count .lbl { font-size: 22px; color: var(--text2); }
      #scene-answer .fence { position: absolute; border: 2.5px solid var(--paper); pointer-events: none; }
      #scene-answer .fencelab { position: absolute; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; color: var(--paper); background: #0b1727; padding: 2px 12px; white-space: nowrap; }
      #scene-answer .proof { left: 740px; top: 290px; width: 1084px; } #scene-answer .proof .say { font-size: 56px; }
      #scene-answer .mark { display: inline-block; margin: 34px 0 0 6px; font: 600 68px var(--mono); color: var(--green); border: 4px solid var(--green); padding: 4px 30px 8px; transform: rotate(-4deg); background: rgba(8,17,31,.92); }
      #scene-answer .against { margin-top: 44px; font-size: 24px; } #scene-answer .against b { color: var(--paper); font-weight: 600; }
      #scene-answer .stories { display: grid; grid-template-columns: 1fr 1fr; grid-auto-flow: column; grid-template-rows: repeat(${Math.ceil(stories.length / 2)}, 62px); column-gap: 30px; margin-top: 10px; }
      #scene-answer .story { font-size: 32px; line-height: 62px; white-space: nowrap; border-bottom: 1px solid var(--rule); } #scene-answer .story i { display: inline-block; width: 42px; font-style: normal; color: var(--green); }
      #scene-answer .before { margin-top: 30px; font-size: 42px; font-weight: 500; letter-spacing: -.01em; }
    </style>
    <div class="head"><div class="eyebrow">What Orthograph does about it</div><div class="hl hidden0">Orthograph moves the part you read.</div></div>
    <div class="who">${Kit.who("you")}</div>
    ${Loc.cards()}
    ${Loc.stack({ id: "an-stack", x: 96, y: 280, w: 600, h: [84, 250, 330], gap: 14 })}
    <div class="fence hidden0" style="left:88px;top:370px;width:616px;height:266px"></div><div class="fencelab hidden0" style="left:112px;top:621px">a frame the blueprint sets</div>
    <div class="abs work"><div class="lbl sys hidden0">you work on the system itself</div><div class="three"><span class="w1 hidden0">the things</span><span class="w2 hidden0">who may do what</span><span class="w3 hidden0">what must always be true</span></div></div>
    ${Kit.ed(D, { id: "an-ed", file, x: 740, y: 384, w: 1084, from: 1, size: "small", cls: "hidden0", tag: '<span class="tag">the blueprint</span>' })}
    <div class="abs count hidden0"><b>${lines} lines</b><span class="lbl">the whole file</span></div>
    <div class="abs proof"><div class="say word hidden0">Nobody takes anyone's word.</div>
      <div class="mark hidden0">proved ✔</div>
      <div class="lbl against hidden0">against stories you agreed to · <b>${stories.length} stories, ${steps} steps</b></div>
      <div class="stories">${stories.map((j) => `<div class="story hidden0"><i>✔</i>${Film.esc(j.name)}</div>`).join("")}</div>
      <div class="before hidden0">agreed before it was built</div></div>`;
  },
  build(s) {
    const c = s.cue, top = s.$("#an-stack .top"), mid = s.$("#an-stack .mid"), low = s.$("#an-stack .low");
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    s.tl.set([top, mid, low], { autoAlpha: 0 }, s.start);
    // o1: the five pieces fold into the two lower layers, and the small one lands on top.
    const t1 = c("o1");
    s.in(".hl", t1, { y: 12 });
    s.$$(".piece").forEach((el, k) => s.tl.to(el, { left: 96, top: 378 + k * 119, width: 600, height: 110, duration: 0.7, ease: "power2.inOut" }, t1 + 0.1 + k * 0.03));
    s.tl.to([mid, low], { autoAlpha: 0.6, duration: 0.4 }, t1 + 0.75); s.out(".piece", t1 + 0.8, { dur: 0.35 });
    const tTop = c("o1", "part");
    s.tl.fromTo(top, { autoAlpha: 0, scale: 1.12 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, tTop); Loc.light(s, top, tTop + 0.1);
    // o2: what you work on, beside the small layer.
    s.in(".sys", c("o2", "system"), { y: 0 }); s.in(".w1", c("o2", "things"), { y: 10, dur: 0.4 }); s.in(".w2", c("o2", "who"), { y: 10, dur: 0.4 }); s.in(".w3", c("o2", "what must"), { y: 10, dur: 0.4 });
    // o3: one file of the blueprint, whole.
    s.in("#an-ed", c("o3") + 0.05, { y: 16 }); s.to(".w1, .w2", { opacity: 0.45, duration: 0.4 }, c("o3", "blueprint"));
    s.fromTo(".count", { autoAlpha: 0, scale: 1.3 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, c("o3", "small"));
    // o4: everything below it.
    s.to("#an-ed", { opacity: 0.4, duration: 0.5 }, c("o4", "below")); s.out(".count", c("o4", "below"), { dur: 0.3 }); s.to(".w1, .w2", { opacity: 1, duration: 0.4 }, c("o4", "below"));
    Loc.light(s, low, c("o4", "made")); Loc.light(s, mid, c("o4", "written")); s.to(low, { opacity: 0.75, duration: 0.4 }, c("o4", "written"));
    s.fromTo(".fence", { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.4 }, c("o4", "frame")); s.in(".fencelab", c("o4", "blueprint"), { y: 0, dur: 0.35 });
    // o5: nobody's word; the running system is proved against the stories.
    const t5 = c("o5");
    s.out("#an-ed, .work", t5 - 0.35, { dur: 0.3 }); s.in(".word", c("o5", "nobody"), { y: 14 });
    Loc.light(s, low, c("o5", "running")); Loc.light(s, mid, c("o5", "running"));
    s.fromTo(".mark", { autoAlpha: 0, scale: 1.7, rotate: -4 }, { autoAlpha: 1, scale: 1, rotate: -4, duration: 0.35, ease: "back.out(2)" }, c("o5", "proved"));
    s.in(".against", c("o5", "against"), { y: 0 }); s.in(".story", c("o5", "stories"), { y: 8, dur: 0.3, stagger: 0.07 });
    s.in(".before", c("o5", "before"), { y: 10 });
  },
});
