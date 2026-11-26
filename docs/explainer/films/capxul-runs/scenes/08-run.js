// Sheet 8. Where it runs: three environments as three files, the generated infrastructure, one command that brings it up, and the
// portal, which shows the running system the way it was described.
Film.scene("run", {
  step: "run",
  html: (D) => {
    const envs = [["local", ["a local chain", "test people", "a clock you can step", "test dollars"]], ["staging", ["Base Sepolia, a test network", "Better Auth", "the real clock", "test USDC"]], ["production", ["Base, the real network", "Better Auth", "the real clock", "USDC"]]];
    const rowsOf = ["chain", "people", "clock", "money"], x = (k) => 96 + k * 588;
    const inner = (file) => { const text = D.src[file], a = Kit.start(text) + 1, b = text.replace(/\n$/, "").split("\n").length - 1; return { from: a, to: b }; };
    const things = ["Treasury", "Seat", "Budget", "Proposal", "Spend", "Entry"], may = [["the holder", "spend"], ["an owner", "propose · approve · revoke"], ["the clock", "renew · expire"], ["the system", "grant · record"]];
    const waits = [["Proposal pro_12", "one more owner", "6 days left"], ["Spend spd_32", "an explanation from its holder", "unexplained"], ["a call, 0x9f3c…e1", "the chain", "2 more blocks"]];
    return `<style>
      #scene-run .cell { position: absolute; width: 552px; height: 46px; display: flex; align-items: center; gap: 14px; padding: 0 16px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); font-size: 24px; color: var(--paper); white-space: nowrap; } #scene-run .cell .lbl { width: 84px; font-size: 19px; }
      #scene-run #up { left: 96px; top: 548px; width: 1000px; } #scene-run #up .screen { font-size: 21px; line-height: 32px; }
      #scene-run .side { left: 1130px; top: 548px; width: 694px; font-size: 26px; line-height: 1.35; color: var(--text2); } #scene-run .side b { color: var(--paper); font-weight: 500; }
      #scene-run .portal { left: 96px; top: 262px; width: 1728px; height: 690px; } #scene-run .pcols { position: absolute; left: 0; right: 0; top: 46px; bottom: 0; display: grid; grid-template-columns: 290px 1fr 600px; }
      #scene-run .pcol { padding: 20px 24px; border-right: 1px solid var(--rule); } #scene-run .pcol:last-child { border-right: 0; } #scene-run .pcol .lbl { margin-bottom: 12px; }
      #scene-run .thing { font-size: 26px; padding: 9px 14px; color: var(--text2); border-left: 3px solid transparent; } #scene-run .thing.on { color: var(--paper); border-left-color: var(--cyan); background: rgba(98,198,255,.08); }
      #scene-run .mach { display: flex; align-items: center; gap: 12px; margin: 6px 0 12px; font-family: var(--mono); font-size: 22px; } #scene-run .mach span { padding: 8px 16px; border: 2px solid var(--paper); color: var(--paper); } #scene-run .mach i { font-style: normal; font-family: var(--label); text-transform: uppercase; letter-spacing: .12em; font-size: 18px; color: var(--muted); }
      #scene-run .mnote { font-size: 22px; color: var(--text2); margin-bottom: 26px; }
      #scene-run .may { display: grid; grid-template-columns: 190px 1fr; padding: 9px 0; border-top: 1px solid var(--rule); font-size: 24px; color: var(--text2); } #scene-run .may b { font-weight: 400; color: var(--paper); } #scene-run .may span { font-family: var(--mono); font-size: 21px; }
      #scene-run .wait { padding: 12px 16px; border: 1px solid var(--rule2); background: rgba(8,17,31,.5); margin-bottom: 12px; } #scene-run .wait b { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 21px; font-weight: 400; color: var(--paper); } #scene-run .wait b em { font-style: normal; color: var(--muted); } #scene-run .wait span { display: block; font-size: 24px; color: var(--cyan); margin-top: 2px; }
    </style>
    <div class="head"><div class="eyebrow">Run</div><div class="hl">An environment is a file. So is everything it runs on.</div></div>
    ${envs.map(([name], k) => { const file = `blueprint/environments/${name}.ts`; return Kit.ed(D, { id: "e-" + name, file, ...inner(file), x: x(k), y: 262, w: 552, size: "small nog", cls: "pa", tag: "" }); }).join("")}
    ${envs.map(([name, cells], k) => cells.map((text, r) => `<div class="cell pa c-${name} r${r}" style="left:${x(k)}px;top:${640 + r * 56}px"><span class="lbl">${rowsOf[r]}</span>${text}</div>`).join("")).join("")}
    ${Kit.ed(D, { id: "e-infra", file: "falls-out/infra.ts", from: 1, x: 96, y: 262, w: 1728, size: "small", cls: "pb", tag: '<span class="tag cy">generated · a sketch</span>' })}
    ${Loc.term({ id: "up", x: 96, y: 548, w: 1000, title: "ortho env up", tag: '<span class="tag rd">designed output, not a real run</span>', text: D.src["falls-out/env-up.txt"] })}
    <div class="abs side pb">One command brings up <b>the contract's factory, the indexer, the relayer, the database and the server</b>, in that order. Then it runs the journeys against what it made.</div>
    <div class="panel portal"><div class="bar"><span class="dots"></span><span>the <b>portal</b></span><span class="tag">a sketch</span></div><div class="pcols">
      <div class="pcol pc0"><div class="lbl">things</div>${things.map((t) => `<div class="thing${t === "Budget" ? " on" : ""}">${t}</div>`).join("")}</div>
      <div class="pcol pc1"><div class="lbl">Budget · its machine</div><div class="mach mm"><span>active</span><i>spend →</i><span>exhausted</span><i>revoke →</i><span>revoked</span></div><div class="mnote mm">renew: every month, back to active</div>
        <div class="lbl who">who may do what</div>${may.map(([who, what]) => `<div class="may who"><b>${who}</b><span>${what}</span></div>`).join("")}</div>
      <div class="pcol pc2"><div class="lbl">waiting for</div>${waits.map(([what, need, when]) => `<div class="wait"><b>${what}<em>${when}</em></b><span>${need}</span></div>`).join("")}</div></div></div>
    ${Kit.legend}`;
  },
  build(s) {
    const c = s.cue, D = s.D, F = (name) => `blueprint/environments/${name}.ts`, B = (name) => s.$(`#e-${name} .code`), L = (name, re) => Kit.line(D, F(name), re);
    const one = (name, re, t) => { const n = L(name, re); s.focus(B(name), [n, n], t, 0.3); }, cell = (name, r, t) => s.in(`.c-${name}.r${r}`, t, { y: 6, dur: 0.3 });
    s.in(".head", s.start + 0.3); s.in(".klegend", c("n3", "Production"));
    s.in("#e-local", c("n1", "file") - 0.3, { y: 14 }); one("local", /stores:/, c("n1", "store")); one("local", /identity:/, c("n1", "sign")); s.focus(B("local"), null, c("n2") - 0.1);
    cell("local", 0, c("n2", "local chain")); cell("local", 1, c("n2", "test people")); cell("local", 2, c("n2", "clock")); cell("local", 3, c("n2", "$") - 0.1);
    s.in("#e-staging", c("n3", "Staging") - 0.2, { y: 14 }); one("staging", /deploy:/, c("n3", "real server")); cell("staging", 0, c("n3", "test network")); one("staging", /stores:/, c("n3", "test network"));
    cell("staging", 1, c("n3", "sign")); one("staging", /identity:/, c("n3", "sign")); s.in(".c-staging.r2, .c-staging.r3", c("n3", "sign") + 0.4, { y: 6, dur: 0.3, stagger: 0.15 });
    s.focus(B("staging"), null, c("n3", "Production")); s.in("#e-production", c("n3", "Production") - 0.2, { y: 14 }); one("production", /promotesFrom/, c("n3", "same revision"));
    cell("production", 0, c("n3", "real network")); one("production", /stores:/, c("n3", "real network")); s.in(".c-production.r1, .c-production.r2, .c-production.r3", c("n3", "$") - 0.1, { y: 6, dur: 0.3, stagger: 0.12 });
    // The infrastructure, generated; then one command.
    const t4 = c("n4") - 0.45, ib = s.$("#e-infra .code"), I = (re) => Kit.line(D, "falls-out/infra.ts", re), out = s.$$("#up .o");
    s.out(".pa", t4, { dur: 0.3 }); s.in("#e-infra", t4 + 0.35, { y: 14 });
    [["server", /const server/, /const server/], ["database", /const db/, /const db/], ["two actors", /const relayer/, /const indexer/], ["factory", /const factory/, /const factory/]].forEach(([w, a, b]) => s.focus(ib, [I(a), I(b)], c("n4", w), 0.3));
    s.focus(ib, null, c("n5") - 0.1); s.in("#up", c("n5") - 0.35, { y: 14 }); const done = Loc.type(s, s.$("#up"), c("n5", "One command") - 0.1, 0.6);
    out.forEach((o, k) => Loc.row(s, o, done + 0.2 + k * 0.22)); s.to(out[5], { color: "#54d898", duration: 0.3 }, Math.max(c("n5", "journeys"), done + 0.2 + 5 * 0.22 + 0.1)); s.in(".side", c("n5", "brings it up"), { y: 10 });
    // The portal: the running system, the way it was described.
    const t6 = c("n6") - 0.45; s.out(".pb, #up", t6, { dur: 0.3 }); s.in(".portal", t6 + 0.35, { y: 14 });
    s.in(".pc0 > *", c("n6", "things") - 0.1, { y: 6, dur: 0.3, stagger: 0.06 }); s.in(".pc1 .lbl:first-child, .mm", c("n6", "machines") - 0.1, { y: 6, dur: 0.3, stagger: 0.1 });
    s.in(".who", c("n6", "who may") - 0.1, { y: 6, dur: 0.3, stagger: 0.08 }); s.in(".pc2 > *", c("n6", "waiting") - 0.1, { y: 6, dur: 0.3, stagger: 0.15 });
  },
});
