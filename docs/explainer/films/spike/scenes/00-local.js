// Shared by this film's sheets, beside the kit: the spike's recorded run read into counts, ways and examples; the ledger strip that
// carries the film; the page (the spike's README) quoted by its own line numbers; and a few ways to bring in and light the
// recorded lines of a terminal. Nothing here holds a line of output, of code or of the page.
const Loc = {
  /** The look of the shared parts, scoped to one scene. */
  css: (id) => { const q = "#scene-" + id; return `<style>
    ${q} .who { position: absolute; right: 96px; top: 130px; display: flex; align-items: center; gap: 14px; }
    ${q} .who .arrow { font-size: 30px; color: var(--muted); line-height: 1; }
    ${q} .lbl { font-size: 22px; }
    ${q} .tlab { position: absolute; right: 22px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; white-space: nowrap; text-indent: 0; }
    ${q} .tlab::before { content: ""; width: 48px; height: 1px; background: var(--rule2); }
    ${q} .say { font-size: 40px; line-height: 1.2; font-weight: 500; letter-spacing: -.01em; }
    ${q} .strip { position: absolute; display: flex; }
    ${q} .cell { width: 240px; display: flex; flex-direction: column; border: 1.5px solid var(--rule2); background: rgba(14,28,48,.92); }
    ${q} .strip .cell + .cell { margin-left: -1.5px; }
    ${q} .cell .evn { height: 62px; padding: 6px 14px 0; font-size: 22px; line-height: 25px; color: var(--paper); display: flex; align-items: center; border-bottom: 1px solid var(--rule); text-wrap: balance; }
    ${q} .cell .bal { height: 46px; padding: 0 14px; font-family: var(--mono); font-size: 32px; line-height: 46px; font-weight: 500; text-align: right; font-variant-numeric: tabular-nums; color: var(--paper); }
    ${q} .cell.none { border-style: dashed; background: none; }
    ${q} .cell .bal.under { color: var(--cyan); }
    ${q} .term.again .cmd { color: var(--muted); } ${q} .term.again .cur { display: none; }
    ${q} .code .ln .hit, ${q} .term .o .hit { transition: none; }
    ${q} .page .code .ln.gap { margin-top: 14px; }
  </style>`; },

  // ---- the recorded run ----------------------------------------------------------------------------------------------
  /** The spike's run, read from its recording: the events, the counts, and each way with its printed lines and its first example. */
  run(D) {
    const rec = D.cap["spike-run"]; if (!rec || rec.cmd === undefined) throw new Error("no recording spike-run");
    const out = rec.out, rows = out.split("\n"), one = (re) => { const m = re.exec(out); if (!m) throw new Error("spike-run: no line matches " + re); return m; };
    const played = one(/^played: (\d+) events on one wallet, in every order they can happen: (\d+) orders\n  (.+)$/m), events = played[3].split(" · ");
    if (events.length !== +played[1]) throw new Error("spike-run: the events line does not hold the count it prints");
    const early = +one(/^in (\d+) orders the reversal comes before A clears: every rule is kept/m)[1], late = +one(/^in (\d+) orders the reversal is late/m)[1];
    const cannot = +one(/^in (\d+) of those the holder had already withdrawn, and what is left cannot cover it$/m)[1], total = +played[2];
    if (early + late !== total) throw new Error("spike-run: early and late orders do not add up to the orders played");
    const example = (l) => { const m = /^    for example: (.+)$/.exec(l); return m && m[1].split(", ").map((part) => { const e = /^(.+) → (-?\d+)$/.exec(part); if (!e || !events.includes(e[1])) throw new Error("spike-run: an example names an event that was not played: " + part); return { name: e[1], bal: e[2] }; }); };
    // A way is a block that opens with a line at the margin and goes on with indented lines, until a blank line.
    const ways = [];
    rows.forEach((l, k) => { if (l && !l.startsWith(" ") && /^  (kept|broken) in /.test(rows[k + 1] ?? "")) { let to = k; while (rows[to + 1]) to++; ways.push({ name: l, from: k, to, lines: rows.slice(k + 1, to + 1) }); } });
    ways.forEach((w) => {
      w.example = w.lines.map(example).find(Boolean); if (!w.example) throw new Error("spike-run: no example under " + w.name);
      w.rules = w.lines.map((l) => /^  (kept in all (\d+)|broken in (\d+) of (\d+)): (.+)$/.exec(l)).filter(Boolean).map((m) => ({ kept: !m[3], n: +(m[3] ?? m[2]), of: +(m[4] ?? m[2]), rule: m[5] }));
    });
    return { rec, rows, events, total, early, late, cannot, ways };
  },
  /** The narration's line must say this number, in digits or as a word: a number the recording no longer gives fails the build. */
  said(D, id, n) {
    const l = D.timing.scenes.flatMap((sc) => sc.lines).find((x) => x.id === id); if (!l) throw new Error("no line " + id);
    const word = { 2: "two", 3: "three", 5: "five", 7: "seven", 8: "eight" }[n], heard = l.words.map((w) => w.w.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean);
    const digits = heard.join(" ").replace(/(\d) (?=\d{3}( |$))/g, "$1").split(" ");
    if (!digits.includes(String(n)) && !(word && heard.includes(word))) throw new Error(`${id}: the narration does not say ${n}, the number the recording gives`);
    return n;
  },

  // ---- the ledger strip ------------------------------------------------------------------------------------------------
  /** One wallet's events in a row, the balance under each. `cols` are the event names that head the columns; a column the order skips is left open. */
  strip(order, { cols, cls = "", at = "", width } = {}) {
    const heads = cols ?? order.map((e) => e.name);
    order.forEach((e) => { if (!heads.includes(e.name)) throw new Error("the strip has no column for " + e.name); });
    const last = order[order.length - 1];
    return `<div class="strip ${cls}" style="${at}">${heads.map((name, k) => { const e = order.find((x) => x.name === name);
      return e ? `<div class="cell ev${k}${e === last ? " end" : ""}"${width ? ` style="width:${width}px"` : ""}><span class="evn">${Film.esc(e.name)}</span><b class="bal${+e.bal < 0 ? " under" : ""}">${Film.esc(e.bal)}</b></div>`
        : `<div class="cell none ev${k}"${width ? ` style="width:${width}px"` : ""}><span class="evn"></span><b class="bal"></b></div>`; }).join("")}</div>`;
  },

  // ---- the page ----------------------------------------------------------------------------------------------------
  /** The spike's page, as it stands in the repository. */
  readme(D) { const path = "spikes/pay-by-name-reversal/README.md", text = D.repo[path]; if (text === undefined) throw new Error("no file " + path); return { path, text }; },
  /** An editor that quotes some lines of the page, by their own numbers. A jump between lines shows as a gap. */
  page(D, { id, x, y, w, lines, size = "", tag = "", cls = "" }) {
    const { path, text } = Loc.readme(D), from = Math.min(...lines), to = Math.max(...lines), hide = [], gaps = [];
    for (let n = from; n <= to; n++) { if (!lines.includes(n)) hide.push(n); else if (n > from && !lines.includes(n - 1)) gaps.push(n); }
    const css = (hide.length ? hide.map((n) => `#${id} .ln[data-n="${n}"]`).join(",") + "{display:none}" : "") + (gaps.length ? gaps.map((n) => `#${id} .ln[data-n="${n}"]`).join(",") + "{margin-top:14px}" : "");
    return `<style>${css}</style><div class="panel page ${cls}" id="${id}" style="left:${x}px;top:${y}px;width:${w}px">${Film.editor(id, path, Film.code(text, { lang: "text", from, to, size }), tag)}</div>`;
  },
  /** The numbers of a run of lines of a text: from the line that matches to the first later line that holds `until`. */
  span(text, re, until) { const from = Kit.line(text, re), rows = text.split("\n"); let to = from; if (until) { while (to <= rows.length && !rows[to - 1].includes(until)) to++; if (to > rows.length) throw new Error("no line after " + re + " holds " + until); } return Array.from({ length: to - from + 1 }, (_, k) => from + k); },

  // ---- terminals -----------------------------------------------------------------------------------------------------
  /** Type a terminal's command; returns when the typing ends. */
  type(s, el, t, dur = 0.7) {
    const typed = el.querySelector(".typed"), n = typed.textContent.length;
    s.tl.fromTo(el.querySelector(".cmd"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t - 0.1);
    s.tl.fromTo(typed, { width: "0ch" }, { width: n + "ch", duration: dur, ease: `steps(${n})` }, t);
    return t + dur;
  },
  /** A command that was typed before this panel came in: it is shown whole. */
  typedAlready(s, el, t) { s.tl.fromTo(el.querySelector(".cmd"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t); s.tl.fromTo(el.querySelector(".typed"), { width: "auto" }, { width: "auto", duration: 0.01 }, t); },
  /** Print recorded lines, one after another. */
  print(s, rows, t, each = 0.09) { rows.forEach((r, k) => s.tl.fromTo(r, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "none" }, t + k * each)); return t + rows.length * each; },
  /** The printed lines of a terminal that hold some words; a recording that lost them fails the build. */
  rows(s, sel, words) { const found = s.$$(sel + " .o").filter((o) => (words instanceof RegExp ? words.test(o.textContent) : o.textContent.includes(words))); if (!found.length) throw new Error(sel + ": no printed line holds " + words); return found; },
  /** Light some printed lines and dim the rest of that terminal. `lit` empty puts every line back. */
  lit(s, sel, lit, t, dur = 0.35) {
    const all = s.$$(sel + " .o"), rest = all.filter((o) => !lit.includes(o));
    if (!lit.length) { s.tl.to(all, { opacity: 1, color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: dur }, t); return; }
    s.tl.to(lit, { opacity: 1, color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.13)", duration: dur }, t);
    if (rest.length) s.tl.to(rest, { opacity: 0.45, color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: dur }, t);
  },
  /** Wrap some words of a printed or quoted line, where they stand, so they can be lit by themselves. */
  mark(row, words) {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) {
      const at = node.nodeValue.indexOf(words); if (at < 0) continue;
      const hit = node.splitText(at); hit.splitText(words.length);
      const span = document.createElement("span"); span.className = "hit"; hit.parentNode.replaceChild(span, hit); span.appendChild(hit); return span;
    }
    throw new Error("a line lost the words " + words);
  },
  /** A label hung at the right of a printed line. */
  label(row, text) { const el = document.createElement("div"); el.className = "tlab hidden0"; el.textContent = text; el.style.top = row.offsetTop + "px"; el.style.lineHeight = getComputedStyle(row).lineHeight; row.parentNode.appendChild(el); return el; },
  /** A quoted line of an editor, by its own number. */
  ln(s, sel, n) { return s.$(`${sel} .ln[data-n="${n}"] code`); },
};
