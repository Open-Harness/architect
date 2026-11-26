// Shared by this film's sheets, beside the kit: the list of blanks with its number (the picture that carries the film), the plan
// page's own lines, the spoken counts held against the recordings, and a few ways to print and light a terminal's recorded lines.
// Nothing here holds a line of output or of code.
const Loc = {
  /** The look of the shared parts, scoped to one scene. A blank is drawn as a dashed box: a question, never a failure. */
  css: (id) => { const q = "#scene-" + id; return `<style>
    ${q} .who { position: absolute; right: 96px; top: 130px; display: flex; align-items: center; gap: 14px; }
    ${q} .band { position: absolute; left: 96px; width: 1728px; bottom: 106px; display: flex; align-items: stretch; border: 1.5px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); }
    ${q} .band .num { flex: none; width: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border-right: 1px solid var(--rule2); }
    ${q} .band .digits { position: relative; width: 100%; height: 112px; } ${q} .band .cnt { position: absolute; left: 0; right: 0; top: 0; text-align: center; font-size: 116px; line-height: 112px; font-weight: 500; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
    ${q} .band .num .lbl { font-size: 22px; color: var(--text2); }
    ${q} .band .rows { flex: 1; min-width: 0; padding: 14px 26px; }
    ${q} .brow { display: flex; align-items: center; gap: 18px; height: 38px; overflow: hidden; white-space: nowrap; }
    ${q} .brow .box, ${q} .box { flex: none; display: inline-block; width: 20px; height: 20px; border: 2px dashed var(--paper); }
    ${q} .brow .ask { font-size: 24px; color: var(--paper); } ${q} .brow .addr { margin-left: auto; font-family: var(--mono); font-size: 19px; color: var(--text2); }
    ${q} .brow .stay { font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); padding: 0 10px; border: 1.5px solid var(--paper); line-height: 28px; }
    ${q} .code .todo { outline: 2px dashed var(--paper); outline-offset: 2px; }
    ${q} .term .o .hit { transition: none; }
    ${q} .tlab { position: absolute; right: 22px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; white-space: nowrap; text-indent: 0; }
    ${q} .tlab::before { content: ""; width: 48px; height: 1px; background: var(--rule2); }
    ${q} .say { font-size: 40px; line-height: 1.2; font-weight: 500; letter-spacing: -.01em; }
    ${q} .strip { padding: 12px 22px; } ${q} .strip .pline { font-family: var(--mono); font-size: 21px; line-height: 32px; color: var(--text2); } ${q} .strip .hit { color: var(--text2); }
  </style>`; },
  who: (kind, label) => `<div class="who">${Kit.who(kind, label)}</div>`,

  /** The check's list of blanks, read from one recording of `ortho check`: the thing, the number it prints, and each blank's file, line and question. */
  blanks(D, cap) {
    const rec = D.cap[cap]; if (!rec || rec.out === undefined) throw new Error("no recording " + cap);
    const out = rec.out.split("\n"), at = out.findIndex((l) => /^\S+ has \d+ blanks?$/.test(l)); if (at < 0) throw new Error(cap + ": the check no longer prints a count of blanks");
    const [, thing, n] = /^(\S+) has (\d+) blanks?$/.exec(out[at]), rows = [];
    for (let i = at + 1; i < out.length && /^  \S/.test(out[i]); i++) { const m = /^  (\S+):(\d+)  (.+)$/.exec(out[i]); if (!m) throw new Error(cap + ": a blank is not a file, a line and a question: " + out[i]); rows.push({ file: m[1], line: +m[2], ask: m[3] }); }
    if (rows.length !== +n) throw new Error(`${cap}: the check says ${n} blanks and lists ${rows.length}`);
    return { thing, count: +n, rows, lines: at + 1 + rows.length };
  },
  words: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"],
  /** A count as the narration would say it. */
  word(n) { const w = Loc.words[n]; if (!w) throw new Error("no word for " + n); return w; },
  /** A count the narration speaks, held against what a recording says: the build fails when they differ. */
  spoken(D, id, re, ...want) {
    const line = D.timing.scenes.flatMap((sc) => sc.lines).find((l) => l.id === id); if (!line) throw new Error("no line " + id);
    const m = re.exec(line.text); if (!m) throw new Error(`line ${id} no longer says ${re}: "${line.text}"`);
    want.forEach((n, k) => { const said = Loc.words.indexOf(m[k + 1].toLowerCase()); if (said !== n) throw new Error(`line ${id} says "${m[k + 1]}" and the recording says ${n}`); });
  },
  /** The list of questions with its number. `then` names a later recording: the rows it no longer lists are the ones that leave. */
  band(D, cap, then) {
    const b = Loc.blanks(D, cap), later = then ? Loc.blanks(D, then) : null, same = (a) => (z) => z.file === a.file && z.ask === a.ask;
    if (later && !later.rows.every((z) => b.rows.some(same(z)))) throw new Error(then + " lists a blank that " + cap + " does not");
    return `<div class="band"><div class="num"><span class="lbl">${Film.esc(b.thing)}</span><div class="digits"><b class="cnt was">${b.count}</b>${later ? `<b class="cnt next hidden0">${later.count}</b>` : ""}</div><span class="lbl">blanks</span></div>
      <div class="rows">${b.rows.map((a) => `<div class="brow${later && !later.rows.some(same(a)) ? " goes" : ""}"><i class="box"></i><span class="ask">${Film.esc(a.ask)}</span><em class="stay hidden0" style="font-style:normal"></em><span class="addr">${Film.esc(a.file)}:${a.line}</span></div>`).join("")}</div></div>`;
  },
  /** The rows of the list that hold some words; a recording that lost them fails the build. */
  asks(s, words) { const found = s.$$(".band .brow").filter((o) => (words instanceof RegExp ? words.test(o.textContent) : o.textContent.includes(words))); if (!found.length) throw new Error("the list has no row with " + words); return found; },
  /** Light some rows of the list and dim the rest; empty puts every row back. */
  only(s, rows, t, dur = 0.3) {
    const all = s.$$(".band .brow");
    if (!rows.length) { s.tl.to(all, { opacity: 1, backgroundColor: "rgba(98,198,255,0)", duration: dur }, t); return; }
    s.tl.to(rows, { opacity: 1, backgroundColor: "rgba(98,198,255,.13)", duration: dur }, t); const rest = all.filter((o) => !rows.includes(o)); if (rest.length) s.tl.to(rest, { opacity: 0.4, backgroundColor: "rgba(98,198,255,0)", duration: dur }, t);
  },
  /** The number draws the eye for a moment. */
  pulse(s, t) { s.tl.fromTo(s.$$(".band .cnt"), { scale: 1 }, { scale: 1.18, duration: 0.22, yoyo: true, repeat: 1, ease: "power2.out" }, t); },

  /** The plan page's own lines, by section; a page that lost one fails the build. */
  plan(D) {
    const rec = D.cap["plan-page"]; if (!rec) throw new Error("no recording plan-page");
    const lines = rec.out.split("\n"), sect = (head) => { const at = lines.indexOf(head); if (at < 0) throw new Error("the plan page has no section " + head); const body = []; for (let i = at + 1; i < lines.length && lines[i] !== ""; i++) body.push(lines[i]); return body; };
    const wallet = sect("Things").find((l) => /^- Wallet\b/.test(l)); if (!wallet) throw new Error("the plan page no longer names a wallet");
    return { idea: sect("The idea, said back"), wallet, doubts: sect("Doubts"), first: sect("First question") };
  },
  /** One line of the plan page, in a box. */
  strip(D, { id, x, y, w, label = "the plan page · things", cls = "" }) { return `<div class="kbox strip ${cls}" id="${id}" style="left:${x}px;top:${y}px;width:${w}px"><div class="lbl">${label}</div><div class="pline">${Film.esc(Loc.plan(D).wallet)}</div></div>`; },
  /** The files a recorded `ortho add` wrote. */
  wrote(D, cap) { const rec = D.cap[cap]; if (!rec) throw new Error("no recording " + cap); const files = rec.out.split("\n").map((l) => /^wrote (\S+)$/.exec(l)).filter(Boolean).map((m) => m[1]); if (!files.length) throw new Error(cap + " wrote nothing"); return files; },
  /** Wrap each Blueprint.todo(…) of an editor's body, where it stands, so the blank can be drawn round it. */
  todo(body) {
    const marks = [];
    body.querySelectorAll(".ln > code").forEach((code) => {
      const kids = [...code.childNodes], a = kids.findIndex((n, k) => n.textContent === "Blueprint" && kids[k + 2]?.textContent === "todo"); if (a < 0) return;
      const z = kids.findIndex((n, k) => k > a + 3 && n.textContent === ")"); if (z < 0) throw new Error("a blank has no end: " + code.textContent);
      const range = document.createRange(); range.setStartBefore(kids[a]); range.setEndAfter(kids[z]);
      const span = document.createElement("span"); span.className = "todo"; range.surroundContents(span); marks.push(span);
    });
    if (!marks.length) throw new Error("no Blueprint.todo in this file");
    return marks;
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
  /** Wrap some words of a line, where they stand, so they can be lit by themselves. */
  mark(row, words) {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) {
      const m = words instanceof RegExp ? words.exec(node.nodeValue) : null, at = m ? m.index : words instanceof RegExp ? -1 : node.nodeValue.indexOf(words); if (at < 0) continue;
      const hit = node.splitText(at); hit.splitText(m ? m[0].length : words.length);
      const span = document.createElement("span"); span.className = "hit"; hit.parentNode.replaceChild(span, hit); span.appendChild(hit); return span;
    }
    throw new Error("a line lost the words " + words + ": " + row.textContent);
  },
  /** A label hung at the right of a printed line. */
  label(row, text) { const el = document.createElement("div"); el.className = "tlab hidden0"; el.textContent = text; el.style.top = row.offsetTop + "px"; el.style.lineHeight = getComputedStyle(row).lineHeight; row.parentNode.appendChild(el); return el; },
  /** Swap one editor for another in the same place: a file as it stood, then as it stands. */
  becomes(s, a, b, t) { s.tl.to(s.$(a), { autoAlpha: 0, duration: 0.35 }, t); s.tl.fromTo(s.$(b), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, t); },
};
