// The editor: tabs, a file's lines with what the step changed in the gutter, and the split. A generated file the
// trace covers opens beside the blueprint; hovering either side lights the lines of the other that belong to it.
/* exported Editor */
const Editor = (() => {
  const { esc, tokens } = Views;

  /** Lines of `now` not in `before`, by longest common subsequence (small files), else by count. */
  const addedLines = (before, now) => {
    const out = new Set();
    if (!before) return out;
    const n = before.length;
    const m = now.length;
    if (n * m > 4_000_000) {
      const pool = new Map();
      before.forEach((l) => pool.set(l, (pool.get(l) ?? 0) + 1));
      now.forEach((l, i) => (pool.get(l) ? pool.set(l, pool.get(l) - 1) : out.add(i)));
      return out;
    }
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = before[i] === now[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0;
    let j = 0;
    while (j < m) {
      if (i < n && before[i] === now[j]) (i++, j++);
      else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) i++;
      else out.add(j++);
    }
    return out;
  };

  /** What kind of file it is, in the words the crumb bar uses. */
  const kindOf = (path, lines) => {
    if (path.startsWith("generated/")) return { cls: "gen", say: "Generated from the blueprint. Made again on every generate, so never edit it." };
    if (path.startsWith("src/") && /^\/\/ Scaffolded from /.test(lines[0] ?? "")) return { cls: "own", say: "Scaffolded once, when the operation was new. Yours from now on: nothing overwrites it." };
    if (path.startsWith("src/")) return { cls: "own", say: "Your code." };
    if (path.startsWith("blueprint/")) return { cls: "", say: "Blueprint: what you declare. Everything generated comes from here." };
    if (path.startsWith("journeys/")) return { cls: "", say: "A journey: what must be true, written by a different agent from the builder." };
    return { cls: "", say: "" };
  };

  const listing = (lines, { added = new Set(), cls = () => "", data = () => "" } = {}) =>
    lines.map((l, i) => `<div class="ln ${added.has(i) ? "add" : ""} ${cls(i)}" data-i="${i}" ${data(i)}><span class="g"></span><span class="n">${i + 1}</span><span class="t">${tokens(l) || " "}</span></div>`).join("");

  /** One editor group: its tabs, its crumb bar and its lines. */
  const group = ({ id, tabs, active, lines, added, crumb, seg, cls, data, label }) => `
    <div class="group" data-group="${id}">
      <div class="tabs" role="tablist" aria-label="${esc(label)}">${tabs.map((p) => `<div class="tab ${p === active ? "on" : ""}" role="tab" aria-selected="${p === active}" data-tab="${esc(p)}" data-g="${id}" tabindex="0">${esc(p.split("/").at(-1))}${id === "main" ? `<span class="x" data-close="${esc(p)}" title="Close">×</span>` : ""}</div>`).join("")}</div>
      <div class="crumb ${crumb.cls}"><span class="mono">${esc(active ?? "")}</span><span>${esc(crumb.say)}</span>${seg ?? ""}</div>
      <div class="code ${crumb.cls === "gen" ? "gen" : ""}" data-code="${id}">${lines ? listing(lines, { added, cls, data }) : `<div class="empty">No file open.</div>`}</div>
    </div>`;

  /** Lines of a generated file whose text is the traced render's, with what each line came from; else nothing. */
  const provenance = (W, path, text) => {
    const f = W.files.get(path);
    return f && f.lines.join("\n").replace(/\n$/, "") === text.replace(/\n$/, "") ? f : undefined;
  };

  /** The blueprint file most of a generated file's lines came from: where the split opens. */
  const mainSource = (W, f) => {
    const tally = new Map();
    for (const from of Object.values(f.from)) for (const a of from) if (a >= 0 && W.A[a].file) tally.set(W.A[a].file, (tally.get(W.A[a].file) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };

  return { addedLines, kindOf, group, provenance, mainSource, listing };
})();
