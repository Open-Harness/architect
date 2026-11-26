// Sheet 1. One agent at a time becomes several; two in one file undo each other. Then the map is asked which goals run,
// and its three lines become the three lanes that carry the film.
Film.scene("owners", {
  step: "owners",
  html: (D) => {
    const goals = Agt.goals(D);
    if (goals.length !== 3) throw new Error("owners: the narration says three goals run; the recording has " + goals.length);
    if (!goals.some((g) => /^app/.test(g.kind)) || !goals.some((g) => /^framework/.test(g.kind)) || !goals.some((g) => /^landing/.test(g.kind))) throw new Error("owners: the narration names a framework goal, an app goal and a landing goal");
    const land = goals.find((g) => /^landing/.test(g.kind));
    return `${Kit.css}${Agt.css("owners")}<style>
      #scene-owners .st { left: 96px; top: 300px; width: 1300px; }
      #scene-owners .solo { position: absolute; left: 96px; top: 748px; width: 1728px; height: 218px; border: 1px solid var(--rule2); background: rgba(98,198,255,.035); }
      #scene-owners .solo .lbl { position: absolute; left: 20px; top: 14px; }
      #scene-owners .ag { position: absolute; top: 120px; }
      #scene-owners .file { position: absolute; left: 760px; top: 60px; width: 420px; height: 130px; border: 1.5px solid var(--paper); background: #0b1727; padding: 12px 18px; }
      #scene-owners .file .ed { position: absolute; left: 18px; right: 18px; top: 58px; height: 44px; display: flex; align-items: center; padding: 0 14px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; border: 1.5px solid var(--cyan); color: var(--cyan); background: #0d1d33; }
      #scene-owners .nobody { position: absolute; left: 1420px; top: 96px; font-size: 30px; color: var(--text2); }
      #scene-owners .move { position: absolute; left: 96px; top: 800px; display: flex; align-items: center; gap: 30px; }
      #scene-owners .move .chip { font-family: var(--sans); font-size: 32px; padding: 14px 28px; }
      #scene-owners .move .from { position: relative; color: var(--text2); } #scene-owners .move .from i { position: absolute; left: 10px; right: 10px; top: 52%; height: 2px; background: var(--paper); transform-origin: 0 50%; }
      #scene-owners .move .to { border-color: var(--paper); } #scene-owners .move .arw { font-size: 44px; color: var(--muted); }
      #scene-owners .tree { position: absolute; left: 96px; top: 748px; width: 1728px; height: 218px; }
      #scene-owners .tree .top { position: absolute; left: 0; top: 10px; } #scene-owners .tree .sub { position: absolute; top: 150px; }
      #scene-owners .tree .note { position: absolute; left: 420px; top: 14px; font-size: 28px; color: var(--text2); }
      #scene-owners #ow-term { z-index: 1; } #scene-owners .count { left: 1440px; top: 300px; width: 384px; }
      #scene-owners .count .num { font-family: var(--mono); font-size: 120px; line-height: 1; color: var(--paper); }
      #scene-owners .count .lbl { font-size: 24px; margin-top: 10px; }
      #scene-owners .lane-${land.n} .dest { color: var(--paper); } #scene-owners .what { font-size: 26px; color: var(--paper); }
    </style>
    <div class="head"><div class="eyebrow">Owners</div><div class="hl">One owner for each line of work.</div></div>
    <div class="who">${Kit.who("you")}</div>
    <div class="abs st st1 hidden0"><div class="say">One agent at a time.</div><div class="say mu st1b hidden0" style="margin-top:20px">Now: several, building at once.</div></div>
    <div class="abs st st2 hidden0"><div class="say">Two agents in the same files undo each other's work.</div></div>
    <div class="abs st st3 hidden0"><div class="say">Orthograph has no command for this yet.</div><div class="say mu st3b hidden0" style="margin-top:20px">So: how this repository builds Orthograph itself.</div></div>
    <div class="abs st st4 hidden0"><div class="say">Every line of work has one owner: a goal.</div><div class="say mu" style="margin-top:20px">One long-running agent that manages others.</div></div>
    <div class="solo hidden0"><div class="lbl">plugged in</div>
      ${["a1", "a2", "a3", "a4"].map((id, k) => `<div class="ag ${id}${k ? " more" : ""}" style="left:${60 + k * 300}px">${Kit.who("agent", "an agent")}</div>`).join("")}
      <div class="file hidden0"><div class="lbl">one file</div><div class="ed e1">one agent's edit</div><div class="ed e2 hidden0">the other's edit</div></div>
      <div class="nobody hidden0">and neither notices</div></div>
    <div class="move hidden0"><span class="chip from">plugged in<i></i></span><span class="arw">→</span><span class="chip to">this repository, building Orthograph</span></div>
    <div class="tree hidden0"><div class="top">${Kit.who("agent", "a goal")}</div><div class="note">one long-running agent</div>
      <svg class="ink" style="width:1728px;height:218px"><path class="mu tl" d="M 120 56 V 110 H 900"/><path class="mu tl" d="M 120 110 V 150"/><path class="mu tl" d="M 510 110 V 150"/><path class="mu tl" d="M 900 110 V 150"/></svg>
      ${[0, 1, 2].map((k) => `<div class="sub" style="left:${k * 390}px">${Kit.who("agent", "an agent it manages")}</div>`).join("")}</div>
    ${Kit.term(D, { id: "ow-term", cap: "agents-goals", x: 96, y: 262, w: 1300, h: 214, title: "the repository's root", cls: "hidden0", tag: '<span class="tag">design/goals/map.md</span>' })}
    <div class="abs count hidden0"><div class="num">${goals.length}</div><div class="lbl">goals run</div></div>
    ${Agt.lanes(D, { cls: "hidden0", fill: (g) => `<span class="what hidden0">${/^framework/.test(g.kind) ? "builds the framework" : /^app/.test(g.kind) ? "builds an app on it" : "builds nothing new"}</span>`, dest: (g) => (g.n === land.n ? '<div class="dest hidden0">→ into the shared branch</div>' : "") })}
    ${Kit.stand("missing", "an Orthograph command for many agents at once", "left:96px;top:992px;visibility:hidden;opacity:0")}`;
  },
  build(s) {
    const c = s.cue, goals = Agt.goals(s.D), T = s.$("#ow-term"), rows = s.$$("#ow-term .o");
    const lane = (re) => { const g = goals.find((x) => re.test(x.kind)); return { g, el: s.$(".lane-" + g.n), row: Agt.orow(T, new RegExp("^ *" + g.n + " · ")) }; };
    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 });
    // a1: one agent, then several.
    s.in(".st1", c("a1", "Until"), { y: 12 }); s.in(".solo", c("a1", "one agent"), { y: 14 }); s.to(".solo .more", { autoAlpha: 0, duration: 0.01 }, s.start);
    s.in(".st1b", c("a1", "several"), { y: 10 }); s.in(".solo .more", c("a1", "several"), { y: 10, stagger: 0.15 });
    // a2: two of them in one file.
    s.out(".st1", c("a2") - 0.3, { dur: 0.3 }); s.in(".st2", c("a2"), { y: 12 });
    s.out(".solo .a3, .solo .a4", c("a2") - 0.2, { dur: 0.3 });
    s.in(".file", c("a2", "same files"), { y: 10 });
    s.to(".solo .a1", { x: 480, y: -17, duration: 0.6, ease: "power2.inOut" }, c("a2", "same files"));
    s.to(".solo .a2", { x: 860, y: -17, duration: 0.6, ease: "power2.inOut" }, c("a2", "same files"));
    s.to(".file .e1", { autoAlpha: 0, x: -20, duration: 0.3 }, c("a2", "undo")); s.in(".file .e2", c("a2", "undo") + 0.15, { x: 20, y: 0, dur: 0.35 });
    s.in(".nobody", c("a2", "neither"), { x: 12, y: 0 });
    // a3: no command for it; this film leaves Plugged In.
    s.out(".st2, .solo", c("a3") - 0.3, { dur: 0.3 }); s.in(".st3", c("a3"), { y: 12 });
    s.in(".kstand", c("a3", "no command"), { y: 0 });
    s.in(".move", c("a3", "leaves"), { y: 12 }); s.fromTo(".move .from i", { scaleX: 0 }, { scaleX: 1, duration: 0.35 }, c("a3", "leaves") + 0.4);
    s.in(".st3b", c("a3", "shows"), { y: 10 });
    // a4: a goal, then the map is asked.
    s.out(".st3, .move, .kstand", c("a4") - 0.3, { dur: 0.3 }); s.in(".st4", c("a4"), { y: 12 });
    s.in(".tree .top, .tree .note", c("a4", "goal"), { y: 8 }); s.to(".tree", { autoAlpha: 1, duration: 0.01 }, c("a4", "goal") - 0.05);
    s.draw(".tree .tl", c("a4", "manages"), 0.5); s.in(".tree .sub", c("a4", "manages") + 0.2, { y: 8, stagger: 0.12 });
    s.out(".st4", c("a4", "We") - 0.3, { dur: 0.3 });
    s.in(T, c("a4", "We"), { y: 14 }); Agt.type(s, T, c("a4", "ask"), 0.9); Agt.print(s, rows, c("a4", "run") + 0.1, 0.15);
    // a5: three goals become three lanes.
    s.out(".tree", c("a5") - 0.25, { dur: 0.25 });
    s.in(".count", c("a5", "Three"), { x: 14, y: 0 }); s.in(".lane", c("a5", "Three"), { x: -16, y: 0, stagger: 0.1 }); s.to(".lane", { opacity: 0.5, duration: 0.3 }, c("a5", "Three") + 0.6);
    const seen = [];
    [[/^framework/, c("a5", "one", 1)], [/^app/, c("a5", "One", 2)], [/^landing/, c("a5", "One", 3)]].forEach(([re, t]) => {
      const L = lane(re); seen.push(L.row); Agt.lit(s, T, [...seen], t); s.to(L.el, { opacity: 1, duration: 0.3 }, t); s.in(L.el.querySelector(".what"), t + 0.1, { x: -10, y: 0 });
    });
    s.in(".lane .dest", c("a5", "shared"), { x: -12, y: 0 });
  },
});
