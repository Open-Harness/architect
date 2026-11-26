// Sheet 15. Where this stands: what runs today, what is decided and being built, and what this film proposes.
Film.scene("status", {
  html: () => {
    const cols = [["Runs today", "gr", ["the blueprint, and its check", "the API, SDK, CLI, agent tools, docs", "handlers, scaffolded once", "journeys, and ortho prove"]],
      ["Decided, being built", "cy", ["the chain store", "accounts, and roles on chain", "the signed entry", "the relayer and the follower", "moves made by time"]],
      ["Proposed in this film", "am", ["the reference to a thing", "the next step", "owners together", "rules as data"]]];
    return `<style>
      #scene-status .scol { position: absolute; top: 290px; width: 560px; } #scene-status .scol .lbl { font-size: 26px; margin-bottom: 14px; } #scene-status .scol div.item { padding: 14px 20px; border: 1px solid var(--rule2); background: rgba(14,28,48,.9); margin-top: 10px; font-size: 28px; color: var(--paper); }
      #scene-status .scol.gr .lbl { color: var(--green); } #scene-status .scol.cy .lbl { color: var(--cyan); } #scene-status .scol.am .lbl { color: var(--amber); }
      #scene-status .scol.gr div.item { border-color: rgba(84,216,152,.6); } #scene-status .scol.cy div.item { border-color: rgba(98,198,255,.6); } #scene-status .scol.am div.item { border-color: var(--amber); color: var(--amber); }
    </style>
    <div class="head"><div class="eyebrow">An honest note</div><div class="hl">Where this stands.</div></div>
    ${cols.map(([name, cls, items], k) => `<div class="scol sc${k} ${cls}" style="left:${96 + k * 584}px"><div class="lbl ${cls}">${name}</div>${items.map((t) => `<div class="item">${t}</div>`).join("")}</div>`).join("")}`;
  },
  build(s) {
    const c = s.cue;
    s.in(".head", s.start + 0.3);
    [["h2", ["blueprint", "generated", "handlers", "proof"]], ["h3", ["chain store", "accounts", "signed entry", "relayer"]], ["h4", ["reference", "next step", "owners together", "rules as data"]]].forEach(([line, words], k) => {
      s.in(`.sc${k} .lbl`, c(line) - 0.1); const items = s.$$(`.sc${k} .item`); words.forEach((w, n) => s.in(items[n], c(line, w), { y: 10, dur: 0.35 })); if (items.length > words.length) s.in(items.slice(words.length), c(line, "$") - 0.2, { y: 10, dur: 0.35 });
    });
  },
});
