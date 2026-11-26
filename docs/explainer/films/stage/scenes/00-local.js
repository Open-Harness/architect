// Shared by this film's sheets, beside the kit: the plan's three resources (the picture that carries the film: outlines,
// never filled, because nothing was made), the build's two tags, and ways to print and light recorded lines.
// Nothing here holds a line of output or of code: every name and value is read from docs/manual/captures.
const Stg = {
  css: (id) => { const q = "#scene-" + id; return `<style>
    ${q} .who { position: absolute; right: 96px; top: 130px; display: flex; align-items: center; gap: 14px; }
    ${q} .term .o .hit { border-radius: 2px; }
    ${q} .term .cmd .hit { border-radius: 2px; }
    ${q} .tlab { position: absolute; right: 22px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; white-space: nowrap; text-indent: 0; background: rgba(12,24,42,.96); padding-left: 10px; }
    ${q} .tlab::before { content: ""; width: 48px; height: 1px; background: var(--rule2); }
    ${q} .say { font-size: 44px; line-height: 1.2; font-weight: 500; letter-spacing: -.01em; }
    ${q} .trio { position: absolute; display: flex; gap: 16px; }
    ${q} .trio.col { flex-direction: column; }
    ${q} .trio .res { position: relative; flex: 1 1 0; min-width: 0; border: 2px dashed var(--cyan); background: rgba(8,17,31,.55); padding: 14px 20px 16px; }
    ${q} .trio .res .lbl { display: flex; justify-content: space-between; gap: 12px; color: var(--cyan); }
    ${q} .trio .res .lbl em { font-style: normal; color: var(--muted); }
    ${q} .trio .res .nm { font-family: var(--mono); font-size: 25px; line-height: 36px; color: var(--paper); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 6px; }
    ${q} .trio .res .nm.sub { font-size: 22px; color: var(--text2); }
    ${q} .trio .pre { position: relative; } ${q} .trio .pre i { position: absolute; left: 0; right: 0; bottom: -3px; height: 3px; background: var(--cyan); transform: scaleX(0); transform-origin: 0 50%; }
    ${q} .trio.row .res .nm { font-size: 21px; line-height: 30px; } ${q} .trio.row .res .lbl em { display: none; }
    ${q} .trio.mini { gap: 10px; justify-content: flex-end; } ${q} .trio.mini .res { flex: 0 0 auto; white-space: nowrap; padding: 8px 14px; border-width: 1.5px; } ${q} .trio.mini .res .lbl { font-size: 19px; }
    ${q} .triocap { position: absolute; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--muted); white-space: nowrap; }
    ${q} .tags { position: absolute; display: flex; flex-direction: column; gap: 16px; }
    ${q} .tagbox { border: 1.5px solid var(--paper); background: rgba(11,23,39,.95); padding: 12px 22px 14px; }
    ${q} .tagbox .lbl { color: var(--muted); } ${q} .tagbox .val { font-family: var(--mono); font-size: 30px; line-height: 42px; color: var(--paper); white-space: nowrap; }
    ${q} .tagbox.small .val { font-size: 23px; line-height: 34px; }
  </style>`; },

  /** The plan as the recording printed it, and the same document from destroy's plan. */
  plan(D) {
    const read = (name) => { const rec = D.cap[name]; if (!rec || rec.out === undefined) throw new Error("no recording " + name); return JSON.parse(rec.out); };
    const up = read("stage-plan"), down = read("stage-destroy-plan");
    if (!Array.isArray(up.resources) || !up.prefix || !up.run) throw new Error("stage: the plan has no prefix, run or resources");
    if (JSON.stringify(up.resources) !== JSON.stringify(down.resources)) throw new Error("stage: destroy's plan does not name the same resources");
    up.resources.forEach((r) => { const nm = r.name ?? r.script; if (!nm || !nm.startsWith(up.prefix)) throw new Error("stage: a resource name does not start with the prefix: " + nm); });
    return { up, down, res: up.resources };
  },
  /** What the sheet calls each kind, by what the chapter says it is. */
  what: { worker: "the server", d1: "its database", "durable-object-namespace": "the server's namespace" },
  pre(prefix, name) { if (!name.startsWith(prefix)) throw new Error("stage: " + name + " does not start with " + prefix); return `<span class="pre">${Film.esc(prefix)}<i></i></span>${Film.esc(name.slice(prefix.length))}`; },
  /** The three resources as outlines. layout: col (big, the plan sheet), row (mid), mini (kind only, a corner). */
  trio(D, { id, x, y, w, layout = "row", cls = "" }) {
    const { up, res } = Stg.plan(D);
    const box = (r, k) => {
      const what = Stg.what[r.kind]; if (!what) throw new Error("stage: no word for the kind " + r.kind);
      if (layout === "mini") return `<div class="res res${k}"><div class="lbl"><span>${Film.esc(r.kind)}</span></div></div>`;
      const main = r.name ? `<div class="nm">${Stg.pre(up.prefix, r.name)}</div>` : `<div class="nm">${Stg.pre(up.prefix, r.script)}</div>`;
      const sub = "";
      return `<div class="res res${k}"><div class="lbl"><span>${Film.esc(r.kind)}</span><em>${what}</em></div>${main}${sub}</div>`;
    };
    return `<div class="trio ${layout} ${cls}" id="${id}" style="left:${x}px;top:${y}px;width:${w}px">${res.map(box).join("")}</div>`;
  },
  /** The build's two values, from its one printed line. */
  built(D) {
    const line = D.cap["stage-build"].out.split("\n").find((l) => l.startsWith("built "));
    const m = /^built ([0-9a-f]{7,}) (sha256:[0-9a-f]{64})$/.exec(line ?? ""); if (!m) throw new Error("stage: the build printed no commit and fingerprint");
    return { line: m[0], commit: m[1], sha: m[2], count: m.length - 1 };
  },
  tags(D, { id, x, y, w, cls = "", small = false }) {
    const b = Stg.built(D);
    return `<div class="tags ${cls}" id="${id}" style="left:${x}px;top:${y}px;width:${w}px"><div class="tagbox t1 ${small ? "small" : ""}"><div class="lbl">1 · the commit, cut short</div><div class="val">${Film.esc(b.commit)}</div></div><div class="tagbox t2 ${small ? "small" : ""}"><div class="lbl">${b.count} · the fingerprint of the file</div><div class="val">${Film.esc(b.sha)}</div></div></div>`;
  },

  /** Type a terminal's command; returns when the typing ends. */
  type(s, el, t, dur = 0.7) {
    const typed = el.querySelector(".typed"), n = typed.textContent.length;
    s.tl.fromTo(el.querySelector(".cmd"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t - 0.1);
    s.tl.fromTo(typed, { width: "0ch" }, { width: n + "ch", duration: dur, ease: `steps(${n})` }, t);
    return t + dur;
  },
  print(s, rows, t, each = 0.09) { rows.forEach((r, k) => s.tl.fromTo(r, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "none" }, t + k * each)); return t + rows.length * each; },
  rows(s, sel, words) { const found = s.$$(sel + " .o").filter((o) => (words instanceof RegExp ? words.test(o.textContent) : o.textContent.includes(words))); if (!found.length) throw new Error(sel + ": no printed line holds " + words); return found; },
  lit(s, sel, lit, t, dur = 0.35) {
    const all = s.$$(sel + " .o"), rest = all.filter((o) => !lit.includes(o));
    if (!lit.length) { s.tl.to(all, { opacity: 1, color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: dur }, t); return; }
    s.tl.to(lit, { opacity: 1, color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.13)", duration: dur }, t);
    if (rest.length) s.tl.to(rest, { opacity: 0.38, color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: dur }, t);
  },
  /** Wrap some words where they stand (in a printed line or a typed command), so they can be lit by themselves. */
  mark(row, words) {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) {
      const at = node.nodeValue.indexOf(words); if (at < 0) continue;
      const hit = node.splitText(at); hit.splitText(words.length);
      const span = document.createElement("span"); span.className = "hit"; hit.parentNode.replaceChild(span, hit); span.appendChild(hit); return span;
    }
    throw new Error("a line lost the words " + words);
  },
  /** Light a marked span. */
  hit(s, span, t) { s.tl.to(span, { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, t); },
  label(row, text) { const el = document.createElement("div"); el.className = "tlab hidden0"; el.textContent = text; el.style.top = row.offsetTop + "px"; el.style.lineHeight = getComputedStyle(row).lineHeight; row.parentNode.appendChild(el); return el; },
  /** Underline the prefix on every name of a trio. */
  prefix(s, sel, t) { s.tl.to(s.$$(sel + " .pre i"), { scaleX: 1, duration: 0.45, stagger: 0.12, ease: "power2.inOut" }, t); },
};
