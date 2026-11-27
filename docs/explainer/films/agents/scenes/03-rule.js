// Sheet 3. The collision rule, quoted from design/goals/map.md, one case lit at a time, and each case played on the lanes:
// a piece waits, two lanes reach for one path and the named goal settles it, a free piece is claimed.
Film.scene("rule", {
  step: "rule",
  html: (D) => {
    const map = D.repo["design/goals/map.md"], from = Kit.line(map, /^An app goal owns every gap/), to = Kit.line(map, /in this goal's own slice\.$/);
    const cases = map.split("\n").slice(from - 1, to).filter((l) => /^\d\. \*\*/.test(l));
    if (cases.length !== 3) throw new Error("rule: the narration says three cases; the map has " + cases.length);
    const judge = (/Settle it through Goal (\d+)/.exec(map) ?? [])[1]; if (!judge) throw new Error("rule: the map names no goal that settles a collision");
    Agt.at(D, judge); Agt.at(D, 16);
    const X = [820, 1200, 1560];
    return `${Kit.css}${Agt.css("rule")}<style>
      #scene-rule .q { left: 96px; top: 612px; width: 1728px; display: flex; align-items: center; gap: 22px; }
      #scene-rule .q .chip { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-weight: 600; font-size: 24px; padding: 8px 18px; color: var(--muted); }
      #scene-rule .q .chip.on { color: var(--paper); border-color: var(--paper); }
      #scene-rule .q .ask { font-size: 36px; font-weight: 500; margin-right: 18px; }
      #scene-rule .judge { position: absolute; margin-top: -20px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); padding: 4px 12px; border: 1.5px solid var(--paper); background: #0b1727; white-space: nowrap; }
      #scene-rule .wire { stroke-dasharray: 6 6; }
      #scene-rule .tagx { position: absolute; margin-top: -14px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--text2); white-space: nowrap; }
    </style>
    <div class="head"><div class="eyebrow">Rule</div><div class="hl">One rule, three cases.</div></div>
    <div class="who">${Kit.who("agent", "16 · " + Agt.goals(D)[Agt.at(D, 16)].name)}</div>
    ${Agt.ed(D, { id: "ru-ed", path: "design/goals/map.md", x: 96, y: 262, w: 1728, from, to, size: "small", cls: "hidden0" })}
    <div class="abs q hidden0"><span class="ask">Whose are they?</span>${cases.map((_, k) => `<span class="chip cs${k + 1} hidden0">case ${k + 1}</span>`).join("")}<span class="chip dec hidden0" style="margin-left:auto">only case 2 needs a decision</span></div>
    ${Agt.lanes(D)}
    <svg class="ink"><path class="cy wire w1 hidden0" d="M ${X[0] + 100} ${Agt.mid(Agt.at(D, judge)) + 20} V ${Agt.mid(Agt.at(D, 16)) - 20}"/><path class="cy wire w2 hidden0" d="M ${X[1] + 100} ${Agt.mid(Agt.at(D, 16)) - 20} V ${Agt.mid(Agt.at(D, judge)) + 20}"/></svg>
    ${X.map((x, k) => `<div class="apiece piece gap g${k + 1} hidden0" style="left:${x}px;top:${Agt.mid(Agt.at(D, 16))}px">a gap</div>`).join("")}
    <div class="apiece piece p1 hidden0" style="left:${X[0]}px;top:${Agt.mid(Agt.at(D, judge))}px">already claimed</div>
    <div class="apiece piece land1 hidden0" style="left:${X[0] + 250}px;top:${Agt.mid(Agt.at(D, judge))}px">the part that landed</div>
    <div class="tagx wait hidden0" style="left:${X[0] + 150}px;top:${Agt.mid(Agt.at(D, 16))}px">wait</div>
    <div class="apiece piece p2 hidden0" style="left:${X[1]}px;top:${Agt.mid(Agt.at(D, judge))}px">a claimed path</div>
    <div class="apiece piece h1 hidden0" style="left:${X[1]}px;top:${Agt.mid(Agt.at(D, 16))}px">one half</div>
    <div class="apiece piece h2 hidden0" style="left:${X[1]}px;top:${Agt.mid(Agt.at(D, judge))}px">the other half</div>
    <div class="apiece piece mine hidden0" style="left:${X[2]}px;top:${Agt.mid(Agt.at(D, 16))}px">claimed</div>
    <div class="judge hidden0" style="left:800px;top:${Agt.mid(Agt.at(D, judge))}px">Goal ${judge} settles it</div>
    <div class="tagx built hidden0" style="left:${X[2] + 140}px;top:${Agt.mid(Agt.at(D, 16))}px">build it</div>`;
  },
  build(s) {
    const c = s.cue, D = s.D, map = D.repo["design/goals/map.md"], body = s.$("#ru-ed .code");
    const judge = (/Settle it through Goal (\d+)/.exec(map))[1], L16 = s.$(".lane-16"), LJ = s.$(".lane-" + judge);
    const n1 = Kit.line(map, /^1\. \*\*/), n2 = Kit.line(map, /^2\. \*\*/), n3 = Kit.line(map, /^3\. \*\*/), end = Kit.line(map, /in this goal's own slice\.$/);
    const jl = s.$(".judge");
    const others = s.$$(".lane").filter((l) => l !== L16 && l !== LJ);

    s.in(".head", s.start + 0.3); s.in(".who", s.start + 0.4, { y: 0 }); s.in(".lane", s.start + 0.5, { x: -12, y: 0, stagger: 0.08 });
    // r1: gaps keep turning up in the app's lane; one rule.
    s.in(".gap", c("r1", "gaps"), { y: 8, stagger: 0.18 });
    s.in(".q", c("r1", "Whose"), { y: 10 });
    s.in("#ru-ed", c("r1", "One rule"), { y: 12 });
    s.in(".q .chip:not(.dec)", c("r1", "three"), { y: 8, stagger: 0.12 });
    // r2: case one: already claimed: wait, or take the part that landed.
    s.focus(body, [n1, n2 - 1], c("r2", "Case")); s.to(".cs1", { color: "#e9f0fa", borderColor: "#e9f0fa", duration: 0.3 }, c("r2", "Case"));
    s.in(".p1", c("r2", "running"), { x: -10, y: 0 }); s.in(".w1", c("r2", "has it"), { y: -10, dur: 0.4 });
    s.in(".wait", c("r2", "Wait"), { x: 10, y: 0 });
    s.in(".land1", c("r2", "landed") - 0.3, { x: -10, y: 0 }); s.to(".land1", { y: Agt.mid(Agt.at(D, 16)) - Agt.mid(Agt.at(D, judge)), duration: 0.6, ease: "power2.inOut" }, c("r2", "landed") + 0.2);
    // r3: case two: two lanes reach for one path; the named goal settles it.
    const t3 = c("r3");
    s.out(".p1, .w1, .wait, .land1", t3 - 0.3, { dur: 0.3 }); s.out(".g1", t3 - 0.3, { dur: 0.3 });
    s.to(".cs1", { color: "#7389a6", borderColor: "rgba(132,170,222,.36)", duration: 0.3 }, t3); s.to(".cs2", { color: "#e9f0fa", borderColor: "#e9f0fa", duration: 0.3 }, t3);
    s.focus(body, [n2, n3 - 1], c("r3", "Case"));
    s.in(".p2", c("r3", "paths"), { x: -10, y: 0 }); s.in(".w2", c("r3", "claimed"), { y: 10, dur: 0.4 });
    s.to(others, { opacity: 0.4, duration: 0.3 }, c("r3", "named")); s.in(jl, c("r3", "named"), { x: -8, y: 0 });
    s.to(".g2", { y: Agt.mid(Agt.at(D, judge)) - Agt.mid(Agt.at(D, 16)), autoAlpha: 0, duration: 0.5, ease: "power2.inOut" }, c("r3", "does"));
    s.out(".w2", c("r3", "does"), { dur: 0.3 });
    s.out(".p2", c("r3", "split"), { dur: 0.25 }); s.in(".h1, .h2", c("r3", "split"), { y: 0, scale: 0.8, stagger: 0.1 });
    // r4: case three: neither; claim it, build it.
    const t4 = c("r4");
    s.out(".h1, .h2, .judge", t4 - 0.3, { dur: 0.3 }); s.to(others, { opacity: 1, duration: 0.3 }, t4);
    s.to(".cs2", { color: "#7389a6", borderColor: "rgba(132,170,222,.36)", duration: 0.3 }, t4); s.to(".cs3", { color: "#e9f0fa", borderColor: "#e9f0fa", duration: 0.3 }, t4);
    s.focus(body, [n3, end], c("r4", "Case"));
    s.out(".g3", c("r4", "claim") - 0.3, { dur: 0.2 }); s.in(".mine", c("r4", "claim"), { scale: 1.2, y: 0 });
    s.in(".built", c("r4", "build"), { x: 10, y: 0 }); s.to(".mine", { backgroundColor: "rgba(98,198,255,.22)", duration: 0.4 }, c("r4", "build"));
    // r5: only the second case needs a decision.
    s.focus(body, [n2, n3 - 1], c("r5", "second"));
    s.to(".cs3", { color: "#7389a6", borderColor: "rgba(132,170,222,.36)", duration: 0.3 }, c("r5", "second")); s.to(".cs2", { color: "#e9f0fa", borderColor: "#e9f0fa", duration: 0.3 }, c("r5", "second"));
    s.in(".dec", c("r5", "decision"), { x: 10, y: 0 });
  },
});
