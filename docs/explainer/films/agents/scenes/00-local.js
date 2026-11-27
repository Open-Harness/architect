// Shared by this film's sheets, beside the kit: the lanes that carry the film (one for each running goal, read from the
// recording of design/goals/map.md, with claimed paths sitting in them), the rows of docs/canon/status.md, and ways to
// print and light recorded lines. Nothing here holds a line of output or of code.
const Agt = {
  TOP: 748, STEP: 76, H: 66, BAND: 756,
  css: (id) => { const q = "#scene-" + id; return `<style>
    ${q} .who { position: absolute; right: 96px; top: 134px; display: flex; align-items: center; gap: 12px; }
    ${q} .who .arw { font-size: 28px; color: var(--muted); line-height: 1; }
    ${q} .lane { position: absolute; left: 96px; width: 1728px; height: 66px; display: flex; align-items: stretch; }
    ${q} .lane .lhead { width: 660px; flex: none; display: flex; align-items: center; gap: 18px; }
    ${q} .lane .kind { font-size: 22px; color: var(--muted); white-space: nowrap; }
    ${q} .lane .band { position: relative; flex: 1; border: 1px solid var(--rule2); background: rgba(98,198,255,.035); }
    ${q} .lane .band::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dashed var(--rule); }
    ${q} .lane .slots { position: absolute; left: 20px; top: 0; bottom: 0; display: flex; align-items: center; gap: 14px; }
    ${q} .lane .dest { position: absolute; right: 18px; top: 0; bottom: 0; display: flex; align-items: center; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--muted); white-space: nowrap; }
    ${q} .lane .badge { position: absolute; right: 14px; top: 11px; height: 44px; display: flex; align-items: center; font-family: var(--mono); font-size: 22px; color: var(--paper); padding: 4px 14px; border: 1.5px solid var(--rule2); background: #0b1727; white-space: nowrap; }
    ${q} .piece { font-family: var(--mono); font-size: 21px; color: var(--paper); padding: 5px 14px; border: 1.5px solid var(--cyan); background: #0d1d33; white-space: nowrap; }
    ${q} .piece.gap { border: 1.5px dashed var(--text2); color: var(--text2); font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-weight: 600; }
    ${q} .apiece { position: absolute; margin-top: -21px; }
    ${q} .say { font-size: 44px; line-height: 1.2; font-weight: 500; letter-spacing: -.01em; }
    ${q} .tlab { position: absolute; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); white-space: nowrap; display: flex; align-items: center; gap: 12px; }
    ${q} .tlab::before { content: ""; width: 1px; height: 22px; background: var(--rule2); }
    ${q} .term .o .hit, ${q} .code .hit { transition: none; }
  </style>`; },

  /** The running goals, as the recording of design/goals/map.md printed them: number, name, kind. */
  goals(D) {
    const rows = D.cap["agents-goals"].out.split("\n").map((l) => /^ *(\d+) · (.+?) \| (.+?) *$/.exec(l));
    if (!rows.length || rows.some((m) => !m)) throw new Error("agents-goals: a line is not `NN · name | kind`");
    return rows.map((m) => ({ n: m[1], name: m[2], kind: m[3] }));
  },
  /** Which lane holds a goal; a goal the recording lost fails the build. */
  at(D, n) { const k = Agt.goals(D).findIndex((g) => g.n === String(n)); if (k < 0) throw new Error("no running goal " + n); return k; },
  top: (k) => Agt.TOP + k * Agt.STEP,
  mid: (k) => Agt.TOP + k * Agt.STEP + Agt.H / 2,
  /** The lanes: `fill(g, k)` returns what sits in a lane's slots; `dest(g, k)` what stands at its right end. */
  lanes(D, { fill = () => "", dest = () => "", cls = "" } = {}) {
    return Agt.goals(D).map((g, k) => `<div class="lane ${cls} lane-${g.n}" style="top:${Agt.top(k)}px"><div class="lhead">${Kit.who("agent", `${g.n} · ${g.name}`)}<span class="kind">${Film.esc(g.kind)}</span></div><div class="band"><div class="slots">${fill(g, k)}</div>${dest(g, k)}</div></div>`).join("");
  },

  /** A table row of docs/canon/status.md by its id, with the header above it and each cell by its column's name. */
  row(D, id) {
    const text = D.repo["docs/canon/status.md"], rows = text.split("\n"), n = Kit.line(text, new RegExp("^\\| " + id + " \\|"));
    let h = n - 1; while (h > 0 && !/^\| id \|/.test(rows[h - 1])) h--; if (!h) throw new Error("status.md: no header above " + id);
    const split = (l) => l.split(" | ").map((x) => x.replace(/^\| ?| ?\|$/g, ""));
    const head = split(rows[h - 1]), cells = split(rows[n - 1]); if (head.length !== cells.length) throw new Error("status.md: row " + id + " does not fit its header");
    return { text, n, h, line: rows[n - 1], header: rows[h - 1], cell: (name) => { const k = head.indexOf(name); if (k < 0) throw new Error("status.md has no column " + name); return cells[k]; } };
  },
  /** Every lane cell of every table of the status page, counted by what it says. */
  laneCounts(D) {
    const c = {}; let lane = -1;
    D.repo["docs/canon/status.md"].split("\n").forEach((l) => {
      if (/^\| id \|/.test(l)) { lane = l.split("|").map((x) => x.trim()).indexOf("Lane"); return; }
      if (!l.startsWith("|")) { lane = -1; return; } if (lane < 0 || /^\|---/.test(l)) return;
      const v = l.split("|").map((x) => x.trim())[lane]; c[v] = (c[v] ?? 0) + 1;
    });
    return c;
  },

  /** An editor that quotes a file of this repository as plain text (Kit.ed paints every file as TypeScript). */
  ed(D, { id, path, x, y, w, from, to, size = "small", tag = "", cls = "", lang = "text" }) {
    const body = D.repo[path]; if (body === undefined) throw new Error("no file " + path);
    return `<div class="panel ${cls}" id="${id}" style="left:${x}px;top:${y}px;width:${w}px">${Film.editor(id, path, Film.code(body, { lang, from, to, size }), tag)}</div>`;
  },
  /** Where an element sits on the stage, from its offsets up to the scene. */
  pos(el, root) { let x = 0, y = 0, e = el; while (e && e !== root) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; },
  /** Type a terminal's command; returns when the typing ends. */
  type(s, el, t, dur = 0.7) {
    const typed = el.querySelector(".typed"), n = typed.textContent.length;
    s.tl.fromTo(el.querySelector(".cmd"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t - 0.1);
    s.tl.fromTo(typed, { width: "0ch" }, { width: n + "ch", duration: dur, ease: `steps(${n})` }, t);
    return t + dur;
  },
  /** Print recorded lines, one after another. */
  print(s, rows, t, each = 0.09) { rows.forEach((r, k) => s.tl.fromTo(r, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "none" }, t + k * each)); return t + rows.length * each; },
  /** The printed line of a terminal that matches; a recording that lost it fails the build. */
  orow(el, re) { const o = [...el.querySelectorAll(".o")].find((x) => re.test(x.textContent)); if (!o) throw new Error("no printed line " + re); return o; },
  /** Light some printed lines and dim the rest of that terminal. */
  lit(s, el, lit, t, dur = 0.35) {
    const all = [...el.querySelectorAll(".o")], rest = all.filter((o) => !lit.includes(o));
    s.tl.to(lit, { opacity: 1, color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.13)", duration: dur }, t);
    if (rest.length) s.tl.to(rest, { opacity: 0.38, duration: dur }, t);
  },
  /** Wrap some words of a line, where they stand, so they can be lit by themselves. */
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
  glow(s, span, t, color = "rgba(98,198,255,.32)") { s.tl.to(span, { backgroundColor: color, color: "#ffffff", duration: 0.3 }, t); },
  /** A label hung on the stage at a place; returns it, hidden. */
  label(root, text, x, y, cls = "") { const el = document.createElement("div"); el.className = "tlab hidden0 " + cls; el.textContent = text; el.style.left = x + "px"; el.style.top = y + "px"; root.appendChild(el); return el; },
};
