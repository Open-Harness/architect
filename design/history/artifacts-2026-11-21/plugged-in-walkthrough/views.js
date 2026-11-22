// Pure pieces of the page: text in, HTML out. Nothing here reads the data file or the page's state.
/* exported Views */
const Views = (() => {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // A light tokenizer: comments, strings and a few keywords. Enough to read code, not a full highlighter.
  const KEYWORDS = /^(import|export|from|const|let|type|default|return|yield|if|else|function|as|new|async|await|interface|readonly)$/;
  const tokens = (line) => {
    let out = "";
    let i = 0;
    while (i < line.length) {
      const rest = line.slice(i);
      const comment = rest.startsWith("//") || rest.startsWith("<!--") || (i === 0 && /^\s*\*(?!\*)(\s|\/|$)/.test(rest))
        ? rest
        : rest.startsWith("/*") ? (/^\/\*.*?(\*\/|$)/.exec(rest) ?? [rest])[0] : "";
      if (comment) {
        out += `<span class="c">${esc(comment)}</span>`;
        i += comment.length;
        continue;
      }
      const str = /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/.exec(rest);
      if (str) {
        out += `<span class="s">${esc(str[0])}</span>`;
        i += str[0].length;
        continue;
      }
      const word = /^[A-Za-z_$][\w$]*/.exec(rest);
      if (word) {
        out += KEYWORDS.test(word[0]) ? `<span class="k">${word[0]}</span>` : esc(word[0]);
        i += word[0].length;
        continue;
      }
      out += esc(line[i]);
      i++;
    }
    return out;
  };

  /**
   * Lines of a file. `show` is the 0-based lines to show (all when absent); gaps between them are marked.
   * `attrs(i)` gives each line's extra attributes and classes.
   */
  const lines = (all, { show, first = 1, attrs = () => ({ cls: "", data: "" }) } = {}) => {
    const wanted = show ?? all.map((_, i) => i);
    let out = "";
    let last = -1;
    for (const i of wanted) {
      if (last >= 0 && i > last + 1) out += `<div class="gap">⋯ ${i - last - 1} lines not from this</div>`;
      if (last < 0 && i > 0 && show) out += `<div class="gap">⋯ ${i} lines above</div>`;
      const a = attrs(i);
      out += `<div class="ln ${a.cls}" ${a.data}><span class="n">${i + first}</span><span class="t">${tokens(all[i] ?? "") || " "}</span></div>`;
      last = i;
    }
    if (show && last >= 0 && last < all.length - 2) out += `<div class="gap">⋯ ${all.length - 1 - last} lines below</div>`;
    return out;
  };

  /** The thing's machine: states as boxes in a row, moves as arcs between them, this operation's moves lit. */
  const machine = (m, label) => {
    const moves = Object.entries(m.moves);
    const creates = moves.some(([, mv]) => mv.from.length === 0);
    const nodes = [...(creates ? ["(new)"] : []), ...m.states];
    const W = 150;
    const gapX = 70;
    const width = 24 + nodes.length * (W + gapX) - gapX + 24;
    const midY = 120;
    const x = (n) => 24 + nodes.indexOf(n) * (W + gapX);
    const edges = [];
    for (const [key, mv] of moves) for (const f of mv.from.length === 0 ? ["(new)"] : mv.from) for (const t of mv.to) edges.push({ key, f, t, emits: mv.emits });
    const seen = {};
    let paths = "";
    let labels = "";
    for (const e of edges) {
      const lit = e.key === m.lit;
      const pair = `${e.f}>${e.t}`;
      const nth = (seen[pair] = (seen[pair] ?? 0) + 1) - 1;
      const cls = lit ? "lit" : "dim";
      if (e.f === e.t) {
        const cx = x(e.f) + W / 2;
        const h = 58 + nth * 22;
        paths += `<path class="${cls}" data-k="${esc(e.key)}" data-f="${esc(e.f)}" data-t="${esc(e.t)}" d="M ${cx - 30} ${midY - 22} C ${cx - 50} ${midY - 22 - h}, ${cx + 50} ${midY - 22 - h}, ${cx + 30} ${midY - 22}" marker-end="url(#arrow-${cls})"/>`;
        labels += `<text class="ml ${cls}" data-k="${esc(e.key)}" x="${cx}" y="${midY - 22 - h * 0.78}" text-anchor="middle">${esc(e.key)}</text>`;
        continue;
      }
      const forward = nodes.indexOf(e.t) > nodes.indexOf(e.f);
      const x1 = forward ? x(e.f) + W : x(e.f);
      const x2 = forward ? x(e.t) : x(e.t) + W;
      const y = forward ? midY - 8 - nth * 10 : midY + 8 + nth * 10;
      const bend = (forward ? -1 : 1) * (26 + Math.abs(x2 - x1) * 0.18 + nth * 16);
      const mx = (x1 + x2) / 2;
      paths += `<path class="${cls}" data-k="${esc(e.key)}" data-f="${esc(e.f)}" data-t="${esc(e.t)}" d="M ${x1} ${y} Q ${mx} ${y + bend * 2} ${x2} ${y}" marker-end="url(#arrow-${cls})"/>`;
      labels += `<text class="ml ${cls}" data-k="${esc(e.key)}" x="${mx}" y="${y + bend + (forward ? -4 : 14)}" text-anchor="middle">${esc(e.key)}</text>`;
    }
    const boxes = nodes
      .map((n) => {
        const touched = edges.some((e) => e.key === m.lit && (e.f === n || e.t === n));
        return `<rect class="st ${touched ? "lit" : ""} ${n === "(new)" ? "new" : ""}" data-s="${esc(n)}" x="${x(n)}" y="${midY - 20}" width="${W}" height="40" rx="8"/><text class="sl" x="${x(n) + W / 2}" y="${midY + 5}" text-anchor="middle">${esc(n === "(new)" ? "not yet made" : n)}</text>`;
      })
      .join("");
    const below = edges.some((e) => e.f !== e.t && nodes.indexOf(e.t) < nodes.indexOf(e.f));
    const height = below ? 250 : 170;
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">
      <style>
        .st { fill: var(--panel); stroke: var(--line); stroke-width: 1.5; }
        .st.lit { stroke: var(--hit-edge); stroke-width: 2.5; }
        .st.new { stroke-dasharray: 5 4; }
        .sl { fill: var(--ink); font: 600 14px var(--sans); }
        path { fill: none; stroke-width: 2; }
        path.dim { stroke: var(--muted); opacity: .45; }
        path.lit { stroke: var(--hit-edge); stroke-width: 3.5; }
        .ml { font: 500 12.5px var(--mono); }
        .ml.dim { fill: var(--muted); }
        .ml.lit { fill: var(--ink); font-weight: 700; }
      </style>
      <defs>
        <marker id="arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill: var(--muted); stroke: none; opacity: .6"/></marker>
        <marker id="arrow-lit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill: var(--hit-edge); stroke: none"/></marker>
      </defs>
      <g transform="translate(0 ${below ? 0 : -10})">${paths}${boxes}${labels}<g class="fx"></g></g>
    </svg>`;
  };

  /** What each output is, in one plain line. */
  const OUTPUTS = {
    model: { name: "Model", caption: "What the compiler understood. Every other output is made from this one file." },
    api: { name: "API", caption: "The HTTP endpoint: its route, what it takes, what it answers, and how it can refuse." },
    handler: { name: "Handler type", caption: "What your handler is given and what it may give back. TypeScript holds you to it." },
    server: { name: "Server", caption: "The Worker that serves the API, with this route wired to your handler." },
    sdk: { name: "SDK", caption: "A typed function another program calls." },
    cli: { name: "CLI", caption: "A command a person types in a terminal." },
    mcp: { name: "MCP", caption: "A tool an AI agent can call, with your description as its help." },
    docs: { name: "Docs", caption: "The reference page people read." },
    portal: { name: "Portal data", caption: "What the portal shows about it." },
    scaffold: { name: "Your handler", caption: "Written once, when the operation is new. After that it is your code, and nothing overwrites it." },
  };
  const ORDER = ["api", "handler", "sdk", "cli", "mcp", "docs", "server", "portal", "model"];

  return { esc, lines, machine, OUTPUTS, ORDER, tokens };
})();
