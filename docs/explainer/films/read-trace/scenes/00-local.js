// Shared by this film's scenes, beside the kit: a command that wraps as it is typed, a printed row found by what it says,
// a mark around some of a row's own words, and a label hung on that mark. Nothing here holds a line of output or of code.
const Loc = {
  css: `<style>
    .lcmd { white-space: normal !important; overflow-wrap: anywhere; } .lcmd .typed { display: inline !important; width: auto !important; white-space: pre-wrap !important; overflow: visible; }
    .lmk { position: relative; }
    .lund { position: absolute; left: 0; top: 100%; text-indent: 0; padding: 8px 0 0 10px; border-left: 1px solid var(--rule2); font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; line-height: 1.15; font-weight: 600; font-style: normal; color: var(--paper); white-space: nowrap; }
    .lside { font-style: normal; position: absolute; left: 100%; top: 50%; transform: translateY(-50%); margin-left: 26px; text-indent: 0; display: flex; align-items: center; gap: 14px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; line-height: 1.15; font-weight: 600; color: var(--paper); white-space: nowrap; }
    .lside::before { content: ""; width: 48px; height: 1px; background: var(--rule2); }
    .lwho { position: absolute; right: 96px; top: 136px; display: flex; gap: 14px; }
  </style>`,
  /** Type a terminal's command a letter at a time, wrapping where it must, then print its rows. Returns when the last row landed. */
  type(s, el, t, v = {}) {
    const cmd = el.querySelector(".cmd"), typed = cmd.querySelector(".typed"), text = typed.textContent, n = text.length, dur = v.dur ?? Math.min(1.1, 0.25 + n * 0.045);
    cmd.classList.add("lcmd"); typed.textContent = "";
    const chars = [...text].map((ch) => { const b = document.createElement("span"); b.textContent = ch; typed.appendChild(b); return b; });
    s.tl.fromTo(cmd, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t - 0.1);
    chars.forEach((b, k) => s.tl.fromTo(b, { display: "none" }, { display: "inline", duration: 0.001, ease: "none" }, t + (dur * k) / n));
    const rows = [...el.querySelectorAll(".o")], at = v.at ?? t + dur + 0.45, each = v.each ?? 0.09;
    rows.forEach((r, k) => s.tl.fromTo(r, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "none" }, at + k * each));
    return at + rows.length * each;
  },
  /** The printed row of a terminal that matches; a recording that lost the line fails the build. */
  row(el, re) { const r = [...el.querySelectorAll(".o")].find((o) => re.test(o.textContent)); if (!r) throw new Error("no printed line matches " + re); return r; },
  /** Wrap the words of a row that match in a mark, without retyping them. */
  mark(row, re) {
    const walk = document.createTreeWalker(row, NodeFilter.SHOW_TEXT); let node;
    while ((node = walk.nextNode())) {
      const m = re.exec(node.data); if (!m) continue;
      const range = document.createRange(); range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
      const span = document.createElement("span"); span.className = "lmk"; range.surroundContents(span); return span;
    }
    throw new Error("no words match " + re + " in: " + row.textContent);
  },
  /** A label hung on a mark: under it (`drop` pixels lower), or beside it. Returned hidden. */
  note(mark, label, { side = false, drop = 0, cls = "" } = {}) {
    const el = document.createElement("i"); el.className = (side ? "lside" : "lund") + " hidden0 " + cls; el.textContent = label; if (drop) el.style.paddingTop = 8 + drop + "px"; mark.appendChild(el); return el;
  },
  /** Light a printed row. */
  light(s, row, t, bg = "rgba(98,198,255,.13)") { s.tl.to(row, { color: "#e9f0fa", backgroundColor: bg, duration: 0.3 }, t); },
};
