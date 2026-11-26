// Shared by this film's sheets, beside the kit: the row of seven operations, one dot each, that carries the film (proven,
// stale, unproven, as `ortho impact` recorded them), the people at the head of a sheet, and ways to print and light the
// recorded lines of a terminal. Nothing here holds a line of output or of code.
const Chg = {
  css: (id) => { const q = "#scene-" + id; return `<style>
    ${q} .whorow { position: absolute; right: 96px; top: 134px; display: flex; align-items: center; gap: 12px; }
    ${q} .whorow .arw { font-size: 28px; color: var(--muted); line-height: 1; }
    ${q} .band { position: absolute; left: 96px; top: 864px; width: 1728px; height: 104px; display: flex; align-items: center; border-top: 1px solid var(--rule2); padding-top: 14px; }
    ${q} .band .bl { width: 330px; flex: none; }
    ${q} .band .cnt { position: relative; height: 40px; margin-top: 6px; }
    ${q} .band .cn { position: absolute; left: 0; top: 0; font-family: var(--mono); font-size: 22px; color: var(--paper); white-space: nowrap; opacity: 0; }
    ${q} .band .dots { flex: 1; display: grid; grid-template-columns: repeat(var(--n), 1fr); }
    ${q} .band .op { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    ${q} .band .dot { position: relative; width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--rule2); }
    ${q} .band .dot i { position: absolute; inset: -2px; border-radius: 50%; opacity: 0; }
    ${q} .band .dot .lf { background: var(--green); } ${q} .band .dot .ls { border: 3px dashed var(--paper); } ${q} .band .dot .lu { border: 3px solid var(--muted); }
    ${q} .band .dot .lc { inset: -11px; border: 2px solid var(--cyan); }
    ${q} .band .nm { font-family: var(--mono); font-size: 20px; color: var(--text2); white-space: nowrap; }
    ${q} .band .tip { position: absolute; bottom: 118px; transform: translateX(-50%); font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--cyan); white-space: nowrap; }
    ${q} .tlab { position: absolute; right: 22px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; white-space: nowrap; text-indent: 0; }
    ${q} .tlab::before { content: ""; width: 48px; height: 1px; background: var(--rule2); }
    ${q} .say { font-size: 44px; line-height: 1.2; font-weight: 500; letter-spacing: -.01em; }
    ${q} .term .o .hit { position: relative; }
  </style>`; },

  /** What `ortho impact` printed, line by line; "none" is an empty list. A recording without a line it needs fails the build. */
  impact(out, need = []) {
    const rows = out.split("\n"), list = (word) => { const r = rows.find((l) => l.startsWith(word + " ")); if (!r) return undefined; const v = r.slice(word.length + 1); return v === "none" ? [] : v.split(", "); };
    const got = { changed: rows.filter((l) => l.startsWith("changed ")), stale: list("stale"), proven: list("proven"), unproven: list("unproven") };
    need.forEach((k) => { if (got[k] === undefined) throw new Error("ortho impact printed no line " + k); });
    return got;
  },
  /** The operations, in the order the record names them: the proven line of the run before the change. */
  ops(D) {
    const ops = Chg.impact(D.cap["change-impact-before"].out, ["proven", "stale"]).proven;
    if (ops.length !== D.facts.operations.length || !D.facts.operations.every((o) => ops.includes(o))) throw new Error("the record before the change does not name every operation as proven");
    return ops;
  },
  /** A number the narration speaks, checked against the recording it came from. */
  need(value, spoken, what) { if (value !== spoken) throw new Error(`${what}: the recording gives ${value}, the narration says ${spoken}`); return value; },
  /** The counter for one state, in the words the recording used. */
  says: (list) => (list.length ? String(list.length) : "none"),

  /** The row of operations. `state` is how it opens: blank, proven, stale or unproven. `counts` maps each state to its counter line. */
  band(D, state, counts) {
    const ops = Chg.ops(D), layer = { proven: "lf", stale: "ls", unproven: "lu" }[state];
    return `<div class="band" style="--n:${ops.length}"><div class="bl"><div class="lbl">the proof record</div><div class="cnt">${Object.entries(counts).map(([k, v]) => `<span class="cn cn-${k}"${k === state ? ' style="opacity:1"' : ""}>${Film.esc(v)}</span>`).join("")}</div></div>
      <div class="dots">${ops.map((op) => `<div class="op" data-op="${op}"><span class="dot">${["lf", "ls", "lu", "lc"].map((l) => `<i class="${l}"${l === layer ? ' style="opacity:1"' : ""}></i>`).join("")}</span><span class="nm">${Film.esc(op)}</span></div>`).join("")}</div></div>`;
  },
  /** Turn every dot to a state together, and swap the counter. */
  turn(s, state, t, stagger = 0.05) {
    const layer = { proven: "lf", stale: "ls", unproven: "lu" }[state];
    s.tl.to(s.$$(".band .dot i:not(.lc):not(." + layer + ")"), { opacity: 0, duration: 0.3 }, t);
    s.tl.fromTo(s.$$(".band .dot ." + layer), { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.4, stagger, ease: "back.out(2)" }, t);
    const others = s.$$(".band .cn:not(.cn-" + state + ")"); if (others.length) s.tl.to(others, { opacity: 0, duration: 0.25 }, t);
    s.tl.to(s.$(".band .cn-" + state), { opacity: 1, duration: 0.3 }, t + 0.1);
  },
  /** Ring one operation's dot in cyan, with a word above it; returns the ring and the word so they can go again. */
  ring(s, op, t, word) {
    const cell = s.$(`.band .op[data-op="${op}"]`), ring = cell.querySelector(".lc");
    s.tl.fromTo(ring, { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 0.35 }, t);
    if (!word) return [ring];
    const tip = document.createElement("div"); tip.className = "tip hidden0"; tip.textContent = word; s.$(".band").appendChild(tip);
    tip.style.left = cell.offsetLeft + cell.offsetWidth / 2 + "px"; s.in(tip, t + 0.05, { y: 8, dur: 0.3 });
    return [ring, tip];
  },

  /** The people at the head of the sheet, in the order they act. Each is hidden until `Chg.act` brings it in. */
  who(list) { return `<div class="whorow">${list.map(([kind, label], k) => `${k ? `<span class="arw hidden0 arw${k}">→</span>` : ""}<span class="wi hidden0 wi${k}">${Kit.who(kind, label)}</span>`).join("")}</div>`; },
  /** The k-th person acts: they come in, the arrow before them, and the others step back. */
  act(s, k, t) {
    const all = s.$$(".whorow .wi"); if (!all[k]) throw new Error("no person " + k);
    if (k) s.in(".whorow .arw" + k, t, { x: -8, y: 0, dur: 0.3 });
    s.in(all[k], t, { x: -8, y: 0, dur: 0.35 }); all.forEach((w, i) => { if (i < k) s.tl.to(w, { opacity: 0.4, duration: 0.3 }, t); });
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
    if (!lit.length) { s.tl.to(all, { opacity: 1, backgroundColor: "rgba(98,198,255,0)", duration: dur }, t); return; }
    s.tl.to(lit, { opacity: 1, color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.13)", duration: dur }, t);
    if (rest.length) s.tl.to(rest, { opacity: 0.38, backgroundColor: "rgba(98,198,255,0)", duration: dur }, t);
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
  /** Light a mark. */
  glow(s, mark, t) { s.tl.to(mark, { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, t); },
  /** A label hung at the right of a printed line. */
  label(row, text) { const el = document.createElement("div"); el.className = "tlab hidden0"; el.textContent = text; el.style.top = row.offsetTop + "px"; el.style.lineHeight = getComputedStyle(row).lineHeight; row.parentNode.appendChild(el); return el; },
};
