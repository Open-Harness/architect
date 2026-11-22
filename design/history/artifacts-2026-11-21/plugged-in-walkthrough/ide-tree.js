// The explorer: the project's files after a step, as a tree. What the step added or changed is marked, as git marks it.
/* exported Tree */
const Tree = (() => {
  const { esc } = Views;

  /** Nested folders from flat paths. */
  const build = (paths) => {
    const root = { dirs: new Map(), files: [] };
    for (const p of paths) {
      const parts = p.split("/");
      let node = root;
      for (const d of parts.slice(0, -1)) {
        if (!node.dirs.has(d)) node.dirs.set(d, { dirs: new Map(), files: [] });
        node = node.dirs.get(d);
      }
      node.files.push(p);
    }
    return root;
  };

  /** Which folders start open: the top ones, the open file's, and the step's changes when there are few enough to read. */
  const expandedFor = (step, open) => {
    const out = new Set(["blueprint", "src", "journeys"]);
    const up = (p) => {
      const parts = p.split("/");
      for (let i = 1; i < parts.length; i++) out.add(parts.slice(0, i).join("/"));
    };
    if (open) up(open);
    const touched = [...step.added, ...step.changed];
    if (touched.length <= 24) touched.forEach(up);
    return out;
  };

  const TAGS = { generated: ["gen", "made for you"], src: ["own", "yours"] };

  const render = (el, { step, open, expanded, removedShown = true }) => {
    const added = new Set(step.added);
    const changed = new Set(step.changed);
    const root = build(step.files.map(([p]) => p));
    const counts = (dir) => {
      let n = 0;
      for (const p of [...added, ...changed]) if (p.startsWith(dir + "/")) n++;
      return n;
    };
    let html = "";
    const walk = (node, prefix, depth) => {
      for (const [name, sub] of [...node.dirs.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const path = prefix ? `${prefix}/${name}` : name;
        const isOpen = expanded.has(path);
        const n = counts(path);
        const tag = depth === 0 && TAGS[name] ? `<span class="tag ${TAGS[name][0]}">${TAGS[name][1]}</span>` : "";
        html += `<div class="row" style="--d:${depth}" data-dir="${esc(path)}" role="treeitem" aria-expanded="${isOpen}" tabindex="0"><span class="tw">${isOpen ? "▾" : "▸"}</span><span class="name">${esc(name)}</span>${tag}${n ? `<span class="badge A" title="${n} new or changed in this step">${n}</span>` : ""}</div>`;
        if (isOpen) walk(sub, path, depth + 1);
      }
      for (const p of node.files.sort()) {
        const name = p.split("/").at(-1);
        const mark = added.has(p) ? "A" : changed.has(p) ? "M" : "";
        html += `<div class="row ${p === open ? "open-file" : ""} ${mark ? "fresh" : ""}" style="--d:${depth}" data-file="${esc(p)}" role="treeitem" tabindex="0"><span class="tw"></span><span class="name">${esc(name)}</span>${mark ? `<span class="badge ${mark}" title="${mark === "A" ? "added" : "changed"} in this step">${mark}</span>` : ""}</div>`;
      }
    };
    walk(root, "", 0);
    if (removedShown && step.removed.length) {
      html += `<h2>Removed in this step</h2>` + step.removed.map((p) => `<div class="row removed" style="--d:0"><span class="tw"></span><span class="name">${esc(p)}</span><span class="badge D">D</span></div>`).join("");
    }
    el.innerHTML = `<h2>Explorer · plugged-in</h2><div class="tree" role="tree">${html}</div>`;
  };

  return { render, expandedFor };
})();
