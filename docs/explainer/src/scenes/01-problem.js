// Sheet 1. The same fact written six times by hand, and what happens when one copy changes. The six snippets here are the
// only invented code in the film: they stand for an ordinary hand-written stack, not for anything Orthograph makes.
Film.scene("problem", {
  html: () => {
    const cards = [
      ["Route", `app.post(<span class="s">"/handle/claim"</span>,\n  requireSignedIn, claimName)`],
      ["Validator", `<span class="k">const</span> Name = z.string()\n  .regex(<span class="r">/^[a-z][a-z0-9]<span class="swap"><span class="a">{0,31}</span><span class="b">{0,23}</span></span>$/</span>)`],
      ["SDK method", `claim(name: <span class="t">string</span>):\n  <span class="t">Promise</span>&lt;{ handle: <span class="t">string</span> }&gt;`],
      ["CLI command", `.command(<span class="s">"claim"</span>)\n.option(<span class="s">"--name"</span>, <span class="s">"up to <u>32</u> chars"</span>)`],
      ["Agent tool", `{ name: <span class="s">"claim_handle"</span>,\n  input: { name: <span class="s">"string, max <u>32</u>"</span> } }`],
      ["Docs", `<span class="k">## Claim a name</span>\n<span class="c">name: up to <u>32</u> lowercase letters…</span>`],
    ];
    return `<style>
      #scene-problem .fact { left: 0; right: 0; top: 168px; text-align: center; }
      #scene-problem .fact .big { font-size: 84px; font-weight: 500; letter-spacing: -0.02em; margin-top: 10px; }
      #scene-problem .card { width: 544px; height: 196px; font-family: var(--mono); font-size: 22px; line-height: 35px; white-space: pre; }
      #scene-problem .card .lbl em { font-family: var(--label); text-transform: uppercase; letter-spacing: 0.13em; font-size: 18px; }
      #scene-problem .swap { position: relative; display: inline-block; } #scene-problem .swap .b { position: absolute; left: 0; top: 0; color: var(--amber); opacity: 0; }
      #scene-problem u { text-decoration: none; }
      #scene-problem .stamp { position: absolute; right: 20px; bottom: 16px; }
      #scene-problem .sum { left: 0; right: 0; top: 900px; text-align: center; font-size: 34px; color: var(--text2); }
    </style>
    <div class="abs fact"><div class="eyebrow">One small feature</div><div class="big">A person can claim a name.</div></div>
    ${cards.map(([label, body], k) => `<div class="card c${k}" style="left:${96 + (k % 3) * 592}px;top:${420 + Math.floor(k / 3) * 226}px"><div class="lbl"><span>${label}</span><em>written by hand</em></div>${body}<span class="tag stamp ${k === 1 ? "am" : "rd"} hidden0">${k === 1 ? "changed" : "stale"}</span></div>`).join("")}
    <div class="abs sum"><b class="count" style="color:var(--paper);font-weight:500">Six copies of one idea</b><span class="sync">, kept in sync by hand.</span></div>`;
  },
  build(s) {
    const c = s.cue;
    s.in(".fact .eyebrow", s.start + 0.5);
    s.in(".fact .big", c("p1", "A person"), { y: 24, dur: 0.8 });
    ["route", "validator", "SDK", "CLI", "tool", "page"].forEach((w, k) => s.in(".c" + k, c("p2", w), { y: 26, dur: 0.5 }));
    s.in(".sum .count", c("p3", "Six")); s.in(".sum .sync", c("p3", "kept"));
    const change = c("p4", "Change");
    s.to(".c1 .swap .a", { opacity: 0, duration: 0.3 }, change); s.to(".c1 .swap .b", { opacity: 1, duration: 0.3 }, change);
    s.to(".c1", { borderColor: "#ffb55c", duration: 0.3 }, change); s.in(".c1 .stamp", change + 0.15, { y: 0, scale: 1.25 });
    const stale = c("p4", "others");
    [3, 4, 5].forEach((k, n) => {
      const t = stale + n * 0.22;
      s.to(`.c${k}`, { borderColor: "#ff7373", duration: 0.3 }, t); s.to(`.c${k} u`, { color: "#ff7373", duration: 0.3 }, t); s.in(`.c${k} .stamp`, t, { y: 0, scale: 1.25 });
    });
    s.to(".sum", { autoAlpha: 0.35, duration: 0.4 }, change);
  },
});
