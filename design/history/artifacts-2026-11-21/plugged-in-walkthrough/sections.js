// The page's sections, each from the walkthrough data (W) and the page's state. HTML out; app.js wires the events.
/* global Views */
/* exported Sections */
const Sections = (() => {
  const { esc, lines, OUTPUTS, ORDER } = Views;
  const short = (sha) => sha.slice(0, 8);
  const n = (x) => Number(x).toLocaleString("en-GB");

  const header = (W) => {
    const m = W.D.meta;
    const c = m.counts;
    return `<header class="section-head">
      <h1>Plugged In, from blueprint to everything</h1>
      <p class="muted">On the left, Plugged In's blueprint: Codex's draft, copied in from its branch and renamed for K15, not yet on main. On the right, everything Orthograph makes from it. Hover any line to see where it came from; click to pin it.</p>
      <div class="row">
        <span class="chip prop">Blueprint: Codex's ${esc(m.source.label)}, copied in from ${esc(m.source.ref.replace("origin/", ""))} @ ${short(m.source.sha)}</span>
        <span class="chip">Compiler and generators: ${esc(m.m1.ref.replace("origin/", ""))} @ ${short(m.m1.sha)}</span>
        <span class="chip" title="${esc(m.renames.map((r) => `${r.file}: ${r.why}`).join("\n"))}">Renamed for K15: ${m.renames.length} changes</span>
        ${m.fallback ? `<span class="chip prop">Fallback: ${esc(m.fallback)}</span>` : `<span class="chip ok">Compiled on m1 as written, no fallback</span>`}
      </div>
    </header>
    <div class="stats" aria-label="What this run measured">
      <div class="stat"><b>${n(c.files)}</b><span>files made from the blueprint</span></div>
      <div class="stat"><b>${n(c.attributed)} <small class="muted">of ${n(c.lines)}</small></b><span>output lines traced to a declaration</span></div>
      <div class="stat"><b>${n(c.traced)} <small class="muted">of ${n(c.anchors - c.whole)}</small></b><span>declarations whose lines were found</span></div>
      <div class="stat"><b>${n(c.refused)}</b><span>changes the compiler refused on their own</span></div>
      <div class="stat"><b>${n(Math.round(m.millis.run / 1000))} s</b><span>to regenerate once per declaration</span></div>
    </div>
    <p class="muted">How the links are found: each declaration was changed a little and everything regenerated with the real compiler and generators. The output lines that changed are counted as that declaration's. Nothing on the right was typed by hand.</p>`;
  };

  const KIND_GROUPS = [
    ["Operations", ["operation"]],
    ["Parts of an operation", ["description", "payload", "answer", "move", "refusal", "allowed", "idempotent", "budget", "other"]],
    ["Steps", ["step"]],
    ["Things and their fields", ["thing", "field"]],
    ["Machines, states and moves", ["machine", "state"]],
    ["Events", ["event"]],
    ["Errors and exit codes", ["error", "exit"]],
    ["Roles and rules", ["role", "rule"]],
    ["Visibility", ["visibility"]],
    ["Shared values", ["value"]],
    ["The app", ["project"]],
  ];

  const controls = (W, state) => {
    const ops = W.D.operations;
    const things = [...new Set(ops.map((o) => o.thing))];
    const opOptions = things
      .map((t) => `<optgroup label="${esc(t)}">${ops.filter((o) => o.thing === t).map((o) => `<option value="${esc(o.name)}" ${state.mode === "op" && state.op === o.name ? "selected" : ""}>${esc(o.name)}: ${esc(o.description)}</option>`).join("")}</optgroup>`)
      .join("");
    const blockOptions = KIND_GROUPS.map(([label, kinds]) => {
      const items = W.A.map((a, i) => [a, i]).filter(([a]) => kinds.includes(a.kind) && !(a.kind === "move" && a.op));
      return items.length === 0 ? "" : `<optgroup label="${label}">${items.map(([a, i]) => `<option value="${i}" ${state.mode === "block" && state.block === i ? "selected" : ""}>${esc(a.thing ? `${a.op ?? a.thing}: ` : "")}${esc(a.label)}</option>`).join("")}</optgroup>`;
    }).join("");
    return `<div class="controls">
      <label for="pick-op">An operation<select id="pick-op">${state.mode === "op" ? "" : `<option value="" selected>Pick an operation</option>`}${opOptions}</select></label>
      <label for="pick-block">Or one building block<select id="pick-block"><option value="">Pick a building block</option>${blockOptions}</select></label>
      <div class="legend" aria-label="Legend">
        <span><i style="background: var(--gen); border-color: var(--gen-edge)"></i>Generated: regenerated every time</span>
        <span><i style="background: var(--own); border-color: var(--own-edge)"></i>Scaffolded: yours from now on</span>
        <span><i style="background: var(--prop); border-color: var(--prop-edge); border-style: dashed"></i>Proposed, not built</span>
        <span><i style="background: var(--hit)"></i>made by the selected line</span>
        <span><i style="background: var(--src)"></i>where a line came from</span>
      </div>
    </div>`;
  };

  /** The blueprint files on the left, every line tied to the innermost declaration it is part of. */
  const left = (W, paths, withProject) => {
    const folder = W.D.meta.folder;
    const project = W.A.findIndex((a) => a.kind === "project");
    const projectBlock = withProject
      ? `<div class="file"><div class="file-head"><span>${esc(folder)}/</span><span>the folder</span></div><div class="code"><div class="ln has" data-bf="" data-l="0" tabindex="0"><span class="n">·</span><span class="t">${esc(W.D.meta.slug)}  <span class="c">// the app's name comes from its folder</span></span></div></div></div>`
      : "";
    return `<div class="section-head"><h2>The blueprint</h2><p class="muted">What you write. ${project >= 0 ? "" : ""}Each line is linked to what it makes.</p></div>
      ${paths
        .map((p) => {
          const f = W.bp.get(p);
          if (!f) return "";
          return `<div class="file"><div class="file-head"><span>${esc(folder)}/${esc(p)}</span><span>you write this</span></div><div class="code">${lines(f.lines, {
            attrs: (i) => {
              const a = W.innermost(p, i + 1);
              return { cls: a >= 0 ? "has" : "", data: `data-bf="${esc(p)}" data-l="${i + 1}" ${a >= 0 ? 'tabindex="0"' : ""}` };
            },
          })}</div></div>`;
        })
        .join("")}${projectBlock}`;
  };

  /** One output file, whole or in part, every line tied to the declarations that make it. */
  const fileBlock = (W, path, show) => {
    const f = W.files.get(path);
    if (!f) return "";
    // The file exists for its operation (named by its path) when one made it, else for its thing's folder.
    const made = f.made.filter((i) => i >= 0).sort((x, y) => (W.A[y].kind === "operation") - (W.A[x].kind === "operation")).map((i) => W.A[i].label);
    return `<div class="file"><div class="file-head" data-made="${f.made.join(",")}"><span>${esc(W.D.meta.folder)}/${esc(path)}</span><span>${show ? `${show.length} of ${f.lines.length} lines` : `${f.lines.length} lines`}${made.length ? ` · exists for ${esc(made[0])}` : ""}</span></div><div class="code">${lines(f.lines, {
      show,
      attrs: (i) => {
        const from = f.from[i];
        return { cls: from ? "has" : "tmpl", data: `data-f="${esc(path)}" data-i="${i}"` };
      },
    })}</div></div>`;
  };

  const card = (W, output, blocks, extra = "") => {
    const info = OUTPUTS[output];
    const own = output === "scaffold";
    return `<section class="card ${own ? "own" : "gen"}" data-card="${output}">
      <div class="card-head"><h3>${esc(info.name)} <span class="chip ${own ? "own" : "gen"}">${own ? "Yours from now on" : "Regenerated every time"}</span></h3><span class="count" data-count></span></div>
      <p class="muted">${esc(info.caption)}</p>${extra}
      ${blocks.map((b) => fileBlock(W, b.path, b.show)).join("")}
    </section>`;
  };

  /** The generated outputs of one operation: its own files whole, and the lines of shared files its declarations make. */
  const generated = (W, op) =>
    ORDER.map((output) => {
      const blocks = [];
      if (op.primary[output]) blocks.push({ path: op.primary[output] });
      for (const [path, show] of Object.entries(op.excerpts)) if (W.files.get(path)?.output === output) blocks.push({ path, show });
      return blocks.length === 0 ? "" : card(W, output, blocks);
    }).join("");

  return { header, controls, left, card, generated, fileBlock, n, short };
})();
