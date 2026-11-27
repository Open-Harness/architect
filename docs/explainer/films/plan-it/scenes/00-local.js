// Shared by this film's sheets, beside the kit: the recorded page read into its parts, and the page itself as a small sheet of
// paper that fills part by part across the film. Nothing here holds a line of the page: the part names below are only where to cut it.
const Loc = {
  NAMES: ["The idea, said back", "Things", "Who may do what", "What must stay true", "What waits", "Where two places must agree", "Doubts", "First question"],
  /** The recording as parts: each a heading line and the lines under it. A page that lost a part, or grew a line under none, fails the build. */
  page(D) {
    if (Loc.read) return Loc.read;
    const rec = D.cap["plan-page"]; if (!rec || rec.cmd === undefined) throw new Error("no recording plan-page");
    const rows = rec.out.split("\n");
    const parts = Loc.NAMES.map((name) => {
      const at = rows.indexOf(name); if (at < 0) throw new Error("the page has no part " + name);
      const lines = []; for (let k = at + 1; k < rows.length && rows[k] !== ""; k++) lines.push(rows[k]);
      if (!lines.length) throw new Error("the page's part " + name + " is empty");
      return { name, lines };
    });
    if (rows.filter((l) => l !== "").length !== parts.reduce((n, p) => n + 1 + p.lines.length, 0)) throw new Error("the page has a line under none of its parts");
    const about = (/"([^"]+)"/.exec(rec.cmd) ?? [])[1]; if (!about) throw new Error("the page's first line no longer quotes its idea");
    const part = (name) => { const p = parts.find((q) => q.name === name); if (!p) throw new Error("no part " + name); return p; };
    /** One line of a part, by what it says, without its dash. */
    const line = (name, re) => { const l = part(name).lines.find((x) => re.test(x)); if (!l) throw new Error(name + ": no line matches " + re); return l.replace(/^- /, ""); };
    return (Loc.read = { first: rec.cmd.replace(/^# /, ""), about, parts, part, line, bare: (l) => l.replace(/^- /, "") });
  },
  /** A line's words, safe to draw, with every "(… guess …)" in the muted colour so a guess reads as a guess. */
  rich: (text) => Film.esc(text).replace(/\([^)]*guess[^)]*\)/g, (m) => `<span class="guess">${m}</span>`),
  /** The look of the shared parts, scoped to one scene. */
  css: (id) => { const q = "#scene-" + id; return `<style>
    ${q} .who { position: absolute; right: 96px; top: 130px; display: flex; align-items: center; gap: 14px; }
    ${q} .guess { color: var(--muted); }
    ${q} .pg { left: 1264px; top: 262px; width: 560px; height: 716px; overflow: hidden; }
    ${q} .pg .bar b { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; }
    ${q} .pg .bar .tag { color: var(--muted); }
    ${q} .pg .leaf { padding: 7px 14px 0 8px; }
    ${q} .pg .part { padding: 0 0 2px 10px; border-left: 3px solid transparent; }
    ${q} .pg .pname { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 20px; line-height: 22px; font-weight: 600; color: var(--paper); opacity: .3; white-space: nowrap; }
    ${q} .pg .part.full .pname { opacity: 1; }
    ${q} .pg .pl { font-size: 10px; line-height: 10.8px; white-space: nowrap; overflow: hidden; color: var(--text2); }
    ${q} .plbl { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 26px; font-weight: 600; color: var(--cyan); }
  </style>`; },
  /** The page as a sheet of paper. Parts named in `full` are already written; the rest are faint names that wait for Loc.fill. */
  sheet(D, full = []) {
    const P = Loc.page(D);
    full.forEach((n) => P.part(n));
    return `<div class="panel pg"><div class="bar"><span class="dots"></span><span><b>the page</b></span><span class="tag">"${Film.esc(P.about)}"</span></div><div class="leaf">${P.parts.map((p, k) => {
      const on = full.includes(p.name);
      return `<div class="part${on ? " full" : ""}" data-part="${k}"><div class="pname">${Film.esc(p.name)}</div>${p.lines.map((l) => `<div class="pl${on ? "" : " hidden0"}">${Loc.rich(l)}</div>`).join("")}</div>`;
    }).join("")}</div></div>`;
  },
  /** A part of the small page, by its name. */
  part(s, name) { const k = Loc.NAMES.indexOf(name); if (k < 0) throw new Error("no part " + name); return s.$(`.pg .part[data-part="${k}"]`); },
  /** Write a part onto the small page: its name comes up and its lines land one after another. */
  fill(s, name, t, each = 0.05) {
    const el = Loc.part(s, name);
    s.tl.to(el.querySelector(".pname"), { opacity: 1, duration: 0.3 }, t);
    [...el.querySelectorAll(".pl")].forEach((l, k) => s.tl.fromTo(l, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, ease: "none" }, t + 0.1 + k * each));
  },
  /** Mark the part (or parts) being spoken on the small page; none puts the page back to plain. */
  now(s, names, t) {
    const lit = [names ?? []].flat().map((n) => Loc.part(s, n)), rest = s.$$(".pg .part").filter((el) => !lit.includes(el));
    if (rest.length) s.tl.to(rest, { borderLeftColor: "rgba(98,198,255,0)", backgroundColor: "rgba(98,198,255,0)", duration: 0.3 }, t);
    if (lit.length) s.tl.to(lit, { borderLeftColor: "#62c6ff", backgroundColor: "rgba(98,198,255,.12)", duration: 0.3 }, t);
  },
  /** Lines of a part on the small page, by what they say. */
  mini(s, name, re) { const found = [...Loc.part(s, name).querySelectorAll(".pl")].filter((l) => re.test(l.textContent)); if (!found.length) throw new Error(name + ": the small page has no line " + re); return found; },
  /** Light lines of the small page where they stand. */
  lightMini(s, name, re, t) { s.tl.to(Loc.mini(s, name, re), { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.34)", duration: 0.3 }, t); },
  /** Wrap some words of a drawn line, so they can be lit by themselves; a line that lost them fails the build. */
  mark(html, words, cls) { if (!html.includes(Film.esc(words))) throw new Error("a line of the page lost the words " + words); return html.replace(Film.esc(words), `<span class="${cls}">${Film.esc(words)}</span>`); },
};
