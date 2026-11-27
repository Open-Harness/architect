// Sheet 2. Your agent asks what the change did: `ortho impact`, replayed a line at a time. As the stale line prints, the
// seven dots turn stale together and the proven count drops to none.
Film.scene("stale", {
  step: "stale",
  html: (D) => {
    const ops = Chg.ops(D), now = Chg.impact(D.cap["change-impact"].out, ["stale", "proven"]);
    const changedOps = now.changed.filter((l) => l.startsWith("changed operation "));
    Chg.need(changedOps.length, 1, "b2 one operation");
    if (!/^changed operation handle\.claim:/.test(changedOps[0]) || !now.changed.some((l) => /^changed thing handle: .*invariants/.test(l))) throw new Error("stale: the impact does not name the handle's rules and handle.claim");
    Chg.need(now.stale.length, 7, "b3 stale: all seven"); Chg.need(now.proven.length, 0, "b3 proven: none");
    if (!ops.every((o) => now.stale.includes(o))) throw new Error("stale: not every operation is stale");
    const counts = { proven: `proven ${Chg.says(ops)}`, stale: `stale ${Chg.says(now.stale)} · proven ${Chg.says(now.proven)}` };
    return `${Kit.css}${Chg.css("stale")}<style>
      #scene-stale #st-term .tag { color: var(--muted); }
      #scene-stale .sum { left: 96px; top: 600px; width: 1728px; display: flex; align-items: baseline; gap: 40px; }
      #scene-stale .sum .one { font-size: 46px; font-weight: 500; } #scene-stale .sum .arw2 { font-size: 46px; color: var(--muted); }
      #scene-stale .sum .all { font-size: 46px; font-weight: 500; } #scene-stale .sum .all b { font-weight: 600; font-size: 64px; font-variant-numeric: tabular-nums; }
      #scene-stale .stdef { left: 96px; top: 700px; width: 1300px; font-size: 28px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Before anything is rebuilt</div><div class="hl">Ask what the change did.</div></div>
    ${Chg.who([["agent", "your agent"]])}
    ${Kit.term(D, { id: "st-term", cap: "change-impact", x: 96, y: 262, w: 1728, h: 290, size: 24, tag: '<span class="tag">against the record</span>' })}
    <div class="abs sum hidden0"><span class="one">One rule on the handle</span><span class="arw2">→</span><span class="all"><b>${now.stale.length} of ${ops.length}</b> operations stale</span></div>
    <div class="abs stdef hidden0">Stale: something its proof rested on has changed.</div>
    ${Chg.band(D, "proven", counts)}`;
  },
  build(s) {
    const c = s.cue, T = s.$("#st-term");
    const thing = Chg.rows(s, "#st-term", /^changed thing /)[0], op = Chg.rows(s, "#st-term", /^changed operation /)[0];
    const stale = Chg.rows(s, "#st-term", /^stale /)[0], proven = Chg.rows(s, "#st-term", /^proven /)[0];
    s.in(".head", s.start + 0.3); s.in(".band", s.start + 0.4, { y: 0 });
    // b1: the command.
    Chg.act(s, 0, c("b1") + 0.2); s.in(T, c("b1", "ask") - 0.2, { y: 14 });
    Chg.type(s, T, c("b1", "ortho"), Math.max(0.5, c("b1", "$") - c("b1", "ortho") - 0.1));
    // b2: it names the change.
    Chg.print(s, [thing], c("b2", "names")); Chg.glow(s, Chg.mark(thing, "handle: invariants"), c("b2", "handles"));
    Chg.print(s, [op], c("b2", "operation")); Chg.glow(s, Chg.mark(op, "handle.claim"), c("b2", "handle", 2));
    const [ring, tip] = Chg.ring(s, "handle.claim", c("b2", "handle", 2), "changed");
    // b3: the cost.
    Chg.print(s, [stale], c("b3", "stale")); Chg.lit(s, "#st-term", [stale], c("b3", "stale"));
    s.out([ring, tip], c("b3", "seven") - 0.1, { dur: 0.25 }); Chg.turn(s, "stale", c("b3", "seven"), 0.04);
    Chg.print(s, [proven], c("b3", "proven")); Chg.lit(s, "#st-term", [stale, proven], c("b3", "proven"));
    s.in(".stdef", c("b3", "proven") + 0.4, { y: 10 });
    // b4: one rule unproved everything.
    s.out(".stdef", c("b4") - 0.2, { dur: 0.25 });
    s.in(".sum .one", c("b4", "one rule"), { y: 10 }); s.in(".sum", c("b4", "one rule"), { y: 0, dur: 0.01 });
    s.in(".sum .arw2, .sum .all", c("b4", "unproved"), { x: -12, y: 0, stagger: 0.1 });
    s.fromTo(".band .dot", { scale: 1 }, { scale: 1.2, duration: 0.25, yoyo: true, repeat: 1, stagger: 0.04 }, c("b4", "everything"));
  },
});
