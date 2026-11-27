// Shared by this film's sheets, beside the kit: the nine files of the change (sheets 1 and 2), the row of seven operations
// with their proof marks that carries sheets 3 to 5, what the recordings say in numbers, and ways to bring in and light the
// recorded lines of a terminal. Nothing here holds a line of output or of code.
const Rv = {
  /** Fail the build when a recording no longer says what the narration says. */
  must(ok, why) { if (!ok) throw new Error("review: " + why); },
  /** The rows of a recording's output. */
  out(D, cap) { const rec = D.cap[cap]; Rv.must(rec && rec.out !== undefined, "no recording " + cap); return rec.out.split("\n"); },
  /** What one `ortho impact` recording says: the stale and proven operations, and any changed line. */
  impact(D, cap) {
    const rows = Rv.out(D, cap), list = (k) => { const l = rows.find((x) => x.startsWith(k + " ")); Rv.must(l, cap + " has no " + k + " line"); const v = l.slice(k.length + 1); return v === "none" ? [] : v.split(", "); };
    return { stale: list("stale"), proven: list("proven"), changed: rows.filter((l) => l.startsWith("changed ")) };
  },
  /** The change's files from review-stat: one row each, and the total line. */
  stat(D) {
    const rows = Rv.out(D, "review-stat"), files = rows.filter((l) => / \| /.test(l)).map((l) => l.trim().split(/\s+\|/)[0]);
    const total = /^ ?(\d+) files changed/.exec(rows[rows.length - 1]); Rv.must(total, "review-stat has no total line");
    const bp = files.filter((f) => f.startsWith("blueprint/")), gen = files.filter((f) => f.startsWith("generated/"));
    Rv.must(+total[1] === files.length && bp.length + gen.length === files.length, "review-stat lists a file outside blueprint/ and generated/");
    return { files, total: +total[1], bp, gen };
  },
  /** The blueprint's diff: lines out, lines in, and the budget before and after. */
  diff(D) {
    const rows = Rv.out(D, "review-diff"), outs = rows.filter((l) => /^-(?!--)/.test(l)), ins = rows.filter((l) => /^\+(?!\+\+)/.test(l)), hunks = rows.filter((l) => l.startsWith("@@"));
    const ms = (l) => +(/budget: \{ p95: "(\d+) millis" \}/.exec(l) ?? [])[1];
    const was = outs.map(ms).find((n) => n > 0), now = ins.map(ms).find((n) => n > 0);
    Rv.must(was && now, "review-diff does not change the budget");
    return { outs, ins, hunks, was, now };
  },
  /** Every number the narration speaks, from the recordings; a recording that says otherwise fails the build. */
  facts(D) {
    const st = Rv.stat(D), df = Rv.diff(D), before = Rv.impact(D, "review-impact-before"), mid = Rv.impact(D, "review-impact"), after = Rv.impact(D, "review-impact-after");
    const prove = Rv.out(D, "review-prove"), journeys = prove.filter((l) => l.startsWith("journey ")), perf = prove.find((l) => /^handle\.claim performance /.test(l));
    const budget = +((/budget p95 (\d+)ms$/.exec(perf ?? "") ?? [])[1]);
    Rv.must(st.total === 9 && st.bp.length === 1 && st.gen.length === 8, "the change is not nine files, one of them the blueprint's");
    Rv.must(df.outs.length === 2 && df.ins.length === 2 && df.hunks.length === 2, "the blueprint's diff is not two lines out and two in");
    Rv.must(df.was === 150 && df.now === 100 && budget === 100, "the budget does not go from 150 to 100");
    Rv.must(before.stale.length === 0 && before.proven.length === 7, "before the change, impact does not say seven proven and none stale");
    Rv.must(mid.stale.length === 1 && mid.proven.length === 6 && mid.changed.length === 1, "with the change, impact does not name one stale and six standing");
    Rv.must(after.stale.length === 0 && after.proven.length === 7, "after the proof, impact does not say seven proven");
    Rv.must(journeys.length === 7 && journeys.every((l) => / ✔ /.test(l)) && prove[prove.length - 1] === "prove ✔", "the reviewer's proof is not seven passing journeys");
    return { st, df, before, mid, after, journeys, perf, budget };
  },

  /** The look of the shared parts, scoped to one scene. */
  css: (id) => { const q = "#scene-" + id; return `<style>
    ${q} .who { position: absolute; right: 96px; top: 130px; display: flex; align-items: center; gap: 14px; }
    ${q} .who .arrow { font-size: 30px; color: var(--muted); line-height: 1; }
    ${q} .tiles { position: absolute; left: 96px; top: 820px; width: 1728px; }
    ${q} .tiles .lbl { margin-bottom: 12px; display: flex; gap: 22px; } ${q} .tiles .lbl b { color: var(--paper); font-weight: 600; }
    ${q} .tiles .row { display: grid; grid-template-columns: repeat(9, 1fr); gap: 12px; }
    ${q} .tile { position: relative; height: 96px; border: 1.5px solid var(--rule2); background: rgba(14,28,48,.92); padding: 16px 14px 0; overflow: hidden; }
    ${q} .tile::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 5px; background: var(--cyan); }
    ${q} .tile.bp::before { background: var(--paper); } ${q} .tile.bp { border-color: var(--paper); }
    ${q} .tile b { display: block; font-family: var(--label); font-size: 27px; line-height: 30px; font-weight: 600; color: var(--paper); white-space: nowrap; overflow: hidden; letter-spacing: .01em; }
    ${q} .tile span { display: block; font-family: var(--label); font-size: 22px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--cyan); margin-top: 4px; white-space: nowrap; }
    ${q} .tile.bp span { color: var(--text2); }
    ${q} .ops { position: absolute; left: 96px; top: 824px; width: 1728px; }
    ${q} .ops .lbl { display: flex; justify-content: space-between; margin-bottom: 12px; } ${q} .ops .tally { position: relative; display: block; width: 460px; height: 28px; }
    ${q} .ops .tally b { position: absolute; right: 0; top: 0; color: var(--paper); font-weight: 600; white-space: nowrap; }
    ${q} .ops .row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
    ${q} .op { position: relative; height: 98px; border: 1.5px solid var(--rule2); background: rgba(14,28,48,.92); padding: 14px 16px 0; }
    ${q} .op > b { display: block; font-family: var(--mono); font-size: 22px; font-weight: 500; color: var(--text2); white-space: nowrap; letter-spacing: -.02em; }
    ${q} .op .mk { position: absolute; left: 16px; top: 56px; font-family: var(--label); font-size: 22px; font-weight: 600; letter-spacing: .13em; text-transform: uppercase; white-space: nowrap; visibility: hidden; opacity: 0; }
    ${q} .op .mk.ok { color: var(--muted); } ${q} .op .mk.ok i { font-style: normal; color: var(--green); margin-right: 10px; letter-spacing: 0; }
    ${q} .op .mk.st { color: var(--paper); } ${q} .op .mk.st i { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--paper); border-radius: 50%; margin-right: 12px; vertical-align: -1px; }
    ${q} .op .dash { position: absolute; inset: -1.5px; border: 2px dashed var(--paper); visibility: hidden; opacity: 0; }
    ${q} .term .o .hit { transition: none; }
    ${q} .tlab { position: absolute; right: 22px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 22px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; white-space: nowrap; text-indent: 0; background: rgba(12,24,42,.96); padding-left: 10px; }
    ${q} .tlab::before { content: ""; width: 48px; height: 1px; background: var(--rule2); }
    ${q} .say { font-size: 44px; line-height: 1.2; font-weight: 500; letter-spacing: -.01em; }
  </style>`; },

  /** The nine files of the change, read from review-stat: the blueprint's in white ink, the generated ones in cyan. */
  tiles(D, label = "the change") {
    const st = Rv.stat(D);
    const tile = (f) => { const parts = f.split("/"), bp = f.startsWith("blueprint/"); return `<div class="tile ${bp ? "bp" : "gen"}"><b>${Film.esc(parts[parts.length - 1])}</b><span>${bp ? "blueprint" : Film.esc(parts[1])}</span></div>`; };
    return `<div class="tiles"><div class="lbl"><span>${label}</span><b>${st.total} files</b></div><div class="row">${[...st.bp, ...st.gen].map(tile).join("")}</div></div>`;
  },

  /** The row of seven operations. `caps` are the impact recordings it will be set from; each gets its own tally, hidden. */
  ops(D, caps, label = "operations, as ortho impact reports them") {
    const first = Rv.impact(D, caps[0]), names = [...first.stale, ...first.proven].sort();
    Rv.must(names.join() === [...D.facts.operations].sort().join(), "the impact recording does not list the model's operations");
    const tally = (cap) => { const r = Rv.impact(D, cap); return `<b class="t-${cap} hidden0">${r.proven.length} proven · ${r.stale.length} stale</b>`; };
    return `<div class="ops"><div class="lbl"><span>${names.length} ${label}</span><span class="tally">${caps.map(tally).join("")}</span></div>
      <div class="row">${names.map((n) => `<div class="op" data-op="${n}"><i class="dash"></i><b>${Film.esc(n)}</b><span class="mk ok"><i>✔</i>proven</span><span class="mk st"><i></i>stale</span></div>`).join("")}</div></div>`;
  },
  /** Set the row from one impact recording at a moment: each operation's mark, and that recording's tally. `now` sets it at once. */
  set(s, cap, t, { now = false, stagger = 0.06 } = {}) {
    const r = Rv.impact(s.D, cap), d = now ? 0.01 : 0.3;
    s.$$(".op").forEach((op, k) => {
      const name = op.dataset.op, st = r.stale.includes(name), ok = r.proven.includes(name), at = t + (now ? 0 : k * stagger);
      s.tl.to(op.querySelector(".mk.ok"), { autoAlpha: ok ? 1 : 0, duration: d }, at);
      s.tl.to(op.querySelector(".mk.st"), { autoAlpha: st ? 1 : 0, duration: d }, at);
      s.tl.to(op.querySelector(".dash"), { autoAlpha: st ? 1 : 0, duration: d }, at);
      s.tl.to(op.querySelector(":scope > b"), { color: st ? "#e9f0fa" : "#a9bcd6", duration: d }, at);
    });
    s.$$(".ops .tally b").forEach((b) => s.tl.to(b, { autoAlpha: b.classList.contains("t-" + cap) ? 1 : 0, duration: d }, t));
  },
  /** Pulse some operations of the row. */
  pulse(s, names, t) { const els = s.$$(".op").filter((o) => names.includes(o.dataset.op)); s.tl.fromTo(els, { borderColor: "rgba(132,170,222,.36)" }, { borderColor: "#e9f0fa", duration: 0.3, yoyo: true, repeat: 1 }, t); },

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
  /** Light a marked word. */
  hit(s, el, t) { s.tl.to(el, { color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.3)", duration: 0.3 }, t); },
  /** A label hung at the right of a printed line. */
  label(row, text) { const el = document.createElement("div"); el.className = "tlab hidden0"; el.textContent = text; el.style.top = row.offsetTop + "px"; el.style.lineHeight = getComputedStyle(row).lineHeight; row.parentNode.appendChild(el); return el; },
};
