// Shared by this film's sheets, beside the kit: the five pieces an agent wrote (sheets 1 to 3) and the stack of three layers that
// carries the film (sheets 3 to 5). The bars inside them are strokes, not text: they stand for lines nobody has read yet.
const Loc = {
  /** The five pieces, in the order the narration names them, and the cell of the 3 × 2 grid each one takes. */
  pieces: ["the server", "the database", "the command line", "the tools for other agents", "the page of docs"],
  cellOf: [0, 3, 1, 4, 2],
  /** A cell of the grid: three across, two down, between the head and the foot of the sheet. */
  cell(n) { return { x: 96 + (n % 3) * 584, y: 280 + Math.floor(n / 3) * 367, w: 560, h: 327 }; },
  box(b) { return `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px`; },
  /** Strokes of uneven length, the same every time the film is built. */
  bars(n, seed = 1) {
    return `<div class="bars">${Array.from({ length: n }, (_, k) => { const a = Math.abs(Math.sin((k + 1) * 12.9898 * seed + seed * 4.1)), b = Math.abs(Math.sin((k + 3) * 7.233 * seed)); return `<i style="width:${Math.round(28 + a * 62)}%;margin-left:${b > 0.6 ? 8 : b > 0.3 ? 4 : 0}%"></i>`; }).join("")}</div>`;
  },
  /** The five pieces as cards, each in its cell. */
  cards(cls = "") { return Loc.pieces.map((name, k) => `<div class="piece pc${k} ${cls}" style="${Loc.box(Loc.cell(Loc.cellOf[k]))}"><div class="name">${name}</div>${Loc.bars(11, k + 2)}</div>`).join(""); },
  /** The stack: the blueprint on top, small; handlers under it; what the framework makes at the bottom. `h` is the three heights. */
  stack({ id, x, y, w, h, gap = 12, subs = true, bars = true, cls = "", top = "" }) {
    const names = [["top", "the blueprint", "you read this", 0], ["mid", "handlers", "your agents write these", Math.max(3, Math.round(h[1] / 26))], ["low", "server, API, SDK, command line", "the framework makes these", Math.max(3, Math.round(h[2] / 24))]];
    let at = 0;
    const layers = names.map(([key, name, sub, n], k) => { const html = `<div class="layer ${key}" style="top:${at}px;height:${h[k]}px"><div class="hdr"><b>${name}</b>${subs ? `<span>${sub}</span>` : ""}${k === 0 ? top : ""}</div>${bars && k > 0 ? Loc.bars(n, k + 5) : ""}</div>`; at += h[k] + gap; return html; }).join("");
    return `<div class="stack ${cls}" id="${id}" style="left:${x}px;top:${y}px;width:${w}px;height:${at - gap}px">${layers}</div>`;
  },
  /** Light one layer of a stack: the blueprint in white, the two below it in cyan. */
  light(s, layer, t, dur = 0.4) {
    const els = typeof layer === "string" ? s.$$(layer) : [layer];
    els.forEach((el) => { const white = el.classList.contains("top"); s.tl.to(el, { opacity: 1, borderColor: white ? "#e9f0fa" : "#62c6ff", backgroundColor: white ? "rgba(233,240,250,.13)" : "rgba(98,198,255,.15)", duration: dur }, t); });
  },
  /** Put a layer back to rest. */
  rest(s, layer, t, dur = 0.4) { s.tl.to(typeof layer === "string" ? s.$$(layer) : [layer], { opacity: 0.6, borderColor: "rgba(132,170,222,.36)", backgroundColor: "rgba(14,28,48,.9)", duration: dur }, t); },
  /** The look of the shared parts, scoped to one scene. */
  css: (id) => { const q = "#scene-" + id; return `<style>
    ${q} .who { position: absolute; right: 96px; top: 130px; display: flex; align-items: center; gap: 14px; }
    ${q} .who .arrow { font-size: 30px; color: var(--muted); line-height: 1; }
    ${q} .bars { display: flex; flex-direction: column; justify-content: space-between; } ${q} .bars i { display: block; height: 5px; background: var(--cyan); opacity: .3; }
    ${q} .piece { position: absolute; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); padding: 22px 28px; overflow: hidden; }
    ${q} .piece .name { font-size: 38px; line-height: 1.15; font-weight: 500; letter-spacing: -.01em; } ${q} .piece .bars { position: absolute; left: 28px; right: 28px; top: 96px; bottom: 26px; }
    ${q} .stack { position: absolute; }
    ${q} .layer { position: absolute; left: 0; right: 0; border: 1.5px solid var(--rule2); background: rgba(14,28,48,.9); padding: 0 22px; overflow: hidden; opacity: .6; display: flex; flex-direction: column; }
    ${q} .layer .hdr { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0 18px; padding-top: 14px; }
    ${q} .layer .hdr b { font-size: 30px; line-height: 38px; font-weight: 500; letter-spacing: -.01em; white-space: nowrap; }
    ${q} .layer .hdr span { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; line-height: 30px; font-weight: 600; color: var(--text2); white-space: nowrap; }
    ${q} .layer.top { justify-content: center; } ${q} .layer.top .hdr { padding-top: 0; } ${q} .layer.top .bars i { background: var(--paper); }
    ${q} .layer .bars { flex: 1; margin: 16px 0 20px; }
    ${q} .stack.mini .layer { padding: 0 18px; } ${q} .stack.mini .layer .hdr { padding-top: 8px; } ${q} .stack.mini .layer.top .hdr { padding-top: 0; } ${q} .stack.mini .layer .hdr b { font-size: 24px; line-height: 30px; } ${q} .stack.mini .layer .bars { margin: 10px 0 14px; }
    ${q} .say { font-size: 44px; line-height: 1.2; font-weight: 500; letter-spacing: -.01em; }
  </style>`; },
};
