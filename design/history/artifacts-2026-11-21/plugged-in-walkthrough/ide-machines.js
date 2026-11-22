// Every thing's machine, drawn from the model, and moving: walked move by move while you write the blueprint, then
// replayed from prove's real traces, each call when it happened (slowed down), refusals in red where they were refused.
/* exported Machines */
const Machines = (() => {
  const { esc, machine } = Views;

  /** Each thing with states, with its moves, from the operations that carry its machine. */
  const things = (operations) => {
    const out = new Map();
    for (const o of operations) if (o.machine?.states?.length && !out.has(o.thing)) out.set(o.thing, { ...o.machine, lit: null });
    return out;
  };

  /** Each card names the file its machine is written in; the machine, its states and its moves open it there. */
  const render = (el, operations, intro, anchors) => {
    const all = things(operations);
    const none = [...new Set(operations.map((o) => o.thing))].filter((t) => !all.has(t));
    const at = (id) => anchors.find((a) => a.id === id);
    const reveal = (a) => (a ? `data-reveal="${esc(a.file)}" data-from="${a.line}" data-to="${a.endLine}"` : "");
    el.innerHTML = `<div class="mx-head"><span>${esc(intro)}</span><span class="mx-now mono" data-now></span></div>
      <div class="mx-grid">${[...all.entries()].map(([t, m]) => {
        const a = at(`${t}/machine`);
        return `<figure class="mx" data-thing="${esc(t)}"><figcaption>${esc(t)} ${a ? `<button class="mx-src mono" ${reveal(a)} title="Open where it is written">${esc(a.file.split("/").slice(-2).join("/"))}:${a.line}</button>` : ""}<span class="mx-say" data-say></span></figcaption>${machine(m, `${t}'s machine`)}</figure>`;
      }).join("")}</div>
      <p class="muted mx-none">No machine, so nothing moves: ${none.map(esc).join(", ")}. Their operations read, or make things without states.</p>`;
    // Every move and state in a drawing opens the line that declares it.
    for (const card of el.querySelectorAll(".mx")) {
      const t = card.dataset.thing;
      for (const p of card.querySelectorAll("[data-k]")) {
        const a = at(`${t}/machine/move:${p.dataset.k}`);
        if (a) (p.dataset.reveal = a.file), (p.dataset.from = a.line), (p.dataset.to = a.endLine), p.classList.add("clickable");
      }
      for (const r of card.querySelectorAll("rect[data-s]")) {
        const a = at(`${t}/machine/state:${r.dataset.s}`);
        if (a) (r.dataset.reveal = a.file), (r.dataset.from = a.line), (r.dataset.to = a.endLine), r.classList.add("clickable");
      }
    }
  };

  /** A dot along an edge, then the state it reaches pulses. */
  const travel = (svg, path, { ms = 700, cls = "" } = {}) => {
    const fx = svg.querySelector(".fx");
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("r", "7");
    dot.setAttribute("class", `dot ${cls}`);
    fx.appendChild(dot);
    const len = path.getTotalLength();
    path.classList.add("go");
    const label = svg.querySelector(`text[data-k="${CSS.escape(path.dataset.k)}"]`);
    label?.classList.add("go");
    let start;
    const frame = (now) => {
      start ??= now;
      const k = Math.min(1, (now - start) / ms);
      const p = path.getPointAtLength(len * (1 - Math.pow(1 - k, 2)));
      dot.setAttribute("cx", p.x);
      dot.setAttribute("cy", p.y);
      if (k < 1) requestAnimationFrame(frame);
      else {
        dot.remove();
        path.classList.remove("go");
        label?.classList.remove("go");
        pulse(svg, path.dataset.t, cls);
      }
    };
    requestAnimationFrame(frame);
  };

  const pulse = (svg, state, cls = "") => {
    const r = svg.querySelector(`rect[data-s="${CSS.escape(state)}"]`);
    if (!r) return;
    r.classList.remove("pulse", "refuse");
    void r.getBBox();
    r.classList.add(cls === "bad" ? "refuse" : "pulse");
    setTimeout(() => r.classList.remove("pulse", "refuse"), 900);
  };

  const say = (card, text, bad) => {
    const s = card.querySelector("[data-say]");
    s.textContent = text;
    s.className = `mx-say on ${bad ? "bad" : ""}`;
    clearTimeout(s._t);
    s._t = setTimeout(() => (s.className = "mx-say"), 1400);
  };

  /** Walk each machine's moves in turn, forever, until stopped. */
  const walk = (el) => {
    const cards = [...el.querySelectorAll(".mx")];
    let i = 0;
    const tick = () => {
      for (const card of cards) {
        const paths = [...card.querySelectorAll("path[data-k]")];
        if (paths.length === 0) continue;
        const p = paths[i % paths.length];
        travel(card.querySelector("svg"), p, { ms: 900 });
        say(card, `${p.dataset.k}: ${p.dataset.f === "(new)" ? "not yet made" : p.dataset.f} → ${p.dataset.t}`);
      }
      i++;
    };
    tick();
    const timer = setInterval(tick, 1500);
    return () => clearInterval(timer);
  };

  /** prove's traces, each at the moment it ran, `slow` times slower. */
  const replay = (el, traces, operations, { slow = 8, done = () => {} } = {}) => {
    const byName = new Map(operations.map((o) => [o.name, o]));
    const now = el.querySelector("[data-now]");
    const timers = traces.map((t, i) =>
      setTimeout(() => {
        const thing = t.operation.split(".")[0];
        const card = el.querySelector(`.mx[data-thing="${CSS.escape(thing)}"]`);
        now.innerHTML = `${i + 1}/${traces.length} · ${esc(t.journey)} · <b>${esc(t.operation)}</b> ${t.refusal ? `<span class="bad">refused ${esc(t.refusal)}</span>` : `<span class="ok">✔</span>`}`;
        if (!card) return;
        const op = t.spans.find((s) => s.name === t.operation);
        const key = op?.attributes["move.name"] ?? byName.get(t.operation)?.machine?.lit;
        const svg = card.querySelector("svg");
        if (t.refusal) {
          const paths = key ? [...svg.querySelectorAll(`path[data-k="${CSS.escape(key)}"]`)] : [];
          for (const f of new Set(paths.map((p) => p.dataset.f))) pulse(svg, f, "bad");
          say(card, `${t.operation.split(".")[1]} refused: ${t.refusal}`, true);
        } else if (key) {
          const to = op?.attributes["move.to"];
          const paths = [...svg.querySelectorAll(`path[data-k="${CSS.escape(key)}"]`)].filter((p) => !to || p.dataset.t === to);
          paths.forEach((p) => travel(svg, p, { ms: 650 }));
          say(card, `${t.operation.split(".")[1]} → ${to ?? paths[0]?.dataset.t ?? ""}`);
        } else say(card, `${t.operation.split(".")[1]}: read, nothing moves`);
        if (i === traces.length - 1) setTimeout(done, 1200);
      }, t.at * slow),
    );
    return () => timers.forEach(clearTimeout);
  };

  return { render, walk, replay };
})();
