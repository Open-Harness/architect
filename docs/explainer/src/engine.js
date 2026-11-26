// The film's engine: one paused timeline that every scene writes to, placed by the narration's own times. Nothing here
// plays by itself: the player (or the frame renderer) calls Film.seek(seconds), so any frame can be drawn on its own.
const Film = (() => {
  const D = window.FILM_DATA, T = D.timing;
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out", duration: 0.5 } });
  const lines = {}; T.scenes.forEach((s) => s.lines.forEach((l) => (lines[l.id] = l)));
  const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  const LEAD = 0.14; // a picture lands just before its word
  const missed = [];

  /** When a line starts, or when a word in it is spoken ("$" is the line's end). Words come from the recogniser's times. */
  function cue(id, word, nth = 1) {
    const l = lines[id]; if (!l) throw new Error("no line " + id);
    if (word === undefined) return l.start;
    if (word === "$") return l.end;
    const want = word.split(/\s+/).map(norm); let seen = 0;
    for (let i = 0; i + want.length <= l.words.length; i++) {
      if (want.every((w, k) => norm(l.words[i + k].w).startsWith(w)) && ++seen === nth) return Math.max(l.start, l.words[i].t0 - LEAD);
    }
    missed.push(id + ":" + word);
    const at = l.text.toLowerCase().indexOf(word.toLowerCase());
    return l.start + (at < 0 ? 0 : at / l.text.length) * (l.end - l.start);
  }

  // ---- text to marked-up lines -------------------------------------------------------------------------------------
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const span = (cls, text) => (cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text));
  const KW = new Set("import export from const let var function return if else class extends new default type interface as satisfies readonly yield typeof contract is internal external override returns storage memory emit revert error event private".split(" "));
  function ts(line, st) {
    let out = "", i = 0;
    while (i < line.length) {
      const rest = line.slice(i); let m;
      if (st.block) { const e = rest.indexOf("*/"), end = e < 0 ? rest.length : e + 2; out += span("c", rest.slice(0, end)); i += end; if (e >= 0) st.block = false; continue; }
      if (rest.startsWith("//")) { out += span("c", rest); break; }
      if (rest.startsWith("/*")) { st.block = true; continue; }
      if ((m = /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/.exec(rest))) { out += span("s", m[0]); i += m[0].length; continue; }
      if (/[(,=:]\s*$/.test(line.slice(0, i)) && (m = /^\/(?![/*\s])(?:[^/\\]|\\.)+\/[a-z]*/.exec(rest))) { out += span("r", m[0]); i += m[0].length; continue; }
      if ((m = /^\d[\d_.]*/.exec(rest))) { out += span("n", m[0]); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) {
        const w = m[0], after = rest.slice(w.length);
        out += span(KW.has(w) ? "k" : /^\s*\(/.test(after) ? "f" : /^[A-Z]/.test(w) ? "t" : /^\??:/.test(after) ? "p" : "", w); i += w.length; continue;
      }
      out += /[{}()[\];,.<>=:*|&?!+-]/.test(rest[0]) ? span("x", rest[0]) : esc(rest[0]); i++;
    }
    return out;
  }
  const json = (line) => esc(line).replace(/(&quot;|")((?:[^"\\]|\\.)*)\1(\s*:)?/g, (_, q, body, colon) => (colon ? `<span class="p">"${body}"</span><span class="x">:</span>` : `<span class="s">"${body}"</span>`))
    .replace(/(?<![\w"-])(-?\d+(?:\.\d+)?)(?![\w"])/g, '<span class="n">$1</span>');
  const shell = (line) => esc(line).replace(/✔/g, '<span class="ok">✔</span>').replace(/✘/g, '<span class="no">✘</span>')
    .replace(/((?:blueprint|generated|src|journeys)\/[\w./-]+)/g, '<span class="path">$1</span>');
  const paint = { ts: (rows) => { const st = { block: false }; return rows.map((r) => ts(r, st)); }, json: (rows) => rows.map(json), sh: (rows) => rows.map(shell), text: (rows) => rows.map(esc) };

  /** A file's lines as an editor body. `from`/`to` are the file's own line numbers, so a quote can't drift from its numbers. */
  function code(text, { lang = "ts", from = 1, to, size = "" } = {}) {
    // A line that ends `// new` is a proposal, not something that exists: it gets an amber edge and loses the mark.
    const raw = text.replace(/\n$/, "").split("\n"), fresh = raw.map((l) => /\s*\/\/ new(?::.*)?$/.test(l));
    const all = raw.map((l) => l.replace(/\s*\/\/ new(?::\s*(.*))?$/, (_, why) => (why ? "  // " + why : ""))), marked = paint[lang](all);
    const rows = marked.slice(from - 1, to ?? all.length).map((html, k) => `<div class="ln${fresh[from - 1 + k] ? " isnew" : ""}" data-n="${from + k}"><i>${from + k}</i><code>${html || " "}</code></div>`);
    return `<div class="code ${size}"><div class="focusbar"></div>${rows.join("")}</div>`;
  }
  const editor = (id, path, body, tag = "") => {
    const cut = path.lastIndexOf("/") + 1;
    return `<div class="bar"><span class="dots"></span><span>${esc(path.slice(0, cut))}<b>${esc(path.slice(cut))}</b></span>${tag}</div>${body}`;
  };
  /** A terminal: one command, typed, then what it printed. `keep` picks the printed lines to show. */
  function term(command, output, { keep } = {}) {
    let rows = output.replace(/\n$/, "").split("\n"); if (keep) rows = rows.filter(keep);
    return `<div class="cmd"><span class="ps">$</span><span class="typed">${esc(command)}</span><span class="cur"></span></div>` + paint.sh(rows).map((r) => `<div class="o">${r || " "}</div>`).join("");
  }

  // ---- scenes ---------------------------------------------------------------------------------------------------
  const defs = {}, built = [];
  const scene = (id, def) => (defs[id] = def);
  function build() {
    const root = document.getElementById("scenes");
    T.scenes.forEach((ts_, index) => {
      const def = defs[ts_.id] ?? { html: () => '<div class="head"><div class="hl">Not drawn yet: ' + ts_.id + "</div></div>", build() {} };
      const el = document.createElement("section"); el.className = "scene"; el.id = "scene-" + ts_.id; el.innerHTML = def.html(D); root.appendChild(el);
      const $ = (sel) => { const n = el.querySelector(sel); if (!n) throw new Error(ts_.id + ": nothing matches " + sel); return n; };
      const $$ = (sel) => [...el.querySelectorAll(sel)];
      const pick = (x) => { if (typeof x !== "string") return x; const found = $$(x); if (!found.length) throw new Error(ts_.id + ": nothing matches " + x); return found; };
      const s = {
        el, $, $$, tl, cue, D, start: ts_.start, end: ts_.end,
        /** Bring something in: fade and settle. */
        in: (x, t, v = {}) => tl.fromTo(pick(x), { autoAlpha: 0, y: v.y ?? 16, x: v.x ?? 0, scale: v.scale ?? 1 }, { autoAlpha: v.alpha ?? 1, y: 0, x: 0, scale: 1, duration: v.dur ?? 0.55, stagger: v.stagger ?? 0, ease: v.ease ?? "power3.out" }, t),
        out: (x, t, v = {}) => tl.to(pick(x), { autoAlpha: 0, y: v.y ?? 0, duration: v.dur ?? 0.4, stagger: v.stagger ?? 0, ease: "power2.in" }, t),
        to: (x, v, t) => tl.to(pick(x), v, t),
        fromTo: (x, a, b, t) => tl.fromTo(pick(x), a, b, t),
        /** Draw a stroke from its start to its end. */
        draw: (x, t, dur = 0.7) => pick(x).forEach((p) => { const len = p.getTotalLength(); tl.fromTo(p, { strokeDasharray: len, strokeDashoffset: len, autoAlpha: 1 }, { strokeDashoffset: 0, duration: dur, ease: "power2.inOut" }, t); }),
        /** Type a command, then print its output a line at a time. Returns when the last line has landed. */
        run: (termEl, t, v = {}) => {
          const typed = termEl.querySelector(".typed"), n = typed.textContent.length, typeDur = v.type ?? Math.min(1.1, 0.25 + n * 0.045);
          tl.fromTo(termEl.querySelector(".cmd"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t - 0.1);
          tl.fromTo(typed, { width: "0ch" }, { width: n + "ch", duration: typeDur, ease: `steps(${n})` }, t);
          const rows = [...termEl.querySelectorAll(".o")], at = (v.at ?? t + typeDur + 0.45), each = v.each ?? 0.09;
          rows.forEach((r, k) => tl.fromTo(r, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "none" }, at + k * each));
          return at + rows.length * each;
        },
        /** Light a run of lines in an editor and dim the rest. */
        focus: (ed, range, t, dur = 0.45) => {
          const body = typeof ed === "string" ? $(ed) : ed, lns = [...body.querySelectorAll(".ln")];
          const inside = (l) => range && +l.dataset.n >= range[0] && +l.dataset.n <= range[1], lit = lns.filter(inside);
          if (!range) { tl.to(lns, { opacity: 1, duration: dur }, t); tl.to(body.querySelector(".focusbar"), { autoAlpha: 0, duration: dur }, t); return; }
          if (!lit.length) throw new Error(ts_.id + ": no lines " + range);
          const top = lit[0].offsetTop, height = lit[lit.length - 1].offsetTop + lit[lit.length - 1].offsetHeight - top;
          tl.to(body.querySelector(".focusbar"), { top, height, autoAlpha: 1, duration: dur, ease: "power2.inOut" }, t);
          tl.to(lit, { opacity: 1, duration: dur }, t); const rest = lns.filter((l) => !inside(l)); if (rest.length) tl.to(rest, { opacity: 0.32, duration: dur }, t);
        },
        /** Where a line sits inside its editor body, for hanging a callout beside it. */
        lineY: (ed, n) => { const l = (typeof ed === "string" ? $(ed) : ed).querySelector(`.ln[data-n="${n}"]`); return l.offsetTop + l.offsetHeight / 2; },
      };
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "power1.out" }, ts_.start);
      def.build(s);
      if (index < T.scenes.length - 1) tl.to(el, { autoAlpha: 0, duration: 0.45, ease: "power1.in" }, ts_.end - 0.45);
      built.push({ ...ts_, def, index });
    });
    tl.to({}, { duration: 0.001 }, T.total);
    if (missed.length) console.warn("cues placed by guess: " + missed.join(", "));
  }

  // ---- what follows the clock but isn't a tween: the sheet's lettering, the cursor, the caption --------------------------
  const STEPS = D.meta.steps.map((s) => s.toLowerCase());
  document.getElementById("steps").innerHTML = D.meta.steps.map((s) => `<b>${s}</b>`).join("<u></u>");
  document.getElementById("railsrc").textContent = D.meta.source; document.getElementById("filmtitle").textContent = D.meta.title; document.getElementById("about").textContent = D.meta.about ?? "";
  let last = -1;
  function chrome(t) {
    const cur = built.find((s) => t < s.end) ?? built[built.length - 1];
    if (cur.index !== last) {
      last = cur.index;
      document.getElementById("sheetno").textContent = `Sheet ${String(cur.index + 1).padStart(2, "0")} / ${String(built.length).padStart(2, "0")}`;
      document.getElementById("sheetname").textContent = cur.title;
      const at = STEPS.indexOf(cur.def.step ?? ""), all = cur.def.step === "all";
      document.querySelectorAll("#steps b").forEach((b, k) => { b.className = all ? "done" : k === at ? "on" : at >= 0 && k < at ? "done" : ""; });
    }
    document.getElementById("prog").style.width = (100 * t / T.total).toFixed(3) + "%";
    const blink = Math.floor(t * 2) % 2 ? 0 : 1;
    document.querySelectorAll(".scene .cur").forEach((c) => (c.style.opacity = blink));
    return cur;
  }
  function seek(t) { t = Math.max(0, Math.min(T.total, t)); tl.time(t); return chrome(t); }
  const lineAt = (t) => D.captions.find((c) => t >= c.t0 - 0.1 && t < c.t1 + 0.12) ?? null;

  return { D, T, tl, cue, code, editor, term, esc, scene, build, seek, lineAt, missed, STEPS };
})();
