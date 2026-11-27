// Sheet 4. Red checks sit in the shared branch before their code; a list of known failures keeps it a gate. The one list
// about Plugged In, quoted whole; a line leaves it, an added line is refused by tools/ci/builder-paths.sh; then the ten
// lists, counted by the recording, drawn as bars.
Film.scene("ratchet", {
  step: "ratchet",
  html: (D) => {
    const file = "e2e/stage1/expected-failing/01-plugged-in-journeys.txt", list = D.repo[file].replace(/\n$/, "").split("\n");
    if (list.length !== 2 || !list[0].startsWith("#")) throw new Error("ratchet: the narration says the list is two lines, a reason and a check; it has " + list.length);
    const lists = D.cap["agents-ratchets"].out.split("\n").map((l) => { const m = /^(\d+) (\S+)$/.exec(l); if (!m) throw new Error("agents-ratchets: a line is not `count path`"); return { n: +m[1], path: m[2] }; });
    const least = Math.min(...lists.map((x) => x.n)), smallest = lists.filter((x) => x.n === least);
    if (lists.length !== 10) throw new Error("ratchet: the narration says ten lists; the recording has " + lists.length);
    if (least !== 1 || smallest.length !== 1 || !file.startsWith(smallest[0].path + "/")) throw new Error("ratchet: the narration says the smallest list holds one file, the one quoted");
    const most = Math.max(...lists.map((x) => x.n)), sh = D.repo["tools/ci/builder-paths.sh"];
    const g0 = Kit.line(sh, /A file that is not at the merge base is an added file: a hit/), g1 = Kit.line(sh, /\[ "\$added" = "0" \] && continue/);
    return `${Kit.css}${Agt.css("ratchet")}<style>
      #scene-ratchet .st { left: 96px; top: 300px; width: 1500px; }
      #scene-ratchet .branch { position: absolute; left: 96px; top: 760px; width: 1728px; height: 200px; }
      #scene-ratchet .branch .rail { position: absolute; left: 0; right: 0; top: 140px; height: 2px; background: var(--paper); }
      #scene-ratchet .branch .rail + .lbl { position: absolute; left: 0; top: 156px; }
      #scene-ratchet .branch .ck { position: absolute; top: 90px; font-family: var(--mono); font-size: 22px; padding: 6px 14px; border: 1.5px solid var(--rule2); background: #0b1727; white-space: nowrap; color: var(--paper); }
      #scene-ratchet .branch .ck b { font-weight: 400; margin-right: 10px; }
      #scene-ratchet .branch .later { border-style: dashed; color: var(--text2); }
      #scene-ratchet .branch .by { position: absolute; top: 20px; }
      #scene-ratchet .listcard { position: absolute; left: 1250px; top: 560px; width: 574px; height: 180px; border: 1.5px solid var(--paper); background: #0b1727; padding: 14px 20px; }
      #scene-ratchet .listcard .lbl { margin-bottom: 10px; } #scene-ratchet .listcard .it { font-family: var(--mono); font-size: 22px; color: var(--paper); }
      #scene-ratchet .verdict { position: absolute; font-family: var(--mono); font-size: 24px; padding: 6px 16px; border: 1.5px solid var(--red); color: var(--red); background: #0b1727; white-space: nowrap; }
      #scene-ratchet #ra-list .code .ln { transition: none; }
      #scene-ratchet .ghost { position: absolute; left: 96px; top: 452px; width: 1728px; height: 46px; border: 2px dashed var(--text2); display: flex; align-items: center; padding: 0 22px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; color: var(--text2); }
      #scene-ratchet .ghost .no { margin-left: auto; color: var(--paper); border: 1.5px solid var(--paper); padding: 2px 12px; }
      #scene-ratchet .strike { position: absolute; height: 2px; background: var(--paper); transform-origin: 0 50%; }
      #scene-ratchet #ra-term .screen { line-height: 31px; }
      #scene-ratchet #ra-term .o { position: relative; }
      #scene-ratchet .fill { position: absolute; left: 760px; top: 7px; height: 19px; background: rgba(98,198,255,.22); border: 1.5px solid var(--cyan); transform-origin: 0 50%; }
      #scene-ratchet .fill.least { border-color: var(--paper); background: rgba(233,240,250,.25); }
      #scene-ratchet .sum { left: 96px; top: 770px; width: 1728px; } #scene-ratchet .sum .big { font-size: 48px; font-weight: 500; line-height: 1.25; }
      #scene-ratchet .sum .down { font-size: 36px; color: var(--text2); margin-top: 18px; }
    </style>
    <div class="head"><div class="eyebrow">Ratchet</div><div class="hl">A list that may only shrink.</div></div>
    <div class="who"><span class="w1">${Kit.who("author", "the author")}</span><span class="arw w2 hidden0">→</span><span class="w2 hidden0">${Kit.who("builder", "the builder")}</span></div>
    <div class="abs st st1 hidden0"><div class="say">Checks are written before the build, by a different agent.</div></div>
    <div class="abs st st2 hidden0"><div class="say">Each failure we know about is written in a list.</div><div class="say mu st2b hidden0" style="margin-top:20px">Any failure not listed fails the build.</div></div>
    <div class="branch hidden0"><div class="rail"></div><div class="lbl">the shared branch</div>
      <div class="by b1" style="left:60px">${Kit.who("author", "the author")}</div><div class="by b2 hidden0" style="left:820px">${Kit.who("builder", "the builder")}</div>
      <div class="ck c1 hidden0" style="left:60px"><b class="rd">✘</b>a check, written first</div>
      <div class="ck later c2 hidden0" style="left:820px">the code that passes it, later</div>
      <div class="ck c3 hidden0" style="left:440px"><b class="rd">✘</b>a failure nobody listed</div></div>
    <div class="listcard hidden0"><div class="lbl">the list of known failures</div><div class="it i1 hidden0">✘ a check, written first</div></div>
    <div class="verdict v1 hidden0" style="left:440px;top:790px">build ✘</div>
    ${Agt.ed(D, { id: "ra-list", path: file, x: 96, y: 262, w: 1728, from: 1, to: 2, cls: "hidden0", tag: `<span class="tag">the whole list</span>` })}
    <div class="ghost hidden0">a line added by a builder<span class="no hidden0">refused</span></div>
    ${Agt.ed(D, { id: "ra-ci", path: "tools/ci/builder-paths.sh", x: 96, y: 520, w: 1728, from: g0, to: g1, cls: "hidden0", tag: '<span class="tag">in CI, on every builder pull request</span>' })}
    ${Kit.term(D, { id: "ra-term", cap: "agents-ratchets", x: 96, y: 262, w: 1728, h: 470, title: "the repository's root", cls: "hidden0", tag: '<span class="tag">bars: the count on each line</span>' })}
    <div class="abs sum hidden0"><div class="big">${lists.length} lists today. The smallest holds ${least} file.</div><div class="down hidden0">Over time, the numbers go down.</div></div>`;
  },
  build(s) {
    const c = s.cue, body = s.$("#ra-list .code"), l2 = body.querySelector('.ln[data-n="2"]'), ci = s.$("#ra-ci .code");
    s.in(".head", s.start + 0.3); s.in(".who .w1", s.start + 0.4, { y: 0 });
    // s1: a check written first sits red in the shared branch; its code comes later, from another agent.
    s.in(".st1", c("s1", "Checks"), { y: 12 }); s.in(".branch", c("s1", "Checks"), { y: 12 });
    s.in(".c1", c("s1", "written"), { y: -20 });
    s.in(".b2", c("s1", "different"), { y: 8 }); s.in(".c2", c("s1", "code"), { y: 8 });
    // s2: the known failure goes on a list; one that is not listed fails the build.
    s.out(".st1", c("s2") - 0.3, { dur: 0.3 }); s.in(".st2", c("s2"), { y: 12 });
    s.in(".listcard", c("s2", "list"), { x: 14, y: 0 }); s.in(".i1", c("s2", "list") + 0.3, { x: -20, y: 0 });
    s.in(".st2b", c("s2", "The build"), { y: 10 }); s.in(".c3", c("s2", "any failure"), { y: -20 });
    s.in(".v1", c("s2", "not listed"), { scale: 1.2, y: 0 });
    // s3: the one list about Plugged In, quoted whole.
    s.out(".st2, .c3, .v1", c("s3") - 0.35, { dur: 0.3 });
    s.in("#ra-list", c("s3", "Here"), { y: 12 });
    const ed = s.$("#ra-list"), under = ed.offsetTop + ed.offsetHeight + 14;
    s.focus(body, [1, 1], c("s3", "One line")); const why = Agt.label(s.el, "line 1: why it is there", 96, under);
    s.focus(body, [2, 2], c("s3", "other")); const one = Agt.label(s.el, "line 2: the one check that may fail", 96, under);
    s.in(why, c("s3", "why"), { y: 6, dur: 0.3 }); s.out(why, c("s3", "other") - 0.05, { dur: 0.2 }); s.in(one, c("s3", "other"), { y: 6, dur: 0.3 });
    // s4: the builder may take a line away, and never add one; the CI script says why.
    s.out(one, c("s4") - 0.1, { dur: 0.2 }); s.in(".who .w2", c("s4", "builder"), { x: -10, y: 0, stagger: 0.1 });
    const strike = document.createElement("div"); strike.className = "strike hidden0"; strike.style.left = "70px"; strike.style.right = "30px"; strike.style.top = (s.lineY(body, 2)) + "px"; body.appendChild(strike);
    s.focus(body, [2, 2], c("s4", "delete")); s.fromTo(strike, { autoAlpha: 1, scaleX: 0 }, { autoAlpha: 1, scaleX: 1, duration: 0.4 }, c("s4", "delete"));
    s.to(l2, { opacity: 0.25, duration: 0.4 }, c("s4", "line") + 0.3);
    s.in(".ghost", c("s4", "add"), { y: -10 });
    s.out(".branch, .listcard", c("s4", "script") - 0.3, { dur: 0.3 }); s.in("#ra-ci", c("s4", "script"), { y: 12 }); s.focus(ci, [Kit.line(s.D.repo["tools/ci/builder-paths.sh"], /A file that is not at the merge base/), Kit.line(s.D.repo["tools/ci/builder-paths.sh"], /A file that is not at the merge base/)], c("s4", "CI"));
    s.in(".ghost .no", c("s4", "Refuses"), { scale: 1.3, y: 0 });
    // s5: ten lists, counted, as bars.
    s.out("#ra-list, .ghost, #ra-ci", c("s5") - 0.35, { dur: 0.3 });
    const T = s.$("#ra-term"); s.in(T, c("s5") - 0.05, { y: 12 }); Agt.type(s, T, c("s5"), 0.5); Agt.print(s, s.$$("#ra-term .o"), c("s5", "lists"), 0.05);
    const rows = s.$$("#ra-term .o"), counts = rows.map((o) => +/^(\d+) /.exec(o.textContent)[1]), most = Math.max(...counts), least = Math.min(...counts);
    const fills = rows.map((o, k) => { const f = document.createElement("span"); f.className = "fill" + (counts[k] === least ? " least" : ""); f.style.width = Math.round((counts[k] / most) * 900) + "px"; o.appendChild(f); return f; });
    s.fromTo(fills, { scaleX: 0 }, { scaleX: 1, duration: 0.5, stagger: 0.05 }, c("s5", "lists") + 0.3);
    s.in(".sum", c("s5", "Ten") + 0.2, { y: 10 });
    Agt.lit(s, T, [Agt.orow(T, /^1 e2e\/stage1\//)], c("s5", "smallest")); 
    s.in(".sum .down", c("s5", "Over"), { y: 10 }); 
  },
});
