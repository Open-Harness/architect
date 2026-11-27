// Shared by this film's sheets, beside the kit: the budget bar that carries the film (one row for each operation that was
// called, its p95 drawn to scale against the line of its budget, watch's own mark at the end), the numbers read out of the
// recordings, and a few ways to bring in and light recorded lines. Nothing here holds a line of output or of code.
const Loc = {
  X0: 330, PX: 7.2, // the track starts 330px into the panel; one millisecond is 7.2px, the same on every sheet
  css: (id) => { const q = "#scene-" + id; return `<style>
    ${q} .who { position: absolute; right: 96px; top: 130px; display: flex; align-items: center; gap: 14px; }
    ${q} .who .arrow { font-size: 30px; color: var(--muted); line-height: 1; }
    ${q} .tlab { position: absolute; right: 22px; font-family: var(--label); text-transform: uppercase; letter-spacing: .13em; font-size: 21px; font-weight: 600; color: var(--paper); display: flex; align-items: center; gap: 14px; white-space: nowrap; text-indent: 0; background: rgba(12,24,42,.96); padding-left: 10px; }
    ${q} .tlab::before { content: ""; width: 48px; height: 1px; background: var(--rule2); }
    ${q} .say { font-size: 44px; line-height: 1.2; font-weight: 500; letter-spacing: -.01em; }
    ${q} .term .o .hit { transition: none; }
    ${q} .bpan { position: absolute; left: 96px; width: 1728px; border: 1px solid var(--rule2); background: linear-gradient(180deg, rgba(19,37,62,.92), rgba(12,24,42,.94)); overflow: hidden; }
    ${q} .bpan .bhead { height: 46px; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; border-bottom: 1px solid var(--rule); }
    ${q} .bpan .bhead .lbl { font-size: 21px; } ${q} .bpan .bhead .lbl b { color: var(--paper); font-weight: 600; }
    ${q} .brow { position: absolute; left: 0; right: 0; height: 84px; }
    ${q} .bname { position: absolute; left: 26px; top: 40px; font-family: var(--mono); font-size: 25px; color: var(--paper); }
    ${q} .btrack { position: absolute; left: ${Loc.X0}px; top: 46px; height: 28px; width: ${Math.round(160 * Loc.PX)}px; background: rgba(132,170,222,.07); }
    ${q} .bfill { position: absolute; left: ${Loc.X0}px; top: 46px; height: 28px; width: 0; background: #a9bcd6; }
    ${q} .bval { position: absolute; top: 42px; font-family: var(--mono); font-size: 23px; color: var(--paper); white-space: nowrap; }
    ${q} .bline { position: absolute; top: 34px; width: 4px; height: 52px; margin-left: -2px; background: var(--paper); }
    ${q} .bline .bl { position: absolute; left: 50%; bottom: 54px; transform: translateX(-50%); font-family: var(--label); text-transform: uppercase; letter-spacing: .12em; font-size: 22px; font-weight: 600; color: var(--paper); white-space: nowrap; }
    ${q} .bmark { position: absolute; left: 1530px; top: 30px; width: 50px; height: 50px; font-size: 40px; line-height: 50px; text-align: center; }
    ${q} .bmark span { position: absolute; inset: 0; } ${q} .bmark .ok { color: var(--green); } ${q} .bmark .no { color: var(--red); }
    ${q} .bcalls { position: absolute; left: 1600px; top: 42px; width: 110px; font-family: var(--mono); font-size: 23px; color: var(--text2); white-space: nowrap; }
    ${q} .bcalls span { position: absolute; left: 0; top: 0; }
    ${q} .baxis { position: absolute; left: 0; right: 0; height: 30px; }
    ${q} .baxis i { position: absolute; top: 0; width: 1px; height: 10px; background: var(--rule2); }
    ${q} .baxis b { position: absolute; top: 8px; transform: translateX(-50%); font-family: var(--mono); font-size: 19px; font-weight: 400; color: var(--muted); }
    ${q} .bempty { position: absolute; left: 26px; top: 70px; font-size: 28px; color: var(--muted); }
  </style>`; },

  // ---- numbers, read from the recordings: a recording that lost one fails the build ----------------------------------
  need(ok, what) { if (!ok) throw new Error("watch: " + what); },
  /** The operation lines of a watch: `profile.get p95 22ms (budget 150ms) ✔`. */
  ops(out) {
    const rows = out.split("\n").map((l) => /^(\S+) p95 (\d+)ms \(budget (\d+)ms\) ([✔✘])$/.exec(l)).filter(Boolean).map((m) => ({ op: m[1], p95: +m[2], budget: +m[3], ok: m[4] === "✔" }));
    Loc.need(rows.length, "a watch recording has no operation lines"); return rows;
  },
  op(out, name) { const r = Loc.ops(out).find((o) => o.op === name); Loc.need(r, "no line for " + name); return r; },
  /** The calls line of a watch, as { operation: count }. */
  calls(out) {
    const m = /^calls: (.+)$/m.exec(out); Loc.need(m, "a watch recording has no calls line");
    return Object.fromEntries([...m[1].matchAll(/(\S+) (\d+)/g)].map((x) => [x[1], +x[2]]));
  },
  /** A number the narration speaks must be the one computed. */
  says(n, spoken, what) { Loc.need(n === spoken, `the narration says ${spoken} for ${what}, the recording has ${n}`); return n; },

  // ---- the budget bar ------------------------------------------------------------------------------------------------
  x: (ms) => Loc.X0 + ms * Loc.PX,
  /** The panel. rows: { op, p95, budget, budgets (every budget this sheet shows), mark ("ok"|"no"|""), calls, counts (every count) }. */
  bars(id, rows, { top, title = "p95 against its budget", empty = "", hide = false }) {
    const h = 46 + 14 + rows.length * 84 + 40;
    const axis = [0, 50, 100, 150].map((ms) => `<i style="left:${Loc.x(ms)}px"></i><b style="left:${Loc.x(ms)}px">${ms}ms</b>`).join("");
    const row = (r, k) => `<div class="brow${hide ? " hidden0" : ""}" data-op="${r.op}" style="top:${46 + 6 + k * 84}px">
        <div class="bname">${Film.esc(r.op)}</div><div class="btrack"></div><div class="bfill" style="width:${r.drawn ? r.p95 * Loc.PX : 0}px"></div>
        <div class="bval${r.drawn ? "" : " hidden0"}" style="left:${Loc.x(r.p95) + 14}px">p95 ${r.p95}ms</div>
        <div class="bline" style="left:${Loc.x(r.budget)}px">${r.budgets.map((b) => `<span class="bl${b === r.budget ? "" : " hidden0"}" data-ms="${b}">budget ${b}ms</span>`).join("")}</div>
        <div class="bmark"><span class="ok${r.mark === "ok" ? "" : " hidden0"}">✔</span><span class="no${r.mark === "no" ? "" : " hidden0"}">✘</span></div>
        <div class="bcalls">${r.counts.map((n) => `<span class="${n === r.calls && r.drawn ? "" : "hidden0"}" data-n="${n}">${n} calls</span>`).join("")}</div></div>`;
    return `<div class="bpan" id="${id}" style="top:${top}px;height:${h}px"><div class="bhead"><span class="lbl"><b>each operation</b> · ${title}</span><span class="lbl">drawn to scale · 1 ms = ${Loc.PX} px</span></div>
      ${rows.map(row).join("")}<div class="baxis" style="top:${46 + 6 + rows.length * 84 + 4}px">${axis}</div>${empty ? `<div class="bempty hidden0">${empty}</div>` : ""}</div>`;
  },
  row: (s, pan, op) => s.$(`${pan} .brow[data-op="${op}"]`),
  /** Draw a row's bar from nothing to its p95, then its value, mark and count. */
  grow(s, pan, r, t) {
    const el = Loc.row(s, pan, r.op);
    s.tl.fromTo(el.querySelector(".bfill"), { width: 0 }, { width: r.p95 * Loc.PX, duration: 0.7, ease: "power2.out" }, t);
    s.tl.fromTo(el.querySelector(".bval"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, t + 0.6);
  },
  mark(s, pan, op, kind, t) {
    const el = Loc.row(s, pan, op), on = kind && el.querySelector(".bmark ." + kind), off = [...el.querySelectorAll(".bmark span")].filter((x) => x !== on);
    s.tl.to(off, { autoAlpha: 0, duration: 0.2 }, t);
    if (on) s.tl.fromTo(on, { autoAlpha: 0, scale: 1.8 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, t);
  },
  count(s, pan, op, n, t) {
    const el = Loc.row(s, pan, op), on = el.querySelector(`.bcalls span[data-n="${n}"]`); Loc.need(on, "no count " + n);
    const off = [...el.querySelectorAll(".bcalls span")].filter((x) => x !== on); if (off.length) s.tl.to(off, { autoAlpha: 0, duration: 0.2 }, t);
    s.tl.fromTo(on, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3 }, t);
  },
  /** Move a row's budget line to another budget, and swap its label. */
  budget(s, pan, op, ms, t) {
    const el = Loc.row(s, pan, op), line = el.querySelector(".bline"), on = el.querySelector(`.bl[data-ms="${ms}"]`); Loc.need(on, "no budget " + ms);
    const off = [...el.querySelectorAll(".bl")].filter((x) => x !== on); if (off.length) s.tl.to(off, { autoAlpha: 0, duration: 0.2 }, t);
    s.tl.to(line, { left: Loc.x(ms), duration: 0.9, ease: "power2.inOut" }, t);
    s.tl.fromTo(on, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, t + 0.7);
  },

  // ---- terminals ------------------------------------------------------------------------------------------------------
  type(s, el, t, dur = 0.7) {
    const typed = el.querySelector(".typed"), n = typed.textContent.length;
    s.tl.fromTo(el.querySelector(".cmd"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t - 0.1);
    s.tl.fromTo(typed, { width: "0ch" }, { width: n + "ch", duration: dur, ease: `steps(${n})` }, t);
    return t + dur;
  },
  print(s, rows, t, each = 0.09) { rows.forEach((r, k) => s.tl.fromTo(r, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: "none" }, t + k * each)); return t + rows.length * each; },
  rows(s, sel, words) { const found = s.$$(sel + " .o").filter((o) => (words instanceof RegExp ? words.test(o.textContent) : o.textContent.includes(words))); if (!found.length) throw new Error(sel + ": no printed line holds " + words); return found; },
  lit(s, sel, lit, t, dur = 0.35) {
    const all = s.$$(sel + " .o"), rest = all.filter((o) => !lit.includes(o));
    if (!lit.length) { s.tl.to(all, { opacity: 1, color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: dur }, t); return; }
    s.tl.to(lit, { opacity: 1, color: "#e9f0fa", backgroundColor: "rgba(98,198,255,.13)", duration: dur }, t);
    if (rest.length) s.tl.to(rest, { opacity: 0.38, color: "#a9bcd6", backgroundColor: "rgba(98,198,255,0)", duration: dur }, t);
  },
  label(row, text) { const el = document.createElement("div"); el.className = "tlab hidden0"; el.textContent = text; el.style.top = row.offsetTop + "px"; el.style.lineHeight = getComputedStyle(row).lineHeight; row.parentNode.appendChild(el); return el; },
  /** An editor over a recorded text file, painted as plain text (it is Markdown, not code). */
  doc(id, path, text, { x, y, w, h, tag = "", cls = "" }) {
    return `<div class="panel ${cls}" id="${id}" style="left:${x}px;top:${y}px;width:${w}px${h ? `;height:${h}px;overflow:hidden` : ""}">${Film.editor(id, path, Film.code(text, { lang: "text", size: "small" }), tag)}</div>`;
  },
};
