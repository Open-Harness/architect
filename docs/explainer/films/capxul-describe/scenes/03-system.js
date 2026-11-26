// Sheet 3. The system in plain words, and the three places where things are decided.
Film.scene("system", {
  step: "system",
  html: () => `<style>
      #scene-system .kbox { top: 400px; height: 270px; } #scene-system .kbox b { display: block; font-size: 38px; font-weight: 500; margin: 2px 0 14px; } #scene-system .kbox .kpill { margin: 0 8px 10px 0; font-family: var(--sans); font-size: 24px; color: var(--paper); }
      #scene-system .people { left: 96px; top: 262px; right: 96px; display: flex; gap: 12px; align-items: center; } #scene-system .people .kpill { font-family: var(--sans); font-size: 24px; color: var(--paper); border-radius: 999px; padding: 8px 20px; }
      #scene-system .join { position: absolute; top: 513px; width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--red); display: grid; place-items: center; background: var(--bg); color: var(--red); font: 600 16px var(--label); letter-spacing: .08em; }
      #scene-system .last { left: 96px; right: 96px; top: 760px; text-align: center; }
    </style>
    <div class="head"><div class="eyebrow">The system</div><div class="hl">Capxul Lite: a treasury, budgets, and the books.</div></div>
    <div class="abs people"><span class="lbl" style="margin-right:6px">who uses it</span><span class="kpill o">Bob, an owner</span><span class="kpill o">Carol, an owner</span><span class="kpill o">Dan, an owner</span><span class="kpill ada">Ada, with a budget</span><span class="kpill agent">an agent, with a budget</span><span class="kpill acc">the accountant</span></div>
    <div class="kbox chain" style="left:96px;width:560px"><div class="lbl">the chain decides</div><b>The treasury</b><span class="kpill k1">the money</span><span class="kpill k1">its owners</span><span class="kpill k2">budgets</span><div class="note" style="margin-top:8px;font-size:23px">One contract. Every field public.</div></div>
    <div class="kbox ours" style="left:680px;width:560px"><div class="lbl">our server decides</div><b>The notes and the books</b><span class="kpill k3">the reason</span><span class="kpill k3">the receipt</span><span class="kpill k3">the entry</span><div class="note" style="margin-top:8px;font-size:23px">Private. It can't go on a chain.</div></div>
    <div class="kbox dev" style="left:1264px;width:560px"><div class="lbl">a wallet decides</div><b>Whether to sign</b><span class="kpill k4">a person's key</span><span class="kpill k4">an agent's key</span><div class="note" style="margin-top:8px;font-size:23px">A key lives in one place, and never leaves it.</div></div>
    <div class="join j1" style="left:646px">join</div><div class="join j2" style="left:1230px">join</div>
    <div class="abs last kbig">The hard part is the joins.</div>`,
  build(s) {
    const c = s.cue;
    s.in(".head .eyebrow", s.start + 0.3); s.in(".head .hl", c("y1", "Call it") - 0.2);
    s.in(".chain", c("y2", "treasury"), { y: 18 }); s.in(".k1", c("y2", "money"), { y: 6, stagger: 0.5, dur: 0.3 }); s.in(".people .lbl, .people .o", c("y2", "owners together") - 0.3, { y: 8, stagger: 0.1, dur: 0.3 });
    s.in(".k2", c("y3", "budget"), { y: 6, dur: 0.3 }); s.in(".ada", c("y3", "a person"), { y: 8, dur: 0.3 }); s.in(".agent", c("y3", "an agent"), { y: 8, dur: 0.3 });
    s.in(".ours", c("y4", "books") - 0.6, { y: 18 }); s.in(".k3", c("y4", "reason") - 0.2, { y: 6, stagger: 0.2, dur: 0.3 }); s.in(".acc", c("y4", "books"), { y: 8, dur: 0.3 });
    s.in(".dev", c("y5", "wallet") - 0.3, { y: 18 }); s.in(".k4", c("y5", "wallet"), { y: 6, stagger: 0.15, dur: 0.3 });
    const glow = (sel, t) => s.fromTo(sel, { boxShadow: "0 0 0 0px rgba(233,240,250,0)" }, { boxShadow: "0 0 0 6px rgba(233,240,250,.16)", duration: 0.3, yoyo: true, repeat: 1 }, t);
    glow(".chain", c("y5", "chain decides")); glow(".ours", c("y5", "server decides"));
    s.in(".join", c("y6", "joins") - 0.4, { y: 0, scale: 0.4, stagger: 0.15, dur: 0.35 }); s.in(".last", c("y6", "joins") - 0.2);
  },
});
