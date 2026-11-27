// Shared by this film's sheets, beside the kit: the rung meter that runs through sheets 2 to 4, and a few ways to bring in and
// light the recorded lines of a terminal. Nothing here holds a line of output or of code.
const Loc = {
  /** The look of the shared parts, scoped to one scene. */
  css: (id) => { const q = "#scene-" + id; return `<style>
    ${q} .who { position: absolute; right: 96px; top: 130px; display: flex; align-items: center; gap: 14px; }
    ${q} .who .arrow { font-size: 30px; color: var(--muted); line-height: 1; }
    ${q} .ladder { position: absolute; right: 96px; top: 190px; display: flex; align-items: stretch; gap: 10px; }
    ${q} .ladder .rung { display: flex; align-items: baseline; gap: 12px; padding: 6px 16px 7px; border: 1.5px solid var(--rule2); background: rgba(14,28,48,.9); opacity: .55; }
    ${q} .ladder .rung span { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; color: var(--muted); }
    ${q} .ladder .rung b { font-family: var(--mono); font-size: 26px; font-weight: 500; min-width: 3ch; text-align: right; font-variant-numeric: tabular-nums; }
    ${q} .ladder .rung b.pass { color: var(--green); } ${q} .ladder .rung b.fail { color: var(--red); }
    ${q} .ladder .join { align-self: center; width: 18px; height: 1px; background: var(--rule2); }
    ${q} .term .o .hit { transition: none; }
    ${q} .tlab { position: absolute; right: 22px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; white-space: nowrap; text-indent: 0; }
    ${q} .tlab::before { content: ""; width: 48px; height: 1px; background: var(--rule2); }
    ${q} .say { font-size: 44px; line-height: 1.2; font-weight: 500; letter-spacing: -.01em; }
  </style>`; },
  /** The three rungs, each `green/steps` from the recorded run at that point. Rungs before `now` are already filled; `now` waits for Loc.light. */
  ladder(D, now) {
    return `<div class="ladder">${D.facts.climb.map((r, k) => `${k ? '<i class="join"></i>' : ""}<div class="rung rung${k}"><span>rung ${k}</span><b class="${r.ok ? "pass" : "fail"}${k < now ? "" : " hidden0"}">${r.green}/${r.steps}</b></div>`).join("")}</div>`;
  },
  /** Light one rung of the meter: its count lands, and it becomes the current one. */
  light(s, k, t) {
    const rung = s.$(".ladder .rung" + k);
    s.tl.to(rung, { opacity: 1, borderColor: "#e9f0fa", duration: 0.3 }, t);
    s.tl.fromTo(rung.querySelector("b"), { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, t);
  },
  /** Type a terminal's command; returns when the typing ends. */
  type(s, el, t, dur = 0.7) {
    const typed = el.querySelector(".typed"), n = typed.textContent.length;
    s.tl.fromTo(el.querySelector(".cmd"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t - 0.1);
    s.tl.fromTo(typed, { width: "0ch" }, { width: n + "ch", duration: dur, ease: `steps(${n})` }, t);
    return t + dur;
  },
  /** Print recorded lines, one after another. */
  print(s, rows, t, each = 0.09) { rows.forEach((r, k) => s.tl.fromTo(r, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "none" }, t + k * each)); return t + rows.length * each; },
  /** The printed lines of a terminal that hold some words; a recording that lost them fails the build. */
  rows(s, sel, words) { const found = s.$$(sel + " .o").filter((o) => (words instanceof RegExp ? words.test(o.textContent) : o.textContent.includes(words))); if (!found.length) throw new Error(sel + ": no printed line holds " + words); return found; },
  /** Light some printed lines and dim the rest of that terminal. `lit` empty puts every line back. */
  lit(s, sel, lit, t, dur = 0.35) {
    const all = s.$$(sel + " .o"), rest = all.filter((o) => !lit.includes(o));
    if (!lit.length) { s.tl.to(all, { opacity: 1, color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: dur }, t); return; }
    s.tl.to(lit, { opacity: 1, color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.13)", duration: dur }, t);
    if (rest.length) s.tl.to(rest, { opacity: 0.38, color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: dur }, t);
  },
  /** Wrap some words of a printed line, where they stand, so they can be lit by themselves. */
  mark(row, words) {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) {
      const at = node.nodeValue.indexOf(words); if (at < 0) continue;
      const hit = node.splitText(at); hit.splitText(words.length);
      const span = document.createElement("span"); span.className = "hit"; hit.parentNode.replaceChild(span, hit); span.appendChild(hit); return span;
    }
    throw new Error("a printed line lost the words " + words);
  },
  /** A label hung at the right of a printed line. */
  label(row, text) { const el = document.createElement("div"); el.className = "tlab hidden0"; el.textContent = text; el.style.top = row.offsetTop + "px"; el.style.lineHeight = getComputedStyle(row).lineHeight; row.parentNode.appendChild(el); return el; },
  /** The handler as it stood at one rung, from its own first line to a later one. */
  handler(D, k) { const rec = D.cap[`climb-${k}-handler-ts`]; if (!rec || rec.text === undefined) throw new Error("no recorded handler for rung " + k); return { ...rec, from: Kit.line(rec.text, /^const claim: Handler/), last: rec.text.replace(/\n$/, "").split("\n").length }; },
};
