// Sheet 4. Where each thing lives: four places, what each gives and costs, and which of Capxul Lite's things goes where.
Film.scene("lives", {
  step: "where",
  html: (D) => {
    const cols = [
      ["db", "a database", "rows in one store", "lists, reports, rules across records", "only as right as our server"],
      ["act", "an actor", "one small server for each instance", "busy ones never race", "no list"],
      ["pub", "a public chain", "a contract we generate", "holds if we're down · anyone can check", "every field public · answers late"],
      ["prv", "a private chain", "the same, where outsiders can't read", "the same promises, kept private", ""],
    ];
    const homes = {
      pub: '<span class="chip th0">Treasury</span><span class="mark">the root of its own contract</span><span class="chip th1">Seat</span><span class="chip th2">Budget</span><span class="chip th3">Proposal</span>',
      db: '<span class="chip td0">Spend</span><span class="chip td1">Entry</span>',
      act: '<span class="none">none of ours</span><span class="own">the framework\'s</span><span class="chip fw ta0">Relayer</span><span class="chip fw ta1">Indexer</span>',
      prv: '<span class="tag tagd">designed, not built</span>',
    };
    const f = "blueprint/things/treasury/thing.ts", n = Kit.line(D, f, /lives: treasury\.root/);
    return `<style>
      #scene-lives .col { position: absolute; top: 262px; width: 414px; height: 478px; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); padding: 18px 20px; }
      #scene-lives .col.prv { border-style: dashed; background: rgba(12,24,42,.5); }
      #scene-lives .col .name { font-size: 38px; font-weight: 500; color: var(--paper); line-height: 1.15; } #scene-lives .col .what { font-size: 24px; color: var(--text2); margin-top: 6px; min-height: 66px; }
      #scene-lives .col .row { display: flex; gap: 12px; margin-top: 14px; font-size: 26px; line-height: 1.28; color: var(--paper); } #scene-lives .col .row b { flex: none; width: 96px; font: 600 20px var(--label); letter-spacing: .13em; text-transform: uppercase; color: var(--muted); padding-top: 5px; }
      #scene-lives .col .give { color: var(--text2); } #scene-lives .col .tagd { color: var(--amber); font-size: 20px; }
      #scene-lives .home { position: absolute; left: 20px; right: 20px; bottom: 18px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; } #scene-lives .home .chip { font-size: 23px; padding: 6px 13px; color: var(--paper); }
      #scene-lives .home .fw { border-color: rgba(98,198,255,.7); color: var(--cyan); } #scene-lives .home .mark { font: 600 19px var(--label); letter-spacing: .12em; text-transform: uppercase; color: var(--amber); flex: 1 1 55%; }
      #scene-lives .home .own { font: 600 20px var(--label); letter-spacing: .12em; text-transform: uppercase; color: var(--cyan); flex-basis: 100%; } #scene-lives .home .none { font-size: 23px; color: var(--muted); flex-basis: 100%; }
      #scene-lives .addr { left: 1130px; top: 790px; display: flex; align-items: center; gap: 16px; font-size: 26px; color: var(--paper); } #scene-lives .addr .chip { font-size: 23px; border-color: var(--amber); color: var(--amber); }
    </style>
    <div class="head"><div class="eyebrow">Describe · where each thing lives</div><div class="hl">Four places a thing can live.</div></div>
    ${cols.map(([id, name, what, get, give], k) => `<div class="col ${id}" style="left:${96 + k * 438}px"><div class="name">${name}</div><div class="what">${what}</div>
      <div class="row get"><b>you get</b><span>${get}</span></div>${give ? `<div class="row give"><b>you give up</b><span>${give}</span></div>` : ""}
      <div class="home">${homes[id]}</div></div>`).join("")}
    ${Kit.ed(D, { id: "e-root", file: f, x: 96, y: 770, w: 1000, from: n, to: n, size: "small", tag: '<span class="tag">you write</span>' })}
    <div class="abs addr"><span>so every company has its own address</span><span class="chip">0x7a21…04</span></div>${Kit.legend}`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3);
    s.in(".col", c("l1", "four places") - 0.2, { y: 18, stagger: 0.12, dur: 0.45 }); s.tl.set(s.$$(".col .what, .col .row, .home > *"), { autoAlpha: 0 }, 0);
    const col = (id, what, get, give) => { s.in(`.${id} .what`, what, { y: 6, dur: 0.3 }); s.in(`.${id} .get`, get, { y: 6, dur: 0.3 }); if (give !== undefined) s.in(`.${id} .give`, give, { y: 6, dur: 0.3 }); };
    col("db", c("l2", "rows"), c("l2", "lists"), c("l2", "only as right"));
    col("act", c("l3", "one small"), c("l3", "Busy"), c("l3", "no list"));
    col("pub", c("l4", "contract we"), c("l4", "holds"), c("l4", "every field"));
    col("prv", c("l5", "private chain"), c("l5", "same promises")); s.in(".prv .tagd", c("l5", "designed"), { y: 0, scale: 1.3, dur: 0.3 });
    ["Treasury", "seats", "budgets", "proposals"].forEach((w, k) => s.in(".th" + k, c("l6", w), { y: -22, dur: 0.4 }));
    s.in("#e-root", c("l6", "root") - 0.3, { y: 14 }); s.in(".pub .mark", c("l6", "root"), { x: -10, y: 0, dur: 0.3 }); s.in(".klegend", c("l6", "root"));
    s.to(".th0", { borderColor: "#ffb55c", color: "#ffb55c", duration: 0.3 }, c("l6", "root")); s.in(".addr", c("l6", "address") - 0.6, { x: 16, y: 0 });
    s.in(".td0", c("l7", "spends"), { y: -22, dur: 0.4 }); s.in(".td1", c("l7", "books"), { y: -22, dur: 0.4 });
    s.in(".act .none", c("l7", "None of our"), { y: 6, dur: 0.3 }); s.in(".act .own", c("l7", "Two parts"), { y: 6, dur: 0.3 });
    s.in(".ta0", c("l7", "relayer"), { y: -22, dur: 0.4 }); s.in(".ta1", c("l7", "indexer"), { y: -22, dur: 0.4 });
  },
});
