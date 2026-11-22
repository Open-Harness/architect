// The page: loads the data file, keeps the selection, and links every line to where it came from.
/* global Views, Sections, More */
(() => {
  const app = document.getElementById("app");
  const tip = document.getElementById("tip");
  const state = { mode: "op", op: "handle.claim", block: null, pin: null, tab: "today" };
  let W;

  const index = (D) => {
    const files = new Map(D.files.map((f) => [f.path, f]));
    const bp = new Map(D.blueprint.map((f) => [f.path, f]));
    const children = new Map();
    D.anchors.forEach((a, i) => {
      if (a.parent === undefined) return;
      const p = D.anchors.findIndex((b) => b.id === a.parent);
      if (p >= 0) children.set(p, [...(children.get(p) ?? []), i]);
    });
    const byFile = new Map();
    D.anchors.forEach((a, i) => byFile.set(a.file, [...(byFile.get(a.file) ?? []), i]));
    const descendants = (i) => {
      const out = new Set([i]);
      const walk = (j) => (children.get(j) ?? []).forEach((k) => (out.add(k), walk(k)));
      walk(i);
      return out;
    };
    const size = (i) => D.anchors[i].endLine - D.anchors[i].line;
    const innermost = (file, line) => {
      let best = -1;
      for (const i of byFile.get(file) ?? []) {
        const a = D.anchors[i];
        if (a.line <= line && line <= a.endLine && (best < 0 || size(i) < size(best))) best = i;
      }
      return best;
    };
    const where = (i) => {
      const a = D.anchors[i];
      return a.kind === "project" ? `${D.meta.folder}/` : `${a.file.split("/").slice(-2).join("/")}:${a.line}`;
    };
    return { D, A: D.anchors, files, bp, children, byFile, descendants, innermost, where, size };
  };

  /** The blueprint files an operation reads from: its verb file, its thing's files, then anything else it names. */
  const opFiles = (op) => {
    const dir = `blueprint/things/${op.thing}/`;
    const own = ["thing.ts", "machine.ts", "events.ts", "errors.ts", "roles.ts"].map((f) => dir + f).filter((p) => W.bp.has(p));
    const named = [...new Set(op.related.map((i) => W.A[i].file))].filter((p) => p && W.bp.has(p)).sort();
    return [...new Set([op.file, ...own, ...named])];
  };

  const render = () => {
    const D = W.D;
    let leftHtml = "";
    let rightHtml = "";
    if (state.mode === "op") {
      const op = D.operations.find((o) => o.name === state.op) ?? D.operations[0];
      state.op = op.name;
      leftHtml = Sections.left(W, opFiles(op), true);
      rightHtml = `${More.what(W, op)}
        <div class="section-head"><h2>Generated <span class="chip gen">regenerated every time</span></h2><p class="muted">Made from the blueprint on every change. Never edit these: the next change writes them again.</p></div>
        ${Sections.generated(W, op)}
        <div class="section-head"><h2>Scaffolded <span class="chip own">yours from now on</span></h2><p class="muted">Written once, then never touched again.</p></div>
        ${More.yours(W, op, state.tab)}
        ${More.runtime(W, op)}
        ${More.proposed(W)}`;
    } else {
      const i = state.block;
      const a = W.A[i];
      const files = [...new Set([a.file, ...(a.refers ?? []).map((r) => W.A[W.A.findIndex((b) => b.id === r)]?.file)].filter((p) => p && W.bp.has(p)))];
      leftHtml = Sections.left(W, files, a.kind === "project");
      const S = W.descendants(i);
      const reach = D.files
        .map((f) => ({ f, show: Object.keys(f.from).map(Number).filter((k) => f.from[k].some((s) => S.has(s))) }))
        .filter((x) => x.show.length > 0 || x.f.made.some((s) => S.has(s)));
      const outcome = a.outcome ?? {};
      const said = outcome.result === "refused" ? `The compiler would not take a change to it on its own (${outcome.problem}), so its lines could not be found.`
        : outcome.result === "whole" ? "It is the sum of its parts: these are its parts' lines."
        : `Changing it moved ${Sections.n(outcome.lines)} output lines in ${reach.length} files.`;
      rightHtml = `<section class="panel"><div class="section-head"><h2>${Views.esc(a.label)}</h2><p class="mono muted">${Views.esc(D.meta.folder)}/${Views.esc(a.file || "")}${a.line ? `:${a.line}` : ""}</p><p>${Views.esc(said)}</p></div></section>
        ${Views.ORDER.concat("scaffold").map((o) => {
          const blocks = reach.filter((x) => x.f.output === o).map((x) => ({ path: x.f.path, show: x.show.length === x.f.lines.length ? undefined : x.show }));
          return blocks.length ? Sections.card(W, o, blocks) : "";
        }).join("")}`;
    }
    app.innerHTML = `${Sections.header(W)}${Sections.controls(W, state)}
      <div class="main"><aside class="left">${leftHtml}</aside><div class="right">${rightHtml}</div></div>`;
    wire();
    highlight(state.pin);
  };

  // Line lookups built after each render: an anchor's output lines, and its blueprint lines.
  let outBy = new Map();
  let leftBy = new Map();
  const wire = () => {
    outBy = new Map();
    leftBy = new Map();
    app.querySelectorAll(".ln[data-f]").forEach((el) => {
      const from = W.files.get(el.dataset.f)?.from[el.dataset.i] ?? [];
      for (const a of from) outBy.set(a, [...(outBy.get(a) ?? []), el]);
    });
    app.querySelectorAll(".ln[data-bf]").forEach((el) => {
      const f = el.dataset.bf;
      const l = Number(el.dataset.l);
      for (const i of W.byFile.get(f) ?? []) {
        const a = W.A[i];
        if (a.line <= l && l <= a.endLine) leftBy.set(i, [...(leftBy.get(i) ?? []), el]);
      }
    });
  };

  let marked = [];
  const mark = (el, cls) => (el.classList.add(cls), marked.push([el, cls]));
  const clear = () => {
    for (const [el, cls] of marked) el.classList.remove(cls);
    marked = [];
    app.querySelectorAll("[data-count]").forEach((c) => (c.textContent = ""));
  };

  /** Light every output line an anchor (or any of its parts) makes, and the blueprint lines it is. */
  const highlight = (i) => {
    clear();
    if (i === null || i === undefined || i < 0) return;
    const S = W.descendants(i);
    for (const a of S) for (const el of outBy.get(a) ?? []) mark(el, "hit");
    for (const a of S) for (const el of leftBy.get(a) ?? []) mark(el, "src");
    for (const r of W.A[i].refers ?? []) for (const el of leftBy.get(W.A.findIndex((b) => b.id === r)) ?? []) mark(el, "ref");
    app.querySelectorAll(".file-head[data-made]").forEach((h) => h.dataset.made.split(",").some((m) => S.has(Number(m))) && mark(h, "hit"));
    if (state.pin === i) for (const el of leftBy.get(i) ?? []) mark(el, "pin");
    app.querySelectorAll("[data-card]").forEach((c) => {
      const hits = c.querySelectorAll(".ln.hit").length;
      const count = c.querySelector("[data-count]");
      if (count) count.textContent = hits ? `${hits} line${hits === 1 ? "" : "s"} from ${W.A[i].label}` : "";
    });
  };

  /** Light the blueprint lines an output line came from. */
  const showSources = (el) => {
    clear();
    const f = W.files.get(el.dataset.f);
    const from = f?.from[el.dataset.i] ?? [];
    for (const a of from) for (const s of leftBy.get(a) ?? []) mark(s, "src");
    mark(el, "hit");
    return { f, from };
  };

  const sourceWords = (f, from, i) => {
    if (from.includes(-1)) return ["Changes whenever anything in the blueprint changes: a fingerprint of the whole."];
    if (from.length === 0 && f.same?.includes(Number(i))) return [`The same in every operation's file of this kind: the generator's own words, from ${W.D.meta.generators[f.output]}.`];
    if (from.length === 0) return ["Not traced. No single change moved this line, so its source isn't known.", "It may be the generator's own, or come from a part of a declaration this run doesn't change, such as an id's prefix."];
    return from.slice().sort((x, y) => W.size(x) - W.size(y)).slice(0, 5).map((a) => `${W.where(a)} · ${W.A[a].label}`);
  };

  const showTip = (e, linesOf) => {
    tip.innerHTML = linesOf.map((l, k) => `<div${k === 0 ? "" : ' class="muted"'}>${Views.esc(l)}</div>`).join("");
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    const y = e.clientY + 18 + tip.offsetHeight > window.innerHeight ? e.clientY - tip.offsetHeight - 10 : e.clientY + 18;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${y}px`;
  };

  const anchorOfLeft = (el) => (el.dataset.bf === "" ? W.A.findIndex((a) => a.kind === "project") : W.innermost(el.dataset.bf, Number(el.dataset.l)));

  app.addEventListener("mouseover", (e) => {
    const el = e.target.closest(".ln");
    if (!el) return;
    if (el.dataset.f !== undefined) {
      const { f, from } = showSources(el);
      showTip(e, sourceWords(f, from, el.dataset.i));
    } else if (el.dataset.bf !== undefined) {
      const a = anchorOfLeft(el);
      if (a < 0) return;
      highlight(a);
      const o = W.A[a].outcome ?? {};
      showTip(e, [W.A[a].label, o.result === "refused" ? `Not traced: ${o.problem}` : o.result === "whole" ? "The sum of its parts" : `Makes ${o.lines} output lines`]);
    }
  });
  app.addEventListener("mousemove", (e) => !tip.hidden && e.target.closest(".ln") && showTip(e, [...tip.children].map((c) => c.textContent)));
  app.addEventListener("mouseout", (e) => {
    if (!e.target.closest(".ln") || e.relatedTarget?.closest?.(".ln")) return;
    tip.hidden = true;
    highlight(state.pin);
  });
  app.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) {
      state.tab = tab.dataset.tab;
      render();
      return;
    }
    const el = e.target.closest(".ln");
    if (!el) return;
    let a = -1;
    if (el.dataset.bf !== undefined) a = anchorOfLeft(el);
    else if (el.dataset.f !== undefined) {
      const from = (W.files.get(el.dataset.f)?.from[el.dataset.i] ?? []).filter((x) => x >= 0);
      a = from.sort((x, y) => W.size(x) - W.size(y))[0] ?? -1;
    }
    state.pin = a >= 0 && state.pin !== a ? a : null;
    highlight(state.pin);
    if (state.pin !== null && el.dataset.f !== undefined) leftBy.get(state.pin)?.[0]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  app.addEventListener("keydown", (e) => e.key === "Enter" && e.target.classList?.contains("ln") && e.target.click());
  app.addEventListener("change", (e) => {
    if (e.target.id === "pick-op" && e.target.value) {
      Object.assign(state, { mode: "op", op: e.target.value, pin: null, tab: "today" });
      location.hash = `op-${state.op.replace(/\./g, "--")}`;
    } else if (e.target.id === "pick-block" && e.target.value !== "") {
      Object.assign(state, { mode: "block", block: Number(e.target.value), pin: Number(e.target.value) });
    } else return;
    render();
  });
  window.addEventListener("hashchange", () => {
    const m = /^#op-(.+)$/.exec(location.hash);
    if (m && m[1].replace(/--/g, ".") !== state.op) Object.assign(state, { mode: "op", op: m[1].replace(/--/g, "."), pin: null }) && render();
  });

  const load = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${url}: ${r.status}`))));
  load("walkthrough.json")
    .catch(() => load("../data/walkthrough.json"))
    .then((D) => {
      W = index(D);
      const m = /^#op-(.+)$/.exec(location.hash);
      if (m) state.op = m[1].replace(/--/g, ".");
      render();
    })
    .catch((err) => {
      app.innerHTML = `<p>Couldn't load the walkthrough data: ${Views.esc(err.message)}. Run <code>node spikes/dx-walkthrough/src/main.ts</code> to make it.</p>`;
    });
})();
