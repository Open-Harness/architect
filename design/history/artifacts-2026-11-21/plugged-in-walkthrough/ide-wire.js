// Clicks, keys and hovering. Hovering a generated line lights the blueprint lines it came from; hovering a blueprint
// line lights every generated line it made.
/* exported Wire */
const Wire = (() => {
  const { esc } = Views;

  const index = (D) => {
    const files = new Map(D.files.map((f) => [f.path, f]));
    const byFile = new Map();
    const children = new Map();
    D.anchors.forEach((a, i) => {
      if (a.file) byFile.set(a.file, [...(byFile.get(a.file) ?? []), i]);
      const p = a.parent ? D.anchors.findIndex((b) => b.id === a.parent) : -1;
      if (p >= 0) children.set(p, [...(children.get(p) ?? []), i]);
    });
    const descendants = (i) => {
      const out = new Set([i]);
      const walk = (j) => (children.get(j) ?? []).forEach((k) => (out.add(k), walk(k)));
      walk(i);
      return out;
    };
    const span = (i) => D.anchors[i].endLine - D.anchors[i].line;
    const innermost = (file, line) => (byFile.get(file) ?? []).filter((i) => D.anchors[i].line <= line && line <= D.anchors[i].endLine).sort((a, b) => span(a) - span(b))[0];
    return { files, A: D.anchors, byFile, descendants, innermost, span };
  };

  const attach = (ctx) => {
    const { S, $ } = ctx;
    const tip = $("tip");
    const say = (html, e) => {
      tip.innerHTML = html;
      tip.hidden = false;
      const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
      const y = e.clientY + 18 + tip.offsetHeight > innerHeight ? e.clientY - tip.offsetHeight - 12 : e.clientY + 18;
      tip.style.left = `${Math.max(8, x)}px`;
      tip.style.top = `${y}px`;
    };
    const clear = () => document.querySelectorAll(".ln.hit, .ln.src").forEach((el) => el.classList.remove("hit", "src"));
    const where = (a) => `${a.file}:${a.line}${a.endLine > a.line ? `–${a.endLine}` : ""}`;
    const into = (el) => {
      const box = el.closest(".code");
      const r = el.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      if (r.top < b.top || r.bottom > b.bottom) box.scrollTop += r.top - b.top - b.height / 3;
    };
    /** Show `file` in the left group without touching the right one, so the line under the pointer stays put. */
    const setLeft = (file) => {
      const old = document.querySelector('.group[data-group="src"]');
      if (S.src === file || !old) return;
      S.src = file;
      old.outerHTML = ctx.leftGroup();
    };

    document.addEventListener("mouseover", (e) => {
      const D = ctx.D;
      const W = ctx.W;
      const gl = e.target.closest?.(".ln[data-p]");
      const bl = e.target.closest?.(".ln[data-b]");
      if (!gl && !bl) return;
      clear();
      if (gl) {
        const f = W.files.get(S.active);
        const i = Number(gl.dataset.p);
        const from = f?.from[i] ?? [];
        gl.classList.add("hit");
        if (from.includes(-1)) return say(`<b>Changes with almost any declaration</b><br>It carries the whole blueprint, so no one line made it.`, e);
        const mine = from.filter((a) => a >= 0 && W.A[a].file);
        if (mine.length === 0) return say(f.same?.includes(i) ? `<b>The generator's own words</b><br>The same line is in every file of this kind.` : `<b>Not traced</b><br>No single change to the blueprint moved this line.`, e);
        // Stay on the blueprint file already shown when it holds one of the line's sources; else the most specific one.
        const best = mine.find((a) => W.A[a].file === S.src) ?? [...mine].sort((a, b) => W.span(a) - W.span(b))[0];
        setLeft(W.A[best].file);
        const left = [...document.querySelectorAll('[data-code="src"] .ln[data-b]')];
        let first;
        for (const a of mine.filter((k) => W.A[k].file === S.src)) for (let l = W.A[a].line; l <= W.A[a].endLine; l++) left[l - 1]?.classList.add("src"), (first ??= left[l - 1]);
        if (first) into(first);
        return say(`<b>Made by</b><br>${mine.slice(0, 5).map((a) => `${esc(W.A[a].label)} <span class="mono">${esc(where(W.A[a]))}</span>`).join("<br>")}`, e);
      }
      const l = Number(bl.dataset.b);
      const a = W.innermost(S.src, l);
      if (a === undefined) return say(`<b>Not a declaration</b><br>Nothing generated is traced to this line on its own.`, e);
      const set = W.descendants(a);
      const left = [...document.querySelectorAll('[data-code="src"] .ln[data-b]')];
      for (let k = W.A[a].line; k <= W.A[a].endLine; k++) left[k - 1]?.classList.add("src");
      const f = W.files.get(S.active);
      const hits = Object.entries(f?.from ?? {}).filter(([, from]) => from.some((x) => set.has(x))).map(([k]) => Number(k));
      hits.forEach((k) => document.querySelector(`.ln[data-p="${k}"]`)?.classList.add("hit"));
      const reach = D.files.filter((g) => Object.values(g.from).some((from) => from.some((x) => set.has(x)))).length;
      say(`<b>${esc(W.A[a].label)}</b><br>${hits.length} line${hits.length === 1 ? "" : "s"} in this file come from it, and it reaches ${reach} generated file${reach === 1 ? "" : "s"} in all.${hits.length ? " Click to jump." : ""}`, e);
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest?.(".ln") && !e.relatedTarget?.closest?.(".ln")) (tip.hidden = true), clear();
    });

    document.addEventListener("click", (e) => {
      const t = e.target.closest?.("[data-act],[data-step],[data-dir],[data-file],[data-tab],[data-close],[data-mode],[data-panel],[data-trace],[data-replay],[data-reveal],[data-view],.ln[data-b]");
      if (!t) return;
      const d = t.dataset;
      if (d.close) {
        e.stopPropagation();
        S.tabs = S.tabs.filter((p) => p !== d.close);
        if (S.active === d.close) S.active = S.tabs.at(-1) ?? null;
        return ctx.renderEditors(), ctx.renderTree();
      }
      if (d.act === "next") return ctx.go(S.i + 1);
      if (d.act === "back") return ctx.go(S.i - 1);
      if (d.act === "play") return (S.playing = !S.playing), ctx.renderSteps(), S.playing && ctx.go(S.i + 1, { auto: true });
      if (d.act === "fold") return (S.folded = !S.folded), $("panel").classList.toggle("folded", S.folded), (t.textContent = S.folded ? "▴ Show panel" : "▾ Fold");
      if (d.act === "split") return (S.split = !S.split), ctx.renderEditors();
      if (d.act === "files") return $("side").classList.toggle("show");
      if (d.step !== undefined) return ctx.go(Number(d.step));
      if (d.reveal) return ctx.reveal(d.reveal, Number(d.from), Number(d.to));
      if (d.view) return (S.view = d.view), (S.panel = "terminal"), ctx.renderPanel({ instant: true });
      if (d.dir) return S.expanded.has(d.dir) ? S.expanded.delete(d.dir) : S.expanded.add(d.dir), ctx.renderTree();
      if (d.file) return $("side").classList.remove("show"), ctx.open(d.file);
      if (d.tab && d.g === "main") return (S.active = d.tab), (S.mode = null), (S.src = null), ctx.renderEditors(), ctx.renderTree();
      if (d.mode) return (S.mode = d.mode), ctx.renderEditors();
      if (d.panel && !t.disabled) return (S.panel = d.panel), (S.folded = false), ctx.renderPanel({ instant: true });
      if (d.trace !== undefined) return (S.trace = Number(d.trace)), ctx.renderPanel();
      if (d.replay !== undefined) return ctx.renderPanel();
      if (d.b) {
        const first = document.querySelector('[data-code="main"] .ln.hit');
        if (first) into(first);
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.target.closest?.("input, select, textarea")) return;
      if (e.key === "ArrowRight") ctx.go(S.i + 1);
      if (e.key === "ArrowLeft") ctx.go(S.i - 1);
      if (e.key === "Enter" && e.target.matches?.("[data-dir],[data-file],[data-tab]")) e.target.click();
    });
  };

  return { index, attach };
})();
