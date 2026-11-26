// Helpers for this film's sheets only. Nothing here holds a line of output or of code.
const Local = {
  /** Who is acting, set level with the eyebrow at the right of the head. */
  who(kind, label) { return `<div class="abs whoat" style="right:96px;top:124px">${Kit.who(kind, label)}</div>`; },
  /** Wrap words that are already in a printed line, so they can be lit. The line is never retyped: a missing phrase throws. */
  mark(el, text, cls) {
    const html = el.innerHTML, want = Film.esc(text), at = html.indexOf(want); if (at < 0) throw new Error("no words \"" + text + "\" in: " + el.textContent.slice(0, 60));
    el.innerHTML = html.slice(0, at) + `<span class="${cls}">${want}</span>` + html.slice(at + want.length); return el.querySelector("." + cls);
  },
  /** Exactly one line of a recording that matches, or the build fails. */
  one(out, re) { const found = out.split("\n").filter((l) => re.test(l)); if (found.length !== 1) throw new Error(found.length + " lines match " + re); return found[0]; },
};
