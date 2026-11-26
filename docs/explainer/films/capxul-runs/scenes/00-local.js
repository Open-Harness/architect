// Shared by this film's scenes, beside the kit: a terminal whose lines a scene shows one at a time, and the look of a few parts.
const Loc = {
  css: `<style>
    .lterm .screen { font-size: 19px; line-height: 30px; padding: 16px 22px; } .lterm .o.lit { color: var(--paper); }
    .lnote { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--muted); }
  </style>`,
  /** A terminal panel: a command, and the lines it printed (each a `.o`, hidden until a scene brings it in). */
  term({ id, x, y, w, title, tag = "", text }) {
    const rows = text.replace(/\n$/, "").split("\n"), command = rows[0].replace(/^\$\s*/, "");
    return `<div class="panel term lterm" id="${id}" style="left:${x}px;top:${y}px;width:${w}px"><div class="bar"><span class="dots"></span><span>${title}</span>${tag}</div><div class="screen">${Film.term(command, rows.slice(1).join("\n"))}</div></div>`;
  },
  /** Type a terminal's command; returns when the typing ends. The prompt can be shown earlier, at `promptAt`. */
  type(s, el, t, dur = 0.7, promptAt = t - 0.1) {
    const typed = el.querySelector(".typed"), n = typed.textContent.length;
    s.tl.fromTo(el.querySelector(".cmd"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, promptAt);
    s.tl.fromTo(typed, { width: "0ch" }, { width: n + "ch", duration: dur, ease: `steps(${n})` }, t);
    return t + dur;
  },
  /** Bring one printed line in. */
  row(s, el, t) { s.tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, ease: "none" }, t); },
};
