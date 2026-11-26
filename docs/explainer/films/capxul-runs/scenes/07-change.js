// Sheet 7. A rule changes. One line in the blueprint; the model names what it touched; and because the contract is live, the change
// is a new version that nothing live moves to until its owners choose.
Film.scene("change", {
  step: "change",
  html: (D) => {
    const m = "blueprint/things/budget/machine.ts", n = Kit.line(D, m, /renew:/), kept = ["spend", "propose", "approve", "grant", "the books", "who may do what"];
    const firms = [["Acme Ltd", "41,200 USDC", "still on v3: their choice"], ["Birch & Co", "8,950 USDC", "upgraded in place"], ["Cove Labs", "120,000 USDC", "moved to a new contract"]];
    return `<style>
      #scene-change .swap { position: relative; display: inline-block; text-indent: 0; } #scene-change .swap .wk { position: absolute; left: 0; top: 0; color: var(--green); opacity: 0; white-space: nowrap; }
      #scene-change .kept { left: 96px; top: 822px; width: 1000px; } #scene-change .keep { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; } #scene-change .keep .kpill { color: var(--green); border-color: var(--green); font-size: 21px; padding: 4px 12px; }
      #scene-change .vers { left: 1124px; top: 438px; width: 700px; } #scene-change .vh { position: absolute; top: 40px; width: 334px; height: 58px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border: 2px solid var(--paper); font-family: var(--mono); font-size: 24px; color: var(--paper); background: rgba(14,28,48,.92); }
      #scene-change .vh em { font: 600 17px var(--label); font-style: normal; text-transform: uppercase; letter-spacing: .13em; color: var(--text2); } #scene-change .vh.v3 { left: 0; } #scene-change .vh.v4 { left: 366px; border-color: var(--cyan); color: var(--cyan); } #scene-change .vh.v4 em { color: var(--cyan); }
      #scene-change .firm { position: absolute; left: 0; width: 334px; height: 78px; padding: 9px 16px; border: 1px solid var(--rule2); background: rgba(14,28,48,.92); } #scene-change .firm b { font-size: 24px; font-weight: 500; color: var(--paper); }
      #scene-change .firm .ver { position: absolute; right: 14px; top: 10px; width: 40px; height: 28px; font-family: var(--mono); font-size: 20px; } #scene-change .firm .ver i { position: absolute; right: 0; top: 0; font-style: normal; color: var(--text2); } #scene-change .firm .ver .vb { color: var(--cyan); }
      #scene-change .firm .sub { position: relative; display: block; height: 28px; font-size: 20px; margin-top: 2px; } #scene-change .firm .sub i { position: absolute; left: 0; top: 0; font-style: normal; white-space: nowrap; color: var(--text2); } #scene-change .firm .sub .sb { color: var(--cyan); }
      #scene-change .firm.fresh { left: 366px; border-color: var(--cyan); }
      #scene-change .still { position: absolute; left: 0; top: 380px; width: 334px; font-size: 22px; color: var(--text2); } #scene-change .take { position: absolute; left: 366px; top: 380px; width: 334px; font-size: 22px; color: var(--text2); }
    </style>
    <div class="head"><div class="eyebrow">A rule changes</div><div class="hl">One line. The model says what it touched.</div></div>
    ${Kit.ed(D, { id: "e-m", file: m, from: n, to: n + 1, x: 96, y: 262, w: 1728, tag: '<span class="tag">you write</span>' }).replace('<span class="s">"1 month"</span>', '<span class="swap"><span class="s mo">"1 month"</span><span class="wk">"1 week"</span></span>')}
    ${Loc.term({ id: "imp", x: 96, y: 438, w: 1000, title: "ortho impact", tag: '<span class="tag rd">designed output, not a real run</span>', text: D.src["falls-out/impact.txt"] })}
    <div class="abs kept"><div class="lbl gr">still proven</div><div class="keep">${kept.map((t) => `<span class="kpill">${t}</span>`).join("")}</div></div>
    <div class="abs vers"><div class="lbl">versions of the contract · <span class="am">proposed</span></div>
      <div class="vh v3"><span>Treasury v3</span><em>live</em></div><div class="vh v4"><span>Treasury v4</span><em>published</em></div>
      ${firms.map(([name, money, after], k) => `<div class="firm firm${k}" style="top:${114 + k * 88}px"><b>${name}</b><span class="ver"><i class="va">v3</i><i class="vb">v4</i></span><span class="sub"><i class="sa">${money}</i><i class="sb">${after}</i></span></div>`).join("")}
      <div class="firm fresh" style="top:114px"><b>Dune Inc</b><span class="ver"><i class="vb">v4</i></span><span class="sub"><i class="sb">a new company</i></span></div>
      <div class="still">Nothing live moves.</div><div class="take">Their owners take it up, together.</div></div>`;
  },
  build(s) {
    const c = s.cue, D = s.D, m = "blueprint/things/budget/machine.ts", body = s.$("#e-m .code"), n = Kit.line(D, m, /by: Blueprint\.time/), out = s.$$("#imp .o");
    s.in(".head", s.start + 0.3); s.in("#e-m", s.start + 0.4, { y: 14 });
    s.focus(body, [n, n], c("c1", "rule changes")); s.to(".swap .mo", { opacity: 0, duration: 0.25 }, c("c1", "every week")); s.to(".swap .wk", { opacity: 1, duration: 0.3 }, c("c1", "every week") + 0.1);
    s.fromTo(".swap", { backgroundColor: "rgba(84,216,152,0)" }, { backgroundColor: "rgba(84,216,152,.22)", duration: 0.3 }, c("c1", "every week"));
    // What the model says, a line at a time.
    s.in("#imp", c("c1", "every week") + 0.5, { y: 14 }); Loc.type(s, s.$("#imp"), c("c2") + 0.1, 0.5, c("c1", "every week") + 0.7); Loc.row(s, out[0], c("c2", "model says"));
    ["contract", "client", "app", "docs", "two journeys"].forEach((w, k) => Loc.row(s, out[k + 1], c("c2", w)));
    // Live, with money in it: a new version beside the old, and nothing moves until its owners say so.
    s.tl.set(s.$$(".vb, .sb, .still, .take"), { autoAlpha: 0 }, 0); s.tl.set(s.$$(".fresh .vb, .fresh .sb"), { autoAlpha: 1 }, 0);
    const live = c("c3", "live");
    s.in(".vers .lbl", live - 0.2); s.in(".v3", live, { y: 8, dur: 0.3 }); s.in(".firm0, .firm1, .firm2", live + 0.15, { y: 8, dur: 0.3, stagger: 0.18 }); Loc.row(s, out[6], c("c3", "money")); s.to(out[6], { color: "#e9f0fa", duration: 0.3 }, c("c3", "money") + 0.2);
    s.in(".v4", c("c3", "new version") - 0.1, { x: -16, y: 0, dur: 0.4 }); s.to(".still", { autoAlpha: 1, duration: 0.3 }, c("c3", "nothing"));
    s.in(".fresh", c("c4", "New companies"), { y: 8, dur: 0.35 }); s.to(".still", { autoAlpha: 0, duration: 0.25 }, c("c4", "owners") - 0.2); s.to(".take", { autoAlpha: 1, duration: 0.3 }, c("c4", "owners"));
    const flip = (k, t) => { s.to(`.firm${k} .va, .firm${k} .sa`, { autoAlpha: 0, duration: 0.2 }, t); s.to(`.firm${k} .vb, .firm${k} .sb`, { autoAlpha: 1, duration: 0.25 }, t + 0.15); s.to(".firm" + k, { borderColor: "#62c6ff", duration: 0.3 }, t); };
    flip(1, c("c4", "In place"));
    const move = c("c4", "moving"); s.to(".firm2", { x: 366, y: -88, duration: 0.7, ease: "power2.inOut" }, move); flip(2, move + 0.5);
    s.to(".firm0 .sa", { autoAlpha: 0, duration: 0.2 }, c("c4", "can't") + 0.2); s.to(".firm0 .sb", { autoAlpha: 1, duration: 0.25, color: "#a9bcd6" }, c("c4", "can't") + 0.35);
    Loc.row(s, out[7], c("c5") - 0.1); s.to(out[7], { color: "#54d898", duration: 0.3 }, c("c5")); s.in(".kept .lbl", c("c5") - 0.1); s.in(".keep .kpill", c("c5"), { y: 8, stagger: 0.08, dur: 0.3 });
  },
});
