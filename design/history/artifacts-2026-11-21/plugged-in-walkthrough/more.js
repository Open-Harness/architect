// The sections after the generated outputs: the handler that is yours, what the runtime does, and what is proposed.
/* global Views, Sections */
/* exported More */
const More = (() => {
  const { esc, lines, machine } = Views;

  const what = (W, op) => {
    const m = op.machine;
    const lit = m?.lit ? `Its move, <b>${esc(m.lit)}</b>, is lit.` : "It makes no move, so nothing is lit.";
    return `<section class="panel">
      <div class="section-head"><h2>${esc(op.name)}</h2><p>${esc(op.description)}</p></div>
      ${m ? `<div class="machine"><p class="muted">The ${esc(op.thing)}'s lifecycle, from its machine. Boxes are the states it can be in; arrows are the moves between them. ${lit}</p>${machine(m, `The ${op.thing} machine: states ${m.states.join(", ")}; ${op.name} moves along ${m.lit ?? "nothing"}`)}</div>` : `<p class="muted">The ${esc(op.thing)} has no machine: it has no states to move between.</p>`}
    </section>`;
  };

  /** Three versions of the handler: as scaffolded today, as K16 proposes, and as an author filled it in. */
  const yours = (W, op, tab) => {
    const today = op.primary.scaffold ? W.files.get(op.primary.scaffold) : undefined;
    const k16 = W.D.k16;
    const example = k16.status === "found" ? k16.examples.find((e) => /\/verbs\//.test(e.from)) : undefined;
    const tabs = [
      ["today", "Today's scaffold", true],
      ["k16", "K16, proposed", true],
      ["filled", "Filled in by its author", Boolean(op.handler?.filled)],
    ];
    const tabBar = `<div class="tabs" role="tablist">${tabs.map(([id, label, on]) => `<button role="tab" data-tab="${id}" aria-selected="${tab === id}" ${on ? "" : "disabled"}>${esc(label)}</button>`).join("")}</div>`;
    let body = "";
    if (tab === "today") {
      body = today
        ? `<p class="muted">What <code>ortho</code> writes into <code>src/</code> the first time this operation exists, rendered now by m1's generator. The blanks are where your code goes.</p>${Sections.fileBlock(W, op.primary.scaffold)}`
        : `<p class="muted">This operation has no scaffold: its handler lives in a plugin's package.</p>`;
    } else if (tab === "k16") {
      if (k16.status !== "found") body = `<p class="muted">K16 has not been pushed yet (looked for ${esc(k16.ref)}). Rerunning the script picks it up.</p>`;
      else if (!example) body = `<p class="muted">K16 is on ${esc(k16.ref)} but has no worked example yet.</p>`;
      else {
        const same = example.from === op.file;
        body = `<div class="card prop"><div class="card-head"><h3>${esc(k16.title)} <span class="chip prop">Proposed, not built</span></h3></div>
          <p class="muted">The scaffold K16 proposes, copied from its record (${esc(k16.path)} on ${esc(k16.ref.replace("origin/", ""))} @ ${Sections.short(k16.sha)}). ${same ? "" : `Its worked example is acme's <b>${esc(example.from.replace(/^blueprint\/things\//, "").replace("/verbs/", ".").replace(/\.ts$/, ""))}</b>, not this operation: no Plugged In example exists yet.`} Nothing here is generated today.</p>
          <div class="file"><div class="file-head"><span>${esc(example.file ?? `as scaffolded from ${example.from}`)}</span><span>${example.lines.length} lines</span></div><div class="code">${lines(example.lines)}</div></div></div>`;
      }
    } else if (op.handler?.filled) {
      body = `<p class="muted">The same file after its author wrote the handler: Codex, on ${esc(W.D.meta.source.ref.replace("origin/", ""))} (${esc(W.D.meta.source.label)}). This is what "yours from now on" means: ortho never writes this file again.</p>
        <div class="file"><div class="file-head"><span>${esc(W.D.meta.folder)}/${esc(op.handler.path)}</span><span>written by hand</span></div><div class="code">${lines(op.handler.lines)}</div></div>`;
    }
    return `<section class="card own" data-card="scaffold">
      <div class="card-head"><h3>Your handler <span class="chip own">Yours from now on</span></h3><span class="count" data-count></span></div>
      <p class="muted">${esc(Views.OUTPUTS.scaffold.caption)}</p>${tabBar}${body}</section>`;
  };

  const PHASES = { before: "Before your code", handler: "Your code", after: "After your code" };

  /** The wrapper the runtime puts around every handler, in order, with whether each step runs for this operation. */
  const runtime = (W, op) => {
    const facts = new Map(op.runtime.map((r) => [r.id, r]));
    const rows = W.D.runtime.map((s) => {
      const f = facts.get(s.id);
      const range = s.endLine > s.line ? `${s.line}–${s.endLine}` : `${s.line}`;
      return `<div class="step ${f?.runs ? "" : "off"} ${s.phase === "handler" ? "handler" : ""}">
        <span class="phase">${PHASES[s.phase]}</span>
        <div style="display:grid; gap:4px; min-width:0">
          <div class="row"><span>${esc(s.caption)}</span></div>
          <div class="row"><span class="chip ${f?.runs ? "ok" : "skip"}">${f?.runs ? "runs" : "skipped"}: ${esc(f?.why ?? "")}</span></div>
          <details><summary class="mono">${esc(s.file)}:${range}</summary><div class="file"><div class="code">${lines(s.code, { first: s.line })}</div></div></details>
        </div></div>`;
    });
    return `<section class="panel">
      <div class="section-head"><h2>What the runtime does for you</h2><p class="muted">Every call goes through this wrapper. Your handler is one step in the middle; the rest you never write. Read from m1's source, with the lines each step is.</p></div>
      <div class="steps">${rows.join("")}</div></section>`;
  };

  /** What K16 says the blueprint could handle for you but nothing handles yet. Only from K16's own record. */
  const proposed = (W) => {
    const k16 = W.D.k16;
    if (k16.status !== "found") return `<section class="card prop"><h3>Proposed, not built <span class="chip prop">proposed</span></h3><p class="muted">K16 isn't pushed yet (${esc(k16.ref)}). This section fills from its pre-handling map when it is.</p></section>`;
    const [head, ...body] = k16.preHandling;
    const source = `${esc(k16.path)} on ${esc(k16.ref.replace("origin/", ""))} @ ${Sections.short(k16.sha)}`;
    if (!head) return `<section class="card prop"><h3>What the blueprint could also do for you <span class="chip prop">proposed</span></h3><p class="muted">K16's record (${source}) has no pre-handling map yet. When it does, rerunning the script lists it here, marked proposed.</p></section>`;
    // K16's map says where each item stands. A row is built only when it says done and names no milestone or "later";
    // a row that is half done (done at run time, at compile time in M1.44) stays with the proposals.
    const md = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/⚑ ?/g, "");
    const isDone = (r) => /^done\b/i.test(r[2] ?? "") && !/\bM\d+\.\d+|\blater\b/.test(r[2] ?? "");
    const table = (rows) => `<div class="tablewrap"><table><thead><tr>${head.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${md(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    const todo = body.filter((r) => !isDone(r));
    const done = body.filter(isDone);
    return `<section class="card prop"><div class="card-head"><h3>What the blueprint could also do for you <span class="chip prop">Proposed, not built</span></h3><span class="count">${todo.length} proposed · ${done.length} done today</span></div>
      <p class="muted">From K16's map of everything the blueprint can handle before or after your code (${source}). These ${todo.length} rows are proposals: none of them happens today.</p>
      ${table(todo)}
      <details><summary>The ${done.length} rows K16 marks done, which the runtime does today</summary>${table(done)}</details>
    </section>`;
  };

  return { what, yours, runtime, proposed };
})();
