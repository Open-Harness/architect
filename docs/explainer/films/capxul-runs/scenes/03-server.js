// Sheet 3. On our side: the generated server as a file tree, and the two actors beside it. The relayer takes signed calls; the
// indexer reads the chain back into the events the blueprint declared.
Film.scene("server", {
  step: "server",
  html: (D) => {
    const files = D.src["falls-out/server.txt"].trimEnd().split("\n").slice(1).map((l) => { const m = /^\s+(\S+)\s{2,}(.+)$/.exec(l); if (!m) throw new Error("server.txt: " + l); return [m[1], m[2]]; });
    const ev = "blueprint/things/budget/events.ts", from = Kit.line(D, ev, /export const BudgetSpent/);
    return `<style>
      #scene-server .tree { left: 96px; top: 262px; width: 1000px; } #scene-server .fr { display: grid; grid-template-columns: 290px 1fr; gap: 18px; padding: 11px 22px; border-top: 1px solid var(--rule); align-items: baseline; } #scene-server .fr:first-child { border-top: 0; }
      #scene-server .fr b { font-family: var(--mono); font-size: 22px; font-weight: 400; color: var(--cyan); white-space: nowrap; } #scene-server .fr span { font-size: 22px; line-height: 1.3; color: var(--text2); }
      #scene-server .rel { left: 1120px; top: 262px; width: 704px; height: 324px; } #scene-server .flow { display: flex; align-items: center; gap: 10px; margin: 10px 0 20px; } #scene-server .flow .kpill { font-family: var(--sans); font-size: 22px; color: var(--paper); padding: 6px 12px; } #scene-server .flow .me { border-color: var(--cyan); color: var(--cyan); }
      #scene-server .fact { font-size: 26px; line-height: 1.25; margin-top: 12px; color: var(--paper); } #scene-server .fact em { display: block; font: 400 21px var(--mono); font-style: normal; color: var(--text2); margin-top: 4px; }
      #scene-server .idx { left: 96px; top: 608px; width: 1728px; height: 362px; }
      #scene-server .raw { left: 1052px; top: 56px; width: 330px; } #scene-server .raw .hex { font-family: var(--mono); font-size: 20px; line-height: 28px; color: var(--muted); white-space: pre; margin-top: 6px; }
      #scene-server .raw .down { margin: 10px 0 8px; color: var(--cyan); font-size: 22px; display: flex; gap: 10px; align-items: center; } #scene-server .raw .down .lnote { color: var(--cyan); font-size: 19px; }
      #scene-server .dec { border: 1px solid var(--cyan); padding: 8px 14px; font-family: var(--mono); font-size: 19px; line-height: 28px; color: var(--text2); } #scene-server .dec b { display: block; color: var(--cyan); font-weight: 500; font-size: 22px; }
      #scene-server .lst { left: 1402px; top: 56px; width: 304px; } #scene-server .bud { display: flex; justify-content: space-between; padding: 8px 14px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); margin-top: 8px; font-family: var(--mono); font-size: 20px; color: var(--paper); } #scene-server .bud i { font: 400 19px var(--sans); font-style: normal; color: var(--text2); white-space: nowrap; }
      #scene-server .nolist { margin-top: 14px; font-size: 22px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">Falls out · on our side</div><div class="hl">A server, and two actors.</div></div>
    <div class="panel tree"><div class="bar"><span class="dots"></span><span>generated/<b>server/</b></span><span class="tag cy">generated · a sketch</span></div>
      <div class="files">${files.map(([name, what], k) => `<div class="fr fr${k}"><b>${name}</b><span>${what}</span></div>`).join("")}</div></div>
    <div class="kbox ours rel"><div class="lbl">the relayer · an actor</div>
      <div class="flow"><span class="kpill">a signed call, and its reason</span><span class="mu">→</span><span class="kpill me">Relayer</span><span class="mu">→</span><span class="kpill">the chain</span></div>
      <div class="fact f0">takes signed calls</div><div class="fact f1">keeps each reason under its seal<em>0x5e…a1 · "Design work, March"</em></div><div class="fact f2">pays the gas</div></div>
    <div class="kbox ours idx"><div class="lbl">the indexer · an actor</div>
      ${Kit.ed(D, { id: "e-ev", file: ev, from, to: from + 6, x: 22, y: 56, w: 1010, size: "small nog", tag: '<span class="tag">you write · blueprint</span>' })}
      <div class="abs raw"><div class="lbl">a raw log, from the chain</div><div class="hex">topic 0x8c5b…41e7\ndata  0x…0190 0x…51c2 0x…5ea1</div>
        <div class="down"><span>↓</span><span class="lnote">known from the blueprint</span></div>
        <div class="dec"><b>BudgetSpent</b>budget bud_7 · amount 400<br>to 0x51…c2 · remaining 600<br>reason: its seal, 0x5e…a1</div></div>
      <div class="abs lst"><div class="lbl">the list it keeps</div><div class="bud">bud_7<i>active · 600 left</i></div><div class="bud">bud_9<i>exhausted</i></div><div class="bud">bud_12<i>active · 250 left</i></div>
        <div class="nolist">A contract has no list.</div></div></div>
    ${Kit.legend}`;
  },
  build(s) {
    const c = s.cue, D = s.D, ev = "blueprint/things/budget/events.ts", eb = s.$("#e-ev .code"), first = Kit.line(D, ev, /export const BudgetSpent/);
    s.in(".head", s.start + 0.3); s.in(".tree", c("v1", "server") - 0.2, { y: 14 }); s.tl.set(s.$$(".fr"), { autoAlpha: 0 }, 0);
    s.in(".fr0", c("v1", "route"), { y: 6, dur: 0.3 }); s.in(".fr1", c("v1", "enforcer"), { y: 6, dur: 0.3 }); s.in(".fr2", c("v1", "tables"), { y: 6, dur: 0.3 });
    s.in(".rel", c("v2", "two actors") - 0.1, { y: 14 }); s.in(".idx", c("v3") - 0.35, { y: 14 }); s.in(".fr3, .fr4", c("v2", "two actors") + 0.2, { y: 6, dur: 0.3, stagger: 0.15 });
    s.tl.set(s.$$(".flow > *, .fact, #e-ev, .raw > *, .lst > *"), { autoAlpha: 0 }, 0);
    s.in(".flow > *", c("v2", "relayer"), { x: -10, y: 0, stagger: 0.12, dur: 0.3 });
    s.in(".f0", c("v2", "signed"), { y: 8, dur: 0.3 }); s.in(".f1", c("v2", "reason"), { y: 8, dur: 0.3 }); s.in(".f2", c("v2", "gas"), { y: 8, dur: 0.3 });
    s.in(s.$$(".raw > *").slice(0, 2), c("v3", "reads the chain"), { y: 8, dur: 0.3 });
    s.in("#e-ev", c("v3", "knows every event") - 0.1, { y: 10, dur: 0.4 }); s.in(".klegend", c("v3", "knows every event"));
    s.in(s.$$(".raw > *").slice(2), c("v3", "blueprint"), { y: 8, dur: 0.3, stagger: 0.2 }); s.focus(eb, [first, first], c("v3", "blueprint"));
    s.focus(eb, null, c("v3", "interface") + 0.5);
    s.in(s.$$(".lst > *").slice(0, 4), c("v3", "list of budgets") - 0.1, { y: 8, dur: 0.3, stagger: 0.12 }); s.in(".nolist", c("v3", "no list"), { y: 8, dur: 0.3 });
  },
});
