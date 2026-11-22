// The terminal: every earlier step's commands as they ran, then this step's typed out and its real output printed.
/* exported Terminal */
const Terminal = (() => {
  const { esc } = Views;
  const PROMPT = `<span class="p">~/plugged-in $</span> `;

  const colour = (line) => {
    const e = esc(line);
    if (/✘|exited|^\s*error/i.test(line)) return `<span class="bad">${e}</span>`;
    if (/^(created|CREATE|wrote)\b/.test(line)) return `<span class="cr">${e}</span>`;
    if (/^updated\b/.test(line)) return `<span class="up">${e}</span>`;
    if (/✔/.test(line)) return e.replace(/✔/g, `<span class="ok">✔</span>`);
    if (/^\s*\(|^\s*·/.test(line)) return `<span class="dim">${e}</span>`;
    return e;
  };
  const seconds = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);

  /** A step's runs, all at once: for the history above the current step. */
  const settled = (step) =>
    step.kind === "edit"
      ? `<span class="dim"># ${esc(step.title)}, by ${esc(step.who)}. No command runs: the files change in the editor.</span>\n`
      : step.runs.map((r) => `${PROMPT}<span class="cmd">${esc(r.command)}</span>\n${r.out.map(colour).join("\n")}\n<span class="took">(ran in ${seconds(r.millis)}, exit ${r.exit})</span>\n`).join("");

  /**
   * Show `history`, then type `step`'s commands and print their output at a pace taken from how long they really took
   * (sped up). Calls `done` when the last line is out. Returns a function that stops it.
   */
  const play = (el, history, step, { instant = false, done = () => {} } = {}) => {
    const scroller = el.parentElement;
    const before = history.map(settled).join("");
    if (instant || step.kind === "edit") {
      el.innerHTML = before + settled(step);
      scroller.scrollTop = scroller.scrollHeight;
      done();
      return () => {};
    }
    let stopped = false;
    const timers = [];
    const later = (ms, f) => timers.push(setTimeout(() => !stopped && f(), ms));
    let shown = before;
    const paint = (tail = "") => {
      el.innerHTML = shown + tail;
      scroller.scrollTop = scroller.scrollHeight;
    };
    let t = 0;
    for (const r of step.runs) {
      for (let i = 1; i <= r.command.length; i++) {
        const typed = r.command.slice(0, i);
        later((t += 14), () => paint(`${PROMPT}<span class="cmd">${esc(typed)}</span><span class="caret"> </span>`));
      }
      later((t += 260), () => ((shown += `${PROMPT}<span class="cmd">${esc(r.command)}</span>\n`), paint()));
      const pace = Math.min(2400, Math.max(250, r.millis * 0.12)) / Math.max(1, r.out.length);
      for (const line of r.out) later((t += pace), () => ((shown += colour(line) + "\n"), paint()));
      later((t += 120), () => ((shown += `<span class="took">(ran in ${seconds(r.millis)}, exit ${r.exit})</span>\n`), paint()));
    }
    later((t += 200), () => (paint(`${PROMPT}<span class="caret"> </span>`), done()));
    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
    };
  };

  /** K1's designed commands for a step: not run, because m1's `add` takes only a name. */
  const proposed = (p, k1) =>
    `<div class="term prop"><span class="dim"># Proposed in K1 (${esc(k1.path)}, ${esc(p.syntax.section.replace(/`/g, ""))}), not built: m1's add takes only a name.
# The commands are derived from Plugged In's compiled model, not typed. K1 says "architect"; the command is "ortho" since K6.
# K1 line ${p.syntax.line}:  ${esc(p.syntax.text)}</span>

${p.commands.map((c) => `${PROMPT}<span class="cmd">${esc(c)}</span>  <span class="dim">(not run)</span>`).join("\n")}

<span class="dim"># Still yours to write, whatever the flags:
${p.left.map((l) => `#   ${esc(l)}`).join("\n")}</span></div>`;

  return { play, proposed };
})();
