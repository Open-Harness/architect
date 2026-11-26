// Shared by this film's scenes: an editor placed on the sheet with its imports cut off, a callout beside a line, and the look of the
// pieces every sheet reuses.
const Kit = {
  css: `<style>
    .kcall { position: absolute; right: 30px; transform: translateY(-50%); font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; white-space: nowrap; }
    .kcall::before { content: ""; width: 48px; height: 1px; background: var(--rule2); } .kcall.am { color: var(--amber); }
    .kbox { position: absolute; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); padding: 18px 22px; }
    .kbox .lbl { margin-bottom: 8px; } .kbox.chain { border-color: rgba(255,181,92,.7); } .kbox.chain > .lbl { color: var(--amber); } .kbox.ours { border-color: rgba(98,198,255,.7); } .kbox.ours > .lbl { color: var(--cyan); } .kbox.dev { border-color: rgba(84,216,152,.7); } .kbox.dev > .lbl { color: var(--green); }
    .kpill { display: inline-block; font-family: var(--mono); font-size: 21px; padding: 5px 14px; border: 1.5px solid var(--rule2); color: var(--text2); white-space: nowrap; }
    .kbig { font-size: 40px; line-height: 1.25; font-weight: 500; letter-spacing: -.01em; } .ktag { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 18px; font-weight: 600; }
    .klegend { position: absolute; left: 96px; top: 992px; display: flex; align-items: center; gap: 10px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 17px; font-weight: 600; color: var(--amber); }
    .klegend i { width: 5px; height: 22px; background: var(--amber); }
  </style>`,
  legend: `<div class="klegend"><i></i>amber edge: proposed in this film</div>`,
  /** The first line of a file's own text, after its imports and the blank line that ends them. */
  start(text) { const rows = text.split("\n"); let last = -1; rows.forEach((l, k) => { if (l.startsWith("import ")) last = k; }); let at = last + 1; while (rows[at] === "") at++; return at + 1; },
  /** An editor panel at a place on the sheet. `file` is a path under app/. */
  ed(D, { id, file, x, y, w, from, to, size = "", tag = "", cls = "" }) {
    const text = D.src[file]; if (text === undefined) throw new Error("no file " + file);
    return `<div class="panel ${cls}" id="${id}" style="left:${x}px;top:${y}px;width:${w}px">${Film.editor(id, file, Film.code(text, { from: from ?? Kit.start(text), to, size }), tag)}</div>`;
  },
  /** The line of a file that matches, by its own number. */
  line(D, file, re) { const n = D.src[file].split("\n").findIndex((l) => re.test(l)) + 1; if (!n) throw new Error(file + ": no line matches " + re); return n; },
  /** A callout hung beside a line of an editor's body; returns the element, hidden. */
  call(s, body, n, label, cls = "") { const el = document.createElement("div"); el.className = "kcall hidden0 " + cls; el.textContent = label; el.style.top = s.lineY(body, n) + "px"; body.appendChild(el); return el; },
};
