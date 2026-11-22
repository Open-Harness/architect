// The trace panel: prove's real traces, listed by journey; the chosen one replayed span by span, slowed down, each
// span saying which part of the runtime opened it, with the line of the runtime's code.
/* exported Traces */
const Traces = (() => {
  const { esc } = Views;
  const short = (path) => path.replace("packages/language-effect/src/modules/handler/", "…/handler/");

  /** Who opened a span, in words, with the runtime step it belongs to. */
  const whoDid = (span, trace, runtime) => {
    const step = (id) => runtime.find((r) => r.id === id);
    const at = (id) => (step(id) ? `${short(step(id).file)}:${step(id).line}` : "");
    const op = trace.operation;
    if (span.parent === -1) return { say: "prove: this journey step's call, over HTTP" };
    if (span.name === op) return { say: "the runtime: decode, check access and the move's start, then your handler", at: at("span") };
    if (span.name === `${op}.commit`) return { say: "the runtime: every write, the event and the request key, committed once", at: at("commit") };
    if (span.name.startsWith(`${op}.`)) return { say: `your step "${span.name.slice(op.length + 1)}", wrapped in a span by the runtime`, at: at("steps") };
    if (/^(sqlite|BATCH)$/.test(span.name)) return { say: "a database call" };
    return { say: "" };
  };

  const CHIPS = ["move.name", "move.to", "step.kind", "event.name", "commit.writes", "commit.outcome", "refusal"];
  const chips = (s) =>
    CHIPS.filter((k) => s.attributes[k] !== undefined)
      .map((k) => `<span class="tchip ${k === "refusal" ? "bad" : ""}">${esc(k === "refusal" ? `refused ${s.attributes[k]}` : `${k} ${s.attributes[k]}`)}</span>`)
      .join("");

  /** Spans in tree order, each parent before its children, siblings by start; with each one's depth. */
  const treeOrder = (spans) => {
    const out = [];
    const visit = (p, depth) =>
      spans
        .map((s, i) => [s, i])
        .filter(([s]) => s.parent === p)
        .sort(([a], [b]) => a.start - b.start)
        .forEach(([, i]) => (out.push([i, depth]), visit(i, depth + 1)));
    visit(-1, 0);
    return out;
  };

  const list = (traces, chosen) => {
    const byJourney = new Map();
    traces.forEach((t, i) => byJourney.set(t.journey, [...(byJourney.get(t.journey) ?? []), i]));
    return [...byJourney.entries()]
      .map(([j, ids]) => `<div class="tj">${esc(j)}</div>` + ids.map((i) => {
        const t = traces[i];
        return `<button class="ti ${i === chosen ? "on" : ""}" data-trace="${i}"><span class="mono">${esc(t.operation || "(no operation)")}</span>${t.refusal ? `<span class="tchip bad">${esc(t.refusal)}</span>` : `<span class="ok">✔</span>`}</button>`;
      }).join(""))
      .join("");
  };

  const total = (t) => Math.max(...t.spans.map((s) => s.start + s.duration), 0.1);

  const waterfall = (t, runtime) => {
    const end = total(t);
    const rows = treeOrder(t.spans).map(([i, depth]) => {
      const s = t.spans[i];
      const who = whoDid(s, t, runtime);
      const log = s.attributes["refusal.log"];
      return `<div class="sp ${s.attributes.refusal ? "refused" : ""}" data-span="${i}" style="--d:${depth}">
        <div class="sn"><b class="mono">${esc(s.name)}</b> <span class="muted">${s.duration} ms</span> ${chips(s)}
          <div class="who">${esc(who.say)}${who.at ? ` <span class="mono">${esc(who.at)}</span>` : ""}${log ? ` <span class="bad">“${esc(log)}”</span>` : ""}</div></div>
        <div class="lane"><div class="bar" data-bar="${i}" style="left:${(s.start / end) * 100}%"></div>${s.events.map((e) => `<i class="ev" data-at="${e.at}" style="left:${(e.at / end) * 100}%" title="${esc(e.name)}"></i>`).join("")}</div>
      </div>`;
    });
    return `<div class="wf-head"><b>${esc(t.journey)}</b> <span class="muted">· ${esc(t.step)}</span> <span class="clock mono" data-clock></span>
      <button class="replay" data-replay>Replay</button></div>
      <div class="wf"><div class="playhead" data-head></div>${rows.join("")}</div>`;
  };

  /** Grow each span's bar as the replayed clock passes it. `slow` is how many times slower than it really ran. */
  const animate = (root, t, { done = () => {} } = {}) => {
    const end = total(t);
    const ms = Math.min(6500, Math.max(2600, end * 160));
    const bars = t.spans.map((_, i) => root.querySelector(`[data-bar="${i}"]`));
    const events = [...root.querySelectorAll(".ev")];
    const rows = t.spans.map((_, i) => root.querySelector(`.sp[data-span="${i}"]`));
    const head = root.querySelector("[data-head]");
    const clock = root.querySelector("[data-clock]");
    let start;
    let raf;
    const frame = (now) => {
      start ??= now;
      const at = Math.min(end, ((now - start) / ms) * end);
      t.spans.forEach((s, i) => {
        const shown = Math.max(0, Math.min(s.duration, at - s.start));
        bars[i].style.width = `${(shown / end) * 100}%`;
        rows[i].classList.toggle("live", at >= s.start && at < s.start + s.duration);
        rows[i].classList.toggle("seen", at >= s.start);
      });
      events.forEach((e) => e.classList.toggle("on", at >= Number(e.dataset.at)));
      head.style.left = `${(at / end) * 54}%`;
      clock.textContent = `${at.toFixed(1)} of ${end.toFixed(1)} ms, shown ${Math.round(ms / end)}× slower`;
      if (at < end) raf = requestAnimationFrame(frame);
      else done();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  };

  return { list, waterfall, animate, whoDid };
})();
