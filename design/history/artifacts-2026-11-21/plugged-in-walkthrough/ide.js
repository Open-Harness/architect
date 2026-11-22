// The walkthrough as an editor: one step at a time, from the first command to a passing prove. Everything shown is
// read from walkthrough.json, which the spike's script makes by running the real commands.
(() => {
  const $ = (id) => document.getElementById(id);
  const { esc } = Views;
  const S = { i: 0, view: "today", tabs: [], active: null, split: true, mode: null, panel: "terminal", folded: false, playing: false, trace: 0, expanded: new Set(), src: null, stops: [] };
  let D;
  let W;

  const lines = (text) => (text ?? "").replace(/\n$/, "").split("\n");
  const fileAt = (i, path) => {
    const hit = D.steps[i]?.files.find(([p]) => p === path);
    return hit ? D.blobs[hit[1]] : undefined;
  };
  const stop = () => (S.stops.forEach((f) => f()), (S.stops = []));
  const step = () => D.steps[S.i];
  const stepIndex = (id) => D.steps.findIndex((s) => s.id === id);

  // ---- The step strip.
  const renderSteps = () => {
    const s = step();
    $("steps").innerHTML = `
      <div class="top"><h1>${esc(s.title)}</h1><span class="count">step ${S.i + 1} of ${D.steps.length}</span>
        <button class="mobile-files" data-act="files">Files</button>
        <div class="nav"><button data-act="back" ${S.i === 0 ? "disabled" : ""}>← Back</button>
          <button data-act="play">${S.playing ? "Pause" : "Play all"}</button>
          <button class="primary" data-act="next" ${S.i === D.steps.length - 1 ? "disabled" : ""}>Next →</button></div></div>
      <p class="caption">${esc(s.caption)}</p>
      ${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}
      ${D.proposals?.status === "found" && D.proposals.steps.some((p) => p.step === s.id) ? `<p class="note prop-note">K1 designed flags so this step says what you already know. They aren't built yet: see "K1 proposed" above the terminal.</p>` : ""}
      <div class="dots">${D.steps.map((x, j) => `<button class="${j === S.i ? "on" : j < S.i ? "done" : ""}" data-step="${j}" title="${esc(x.title)}">${j + 1}. ${esc(x.title)}</button>`).join("")}</div>`;
  };

  // ---- The explorer.
  const renderTree = () => Tree.render($("side"), { step: step(), open: S.active, expanded: S.expanded });

  // ---- The editor, split when a traced generated file is open.
  const renderEditors = () => {
    const s = step();
    S.tabs = S.tabs.filter((p) => fileAt(S.i, p) !== undefined);
    if (S.active && !S.tabs.includes(S.active)) S.active = S.tabs.at(-1) ?? null;
    const text = S.active ? fileAt(S.i, S.active) : undefined;
    const before = S.active && S.i > 0 ? fileAt(S.i - 1, S.active) : undefined;
    let shown = lines(text);
    let crumb = Editor.kindOf(S.active ?? "", shown);
    let added = s.changed.includes(S.active) ? Editor.addedLines(before && lines(before), shown) : new Set();

    // A handler the generator scaffolded: today's scaffold, K16's proposal, and the filled one, side by side in time.
    const gen = stepIndex("generate");
    const scaffold = S.active?.startsWith("src/") && S.i >= gen ? fileAt(gen, S.active) : undefined;
    let seg = "";
    if (scaffold && /^\/\/ Scaffolded from /.test(scaffold)) {
      const filled = S.i >= stepIndex("handlers");
      const mode = S.mode ?? (filled ? "filled" : "today");
      const k16 = D.k16.status === "found" ? D.k16.examples[0] : null;
      const b = (m, label) => `<button class="${m === mode ? "on" : ""}" data-mode="${m}"><span>${label}</span></button>`;
      seg = `<span class="seg">${b("today", "Scaffold today")}${k16 ? b("k16", "K16 proposed") : ""}${filled ? b("filled", "Filled") : ""}</span>`;
      if (mode === "today") (shown = lines(scaffold)), (added = new Set());
      if (mode === "k16" && k16) {
        shown = k16.lines;
        added = new Set();
        crumb = { cls: "prop", say: `Proposed in K16, not built yet. This is K16's own worked example (acme's ${k16.from.split("/").slice(-3, -2)[0]}.${k16.from.split("/").at(-1).replace(".ts", "")}), not Plugged In's.` };
      }
    }

    const f = text !== undefined && S.active ? Editor.provenance(W, S.active, text) : undefined;
    const split = f && S.split && seg === "";
    const main = Editor.group({
      id: "main", label: "Open files", tabs: S.tabs, active: S.active, lines: S.active ? shown : null, added, crumb, cls: () => "",
      seg: seg || (f ? `<span class="seg"><button class="${S.split ? "on" : ""}" data-act="split"><span>Beside its blueprint</span></button></span>` : ""),
      data: (i) => (f ? `data-p="${i}"` : ""),
    });
    if (!split) {
      $("editors").className = "editors";
      $("editors").innerHTML = main;
      return;
    }
    S.src = S.src && fileAt(S.i, S.src) !== undefined ? S.src : Editor.mainSource(W, f);
    $("editors").className = "editors split";
    $("editors").innerHTML = leftGroup() + main;
  };

  /** The blueprint side of the split, for `S.src`. */
  const leftGroup = () =>
    Editor.group({ id: "src", label: "Blueprint", tabs: S.src ? [S.src] : [], active: S.src, lines: S.src ? lines(fileAt(S.i, S.src)) : null, added: new Set(), crumb: { cls: "", say: "The blueprint. Hover a line on either side to see what goes with it." }, data: (i) => `data-b="${i + 1}"` });

  const open = (path) => {
    if (!path) return;
    if (!S.tabs.includes(path)) S.tabs = [...S.tabs.slice(-5), path];
    S.active = path;
    S.mode = null;
    S.src = null;
    const parts = path.split("/");
    for (let k = 1; k < parts.length; k++) S.expanded.add(parts.slice(0, k).join("/"));
    renderTree();
    renderEditors();
  };

  /** Open `path` and light lines `from` to `to` (1-based), scrolled into view. */
  const reveal = (path, from, to) => {
    open(path);
    const lit = [...document.querySelectorAll('[data-code="main"] .ln')].slice(from - 1, to);
    lit.forEach((el) => el.classList.add("hit"));
    lit[0]?.scrollIntoView({ block: "center" });
  };

  // ---- The panel: terminal, traces, machines.
  const tabsFor = () => ({ terminal: true, trace: S.i >= stepIndex("prove"), machines: S.i >= stepIndex("blueprint") });
  const renderPanel = (opts = {}) => {
    stop();
    const ok = tabsFor();
    if (!ok[S.panel]) S.panel = "terminal";
    const label = { terminal: "Terminal", trace: "Traces", machines: "Machines" };
    $("panel").className = `panel ${S.folded ? "folded" : ""}`;
    $("panel").innerHTML = `<div class="ptabs" role="tablist">${Object.keys(label).map((k) => `<button role="tab" class="${S.panel === k ? "on" : ""}" data-panel="${k}" ${ok[k] ? "" : "disabled title=\"comes later\""}>${label[k]}</button>`).join("")}
      <button class="fold" data-act="fold">${S.folded ? "▴ Show panel" : "▾ Fold"}</button></div><div class="pbody" id="pbody"></div>`;
    const body = $("pbody");
    const proposal = D.proposals?.status === "found" ? D.proposals.steps.find((p) => p.step === step().id) : undefined;
    if (proposal) $("panel").querySelector(".fold").insertAdjacentHTML("beforebegin", `<span class="seg view">${["today", "k1"].map((v) => `<button class="${(S.view === v) ? "on" : ""}" data-view="${v}">${v === "today" ? "Today on m1" : "K1 proposed"}</button>`).join("")}</span>`);
    if (S.panel === "terminal" && proposal && S.view === "k1") {
      body.innerHTML = Terminal.proposed(proposal, D.proposals);
      opts.done?.();
    } else if (S.panel === "terminal") {
      body.innerHTML = `<div class="term" id="term"></div>`;
      S.stops.push(Terminal.play($("term"), D.steps.slice(0, S.i), step(), { instant: opts.instant, done: opts.done ?? (() => {}) }));
    } else if (S.panel === "trace") {
      body.innerHTML = `<div class="tr"><div class="tr-list">${Traces.list(D.traces, S.trace)}</div><div class="tr-main" id="wf">${Traces.waterfall(D.traces[S.trace], D.runtime)}</div></div>`;
      body.querySelector(".ti.on")?.scrollIntoView({ block: "nearest" });
      S.stops.push(Traces.animate($("wf"), D.traces[S.trace], { done: opts.done }));
    } else {
      const proved = S.i >= stepIndex("prove");
      body.innerHTML = `<div class="mx-wrap" id="mx"></div>`;
      Machines.render($("mx"), D.operations, `${proved ? "prove's run, replayed: each call moves its thing when it really happened, eight times slower. Refusals shake the state they were refused in." : "Each thing's machine, walked one move at a time."} Each is drawn from the machine you write in the blueprint, through the compiled model: click a machine, a state or a move to open where it is written.`, D.anchors);
      S.stops.push(proved ? Machines.replay($("mx"), D.traces, D.operations, { done: opts.done }) : Machines.walk($("mx")));
      if (!proved && opts.done) setTimeout(opts.done, 4500);
    }
  };

  const renderStatus = () => {
    const m = D.meta;
    $("status").innerHTML = `<span>m1 ${esc(m.m1.sha.slice(0, 8))}</span><span>Blueprint: Codex's ${esc(m.source.label)}, copied in from ${esc(m.source.ref.replace("origin/", ""))} @ ${esc(m.source.sha.slice(0, 8))}</span>
      <span>${m.counts.attributed.toLocaleString()} of ${m.counts.lines.toLocaleString()} generated lines traced to their declaration</span><a class="sp" href="detail.html">Every operation, in detail ↗</a>`;
  };

  // After a step's terminal is done, the panel that tells the rest of it.
  const AFTER = { blueprint: "machines", prove: "machines", trace: "trace" };

  const go = (i, { auto = false } = {}) => {
    S.i = Math.max(0, Math.min(D.steps.length - 1, i));
    $("tip").hidden = true;
    const s = step();
    S.panel = "terminal";
    if (s.id === "trace") S.trace = Math.max(0, D.traces.findIndex((t) => s.runs[0]?.command.endsWith(t.id)));
    S.expanded = Tree.expandedFor(s, s.open);
    if (s.open) open(s.open);
    else (renderTree(), renderEditors());
    renderSteps();
    document.querySelector(".dots .on")?.scrollIntoView({ block: "nearest", inline: "center" });
    history.replaceState(null, "", `#step-${s.id}`);
    const next = () => S.playing && setTimeout(() => S.playing && S.i === i && go(S.i + 1, { auto: true }), 2200);
    const after = AFTER[s.id];
    renderPanel({
      done: () => {
        if (!after) return next();
        S.panel = after;
        renderPanel({ done: next });
      },
    });
    if (S.i === D.steps.length - 1 && auto) S.playing = false;
  };

  Wire.attach({ S, $, go, open, reveal, renderTree, renderEditors, leftGroup, renderPanel, renderSteps, get D() { return D; }, get W() { return W; } });

  const load = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
  load("walkthrough.json")
    .catch(() => load("../data/walkthrough.json"))
    .then((data) => {
      D = data;
      W = Wire.index(D);
      renderStatus();
      const fromHash = () => stepIndex((location.hash.match(/^#step-(.+)$/) ?? [])[1]);
      addEventListener("hashchange", () => fromHash() >= 0 && fromHash() !== S.i && go(fromHash()));
      go(Math.max(0, fromHash()));
    })
    .catch((e) => ($("editors").innerHTML = `<div class="empty">Couldn't load walkthrough.json: ${esc(e.message)}</div>`));
})();
