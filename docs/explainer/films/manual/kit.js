// Shared by the manual's films: a terminal that replays one recording, an editor that quotes one file, a callout beside a line,
// the people on the sheet, and the stamp that says how a part stands. Nothing here holds a line of output or of code.
const Kit = {
  css: `<style>
    .kcall { position: absolute; right: 30px; transform: translateY(-50%); font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; }
    .kcall::before { content: ""; width: 48px; height: 1px; background: var(--rule2); }
    .kbox { position: absolute; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); padding: 18px 22px; }
    .kbox .lbl { margin-bottom: 8px; }
    .kbig { font-size: 40px; line-height: 1.25; font-weight: 500; letter-spacing: -.01em; }
    .kwho { display: inline-flex; align-items: center; gap: 12px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; padding: 6px 16px; border: 1.5px solid currentColor; white-space: nowrap; }
    .kwho::before { content: ""; width: 12px; height: 12px; border-radius: 50%; background: currentColor; }
    .kwho.you { color: var(--paper); } .kwho.designer { color: var(--cyan); } .kwho.author { color: var(--cyan); } .kwho.builder { color: var(--cyan); } .kwho.agent { color: var(--cyan); }
    .kstand { position: absolute; display: flex; align-items: center; gap: 12px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 20px; font-weight: 600; color: var(--muted); }
    .kstand b { font-weight: 600; padding: 3px 12px; border: 1.5px solid currentColor; } .kstand .real { color: var(--green); } .kstand .practice { color: var(--cyan); } .kstand .missing { color: var(--amber); }
    .kterm .screen { position: absolute; left: 0; right: 0; top: 46px; bottom: 0; overflow: hidden; }
  </style>`,
  /** The first line of a file's own text, after its imports and the blank line that ends them. */
  start(text) { const rows = text.split("\n"); let last = -1; rows.forEach((l, k) => { if (l.startsWith("import ")) last = k; }); let at = last + 1; while (rows[at] === "") at++; return at + 1; },
  /** The line of a text that matches, by its own number. */
  line(text, re) { const n = text.split("\n").findIndex((l) => re.test(l)) + 1; if (!n) throw new Error("no line matches " + re); return n; },
  /** An editor panel at a place on the sheet. `file` is a path under examples/plugged-in, or `text` and `path` give a recorded file. */
  ed(D, { id, file, text, path, x, y, w, from, to, size = "", tag = "", cls = "" }) {
    const body = text ?? D.src[file]; if (body === undefined) throw new Error("no file " + file);
    return `<div class="panel ${cls}" id="${id}" style="left:${x}px;top:${y}px;width:${w}px">${Film.editor(id, path ?? file, Film.code(body, { from: from ?? Kit.start(body), to, size }), tag)}</div>`;
  },
  /** A terminal that replays one recording: `cap` names a file of docs/manual/captures. `keep` picks the printed lines to show. */
  term(D, { id, cap, x, y, w, h, keep, title = "plugged-in", tag = "", cls = "", size }) {
    const rec = D.cap[cap]; if (!rec || rec.cmd === undefined) throw new Error("no recording " + cap);
    return `<div class="panel term kterm ${cls}" id="${id}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="bar"><span class="dots"></span><span>${title}</span>${tag}</div><div class="screen"${size ? ` style="font-size:${size}px;line-height:${Math.round(size * 1.58)}px"` : ""}>${Film.term(rec.cmd, rec.out, { keep })}</div></div>`;
  },
  /** A callout hung beside a line of an editor's body; returns the element, hidden. */
  call(s, body, n, label, cls = "") { const el = document.createElement("div"); el.className = "kcall hidden0 " + cls; el.textContent = label; el.style.top = s.lineY(body, n) + "px"; body.appendChild(el); return el; },
  /** Who is acting: you, the designer, the author, the builder, or your agent. */
  who(kind, label) { return `<span class="kwho ${kind}">${label ?? kind}</span>`; },
  /** How a part stands. kind: real (runs today), practice (this repository's practice), missing. */
  stand(kind, text, at = "left:96px;top:992px") { const word = { real: "runs today", practice: "this repository's practice", missing: "missing today" }[kind]; return `<div class="kstand" style="${at}"><b class="${kind}">${word}</b><span>${text ?? ""}</span></div>`; },
};
