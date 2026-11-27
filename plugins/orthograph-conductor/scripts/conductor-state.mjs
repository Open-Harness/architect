#!/usr/bin/env node
// The conductor's state, kept in the app's own repository under .orthograph/conductor/: node conductor-state.mjs <command> [args]
//   init "<goal in the owner's words>"   start a project: writes the first event and the roadmap
//   log '<event as JSON>'                append one event to log.jsonl, then rebuild state.json and ROADMAP.md
//   rebuild                              make state.json and ROADMAP.md again from log.jsonl alone
//   brief [--quiet]                      print where the project is and what is next, in a few lines (the turn hook runs
//                                        it with --quiet, which prints nothing in a folder with no project)
//   due                                  for a scheduled wake: exit 0 and say why if there is work the agent can do
//                                        without the owner, exit 3 if not
//   show                                 print state.json
// Every write also makes ROADMAP.html, the same state as a page the conductor publishes for the owner.
// log.jsonl is the truth: append-only, one event per line, never rewritten. state.json and ROADMAP.md are made from it, so
// either can be deleted and rebuilt. Only the main agent (the conductor) runs this; a worker hands its result back instead.
// Plain Node, no dependencies. --dir <path> sets the app's folder (the current folder by default).
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";


// The stages, in their usual order, and what "done" means for each. A check with `cmd` is run; one with `reader` is a
// person's yes. The conductor's stage skills say how to meet each one. Stages after "trace" are named so the roadmap is
// whole, and gain their skills later.
export const STAGES = [
  { stage: "plan", title: "Plan it", done_when: [
    { check: "one page names the things, who may do what, what must stay true, what waits, where two places must agree, and the doubts", reader: "owner" },
    { check: "the owner has agreed the page, and every doubt is marked spike or blank" , reader: "owner" } ] },
  { stage: "spike", title: "Spike what you doubt", done_when: [
    { check: "every doubt marked spike has a page under spikes/ with its question, answer, what was tried and open risks" },
    { check: "the plan is updated from what the spikes found, or the owner has said it stands", reader: "owner" } ] },
  { stage: "describe", title: "Describe it", done_when: [
    { check: "the blueprint declares every thing and operation the plan names" },
    { check: "ortho check lists no blank the plan already answers, and every blank left is an open question for the owner", cmd: "ortho check" },
    { check: "ortho generate has run, so nothing is drifting", cmd: "ortho check" } ] },
  { stage: "done", title: "Say what done means", done_when: [
    { check: "every thing has its journey stubs, filled in by an author who will not build", cmd: "ortho check" },
    { check: "ortho prove --empty is red, and every green step is marked proved by the description", cmd: "ortho prove --empty" },
    { check: "the owner has read the journeys as stories and agreed them", reader: "owner" } ] },
  { stage: "build", title: "Build until green", done_when: [
    { check: "every operation has a handler, each written by a builder worker from its own brief" },
    { check: "ortho prove passes, run whole, with every operation's evals and the coverage line green", cmd: "ortho prove" },
    { check: "ortho check passes", cmd: "ortho check" },
    { check: "no builder changed a journey, the blueprint or a generated file", cmd: "git diff --stat <main branch>...build/<goal>" } ] },
  { stage: "review", title: "Review without reading the code", done_when: [
    { check: "a reviewer that wrote none of it ran ortho impact, ortho prove and ortho check and handed back findings" },
    { check: "every blocking finding is fixed and the fix reviewed again" },
    { check: "nothing is stale", cmd: "ortho impact" } ] },
  { stage: "trace", title: "Run it, break it, read the trace", done_when: [
    { check: "the owner has run the app and tried the stories and refusals they care about", reader: "owner" },
    { check: "every surprise is explained by a trace and a line of the blueprint, and accepted or sent back", reader: "owner" } ] },
  { stage: "stage", title: "Stage it", done_when: [] },
  { stage: "watch", title: "Watch it", done_when: [] },
  { stage: "change", title: "Change it, months later", done_when: [] },
  { stage: "agents", title: "More than one agent", done_when: [] },
];
// The fields each event must carry. fold refuses an event without them, so a bad event never reaches the log.
export const NEEDS = { "goal.set": ["goal"], "stage.entered": ["stage"], "stage.done": ["stage"], "stage.reopened": ["stage", "from", "because"],
  decision: ["stage", "q", "a"], open: ["stage", "q"], closed: ["q"], "worker.started": ["stage", "worker", "role", "task"],
  "worker.returned": ["stage", "worker", "outcome"], "check.ran": ["stage", "check", "pass"], blocker: ["stage", "what"], replan: ["stage", "plan"], note: ["text"], "worker.closed": ["worker"] };
export const TYPES = ["goal.set", "stage.entered", "stage.done", "stage.reopened", "decision", "open", "closed", "worker.started", "worker.returned", "worker.closed", "check.ran", "blocker", "replan", "note"];

const paths = (root) => { const dir = join(resolve(root), ".orthograph/conductor"); return { dir, LOG: join(dir, "log.jsonl"), STATE: join(dir, "state.json"), PAGE: join(dir, "ROADMAP.md"), HTML: join(dir, "ROADMAP.html") }; };
export const readLog = (root = ".") => { const { LOG } = paths(root); return existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l, k) => { try { return JSON.parse(l); } catch { throw new Error(`log.jsonl line ${k + 1} is not JSON`); } }) : []; };

// The snapshot is a fold over the log. Every visit of a stage is kept, so a loop (plan, spike, plan again) is history, not loss.
export function fold(events) {
  const s = { goal: null, done_when: [], stage: null, visit: 0, roadmap: STAGES.map((x) => ({ stage: x.stage, title: x.title, status: "todo", done_when: x.done_when, visits: [] })), decided: [], open: [], workers: [], blockers: [], plan: [], next: null, last: 0 };
  const road = (name) => s.roadmap.find((r) => r.stage === name) ?? (() => { throw new Error(`no stage ${name}`); })();
  const current = (name) => { const r = road(name); return r.visits[r.visits.length - 1]; };
  for (const e of events) {
    const missing = (NEEDS[e.type] ?? []).filter((f) => e[f] === undefined || e[f] === null || e[f] === "");
    if (missing.length) throw new Error(`event #${e.n} (${e.type}) needs ${missing.join(", ")}`);
    if (e.type === "check.ran" && typeof e.pass !== "boolean") throw new Error(`event #${e.n} (check.ran): pass is true or false`);
    if (e.type === "worker.returned" && !["done", "blocked", "partial"].includes(e.outcome)) throw new Error(`event #${e.n} (worker.returned): outcome is done, blocked or partial`);
    for (const f of ["plan", "clears", "done_when", "open"]) if (e[f] !== undefined && !Array.isArray(e[f])) throw new Error(`event #${e.n} (${e.type}): ${f} is a list`);
    if (e.type === "worker.returned" && !s.workers.some((w) => w.id === e.worker)) throw new Error(`event #${e.n}: no worker ${e.worker} was started`);
    if (e.type === "worker.closed" && !s.workers.some((w) => w.id === e.worker)) throw new Error(`event #${e.n}: no worker ${e.worker} was started`);
    if (e.type === "worker.closed" && s.workers.some((w) => w.id === e.worker && w.closed)) throw new Error(`event #${e.n}: worker ${e.worker} is already closed`);
    if (e.type === "worker.started" && s.workers.some((w) => w.id === e.worker)) throw new Error(`event #${e.n}: worker ${e.worker} was already started`);
    s.last = e.n;
    switch (e.type) {
      case "goal.set": s.goal = e.goal; s.done_when = e.done_when ?? s.done_when; break;
      case "stage.entered": case "stage.reopened": {
        const r = road(e.stage); r.status = "doing";
        r.visits.push({ visit: r.visits.length + 1, because: e.type === "stage.reopened" ? `reopened from ${e.from}: ${e.because}` : (e.because ?? "first"), at: e.n, checks: [], workers: [], ended: null });
        s.stage = e.stage; s.visit = r.visits.length; break;
      }
      case "stage.done": { const r = road(e.stage), v = current(e.stage); if (v) v.ended = { outcome: "done", at: e.n }; r.status = "done"; break; }
      case "check.ran": { const v = current(e.stage); if (v) v.checks.push({ check: e.check, cmd: e.cmd, pass: e.pass, at: e.n }); break; }
      case "decision": s.decided.push({ q: e.q, a: e.a, by: e.by ?? "owner", at: e.n }); s.open = s.open.filter((o) => o.q !== e.q); break;
      case "open": s.open.push({ q: e.q, waits_on: e.waits_on ?? "owner", blocks: e.blocks ?? e.stage, at: e.n }); break;
      case "closed": s.open = s.open.filter((o) => o.q !== e.q); break;
      case "worker.started": s.workers.push({ id: e.worker, role: e.role, stage: e.stage, visit: s.visit, task: e.task, status: "running", at: e.n }); current(e.stage)?.workers.push(e.worker); break;
      case "worker.closed": { const t = s.workers.find((x) => x.id === e.worker); t.closed = e.n; if (t.status === "running") t.status = "stopped"; break; }
      case "worker.returned": { const t = s.workers.find((x) => x.id === e.worker); if (t) { t.status = e.outcome; t.returned = e.n; } for (const q of e.open ?? []) s.open.push({ q, waits_on: "owner", blocks: e.stage, at: e.n }); break; }
      case "blocker": s.blockers.push({ what: e.what, stage: e.stage, at: e.n, cleared: false }); road(e.stage).status = "blocked"; break;
      case "replan": { s.plan = e.plan; for (const b of s.blockers) if (!b.cleared && (e.clears ?? []).includes(b.what)) b.cleared = true;
        const r = road(e.stage); if (r.status === "blocked" && !s.blockers.some((b) => !b.cleared && b.stage === e.stage)) r.status = "doing"; break; }
      case "note": break;
    }
    if (e.next) s.next = e.next;
  }
  return s;
}

const tick = { todo: "[ ]", doing: "[~]", done: "[x]", blocked: "[!]" };
export function page(s) {
  const out = [`# The conductor`, "", `Made from .orthograph/conductor/log.jsonl. Do not edit: the conductor rewrites it every turn.`, "", `**Goal:** ${s.goal ?? "not set yet"}`, ""];
  if (s.done_when.length) out.push("**Done when:**", ...s.done_when.map((d) => `- ${d}`), "");
  out.push(`**Now:** ${s.stage ? `${s.roadmap.find((r) => r.stage === s.stage).title}, visit ${s.visit}` : "not started"}`, "");
  if (s.next) out.push(`**Next:** ${s.next.do}${s.next.why ? ` (${s.next.why})` : ""}`, "");
  const asks = s.open.filter((o) => o.waits_on === "owner");
  if (asks.length) out.push("**Waiting on you:**", ...asks.map((o) => `- ${o.q}`), "");
  out.push("## Roadmap", "");
  for (const r of s.roadmap) {
    out.push(`${tick[r.status]} **${r.title}**${r.visits.length > 1 ? ` (visited ${r.visits.length} times)` : ""}`);
    for (const v of r.visits) if (v.visit > 1 || r.visits.length > 1) out.push(`    - visit ${v.visit}: ${v.because}${v.ended ? ", done" : ""}`);
  }
  if (s.decided.length) out.push("", "## Decided", "", ...s.decided.map((d) => `- ${d.q} **${d.a}** (${d.by})`));
  const live = s.blockers.filter((b) => !b.cleared);
  if (live.length) out.push("", "## Blocked", "", ...live.map((b) => `- ${b.what} (${b.stage})`));
  return out.join("\n") + "\n";
}

function write(root, events) {
  const { STATE, PAGE, HTML } = paths(root), s = fold(events);
  writeFileSync(STATE, JSON.stringify(s, null, 2) + "\n"); writeFileSync(PAGE, page(s)); writeFileSync(HTML, html(s, events));
  return s;
}

// The same state as one self-contained web page, for the owner to keep open: the conductor publishes it wherever the
// harness shows pages (an artifact, a canvas, a preview), so it is always the log as it now stands.
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const say = (e) => e.text ?? e.because ?? e.q ?? e.what ?? e.task ?? e.check ?? e.goal ?? (e.plan ? e.plan.join("; ") : "") ?? "";
export function html(s, events = []) {
  const now = s.roadmap.find((r) => r.stage === s.stage), asks = s.open.filter((o) => o.waits_on === "owner");
  const li = (xs) => xs.length ? `<ul>${xs.join("")}</ul>` : `<p class="quiet">none</p>`;
  const stages = s.roadmap.map((r) => `<li class="st ${r.status}"><span class="mark">${{ todo: "", doing: "●", done: "✓", blocked: "!" }[r.status]}</span><b>${esc(r.title)}</b>${r.visits.length > 1 ? ` <span class="quiet">visited ${r.visits.length} times</span>` : ""}${r.visits.length > 1 ? `<ol>${r.visits.map((v) => `<li>${esc(v.because)}${v.ended ? " · done" : ""}</li>`).join("")}</ol>` : ""}</li>`).join("");
  const workers = s.workers.map((w) => `<tr><td>${esc(w.id)}</td><td>${esc(w.role)}</td><td>${esc(w.stage)}</td><td>${esc(w.task)}</td><td class="${esc(w.status)}">${esc(w.status)}${w.closed ? " · closed" : ""}</td></tr>`).join("");
  const recent = events.slice(-15).reverse().map((e) => `<li><span class="quiet">#${e.n} ${esc(e.type)}${e.stage ? ` · ${esc(e.stage)}` : ""}</span> ${esc(say(e))}</li>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Project roadmap</title>
<!-- Made from .orthograph/conductor/log.jsonl. Do not edit: the conductor rewrites it with every event. -->
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--quiet:#6b6a64;--line:#e4e1d8;--accent:#2f5d50;--warn:#a23b2a;--card:#fff}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#161614;--fg:#ecebe6;--quiet:#9a988f;--line:#2c2b27;--accent:#7fb8a4;--warn:#e0806e;--card:#1e1e1b}}
:root[data-theme="dark"]{--bg:#161614;--fg:#ecebe6;--quiet:#9a988f;--line:#2c2b27;--accent:#7fb8a4;--warn:#e0806e;--card:#1e1e1b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:32px 16px 64px}h1{font-size:1.6rem;margin:0 0 4px}h2{font-size:1rem;text-transform:uppercase;letter-spacing:.06em;color:var(--quiet);margin:32px 0 8px}
.quiet{color:var(--quiet)}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:8px 0}
.asks{border-color:var(--accent)}ul,ol{margin:4px 0;padding-left:20px}.road{list-style:none;padding:0}.st{padding:6px 0;border-bottom:1px solid var(--line)}
.mark{display:inline-block;width:1.4em;color:var(--accent)}.st.todo b{color:var(--quiet);font-weight:500}.st.blocked .mark,.st.blocked b{color:var(--warn)}.st ol{color:var(--quiet);font-size:.9rem}
table{width:100%;border-collapse:collapse;font-size:.92rem}td,th{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
td.running{color:var(--accent)}td.blocked{color:var(--warn)}.scroll{overflow-x:auto}
</style></head><body><main>
<p class="quiet">The conductor's roadmap · made from the log, event ${esc(s.last)}</p>
<h1>${esc(s.goal ?? "No goal yet")}</h1>
<div class="card"><b>Now:</b> ${now ? `${esc(now.title)}, visit ${esc(s.visit)}` : "not started"}${s.next ? `<br><b>Next:</b> ${esc(s.next.do)}${s.next.why ? ` <span class="quiet">(${esc(s.next.why)})</span>` : ""}` : ""}</div>
${asks.length ? `<div class="card asks"><b>Waiting on you</b>${li(asks.map((o) => `<li>${esc(o.q)}</li>`))}</div>` : ""}
<h2>Roadmap</h2><ul class="road">${stages}</ul>
<h2>Workers</h2>${s.workers.length ? `<div class="scroll"><table><tr><th>id</th><th>role</th><th>stage</th><th>task</th><th>status</th></tr>${workers}</table></div>` : `<p class="quiet">none yet</p>`}
<h2>Decided</h2>${li(s.decided.map((d) => `<li>${esc(d.q)} <b>${esc(d.a)}</b> <span class="quiet">(${esc(d.by)})</span></li>`))}
${s.blockers.some((b) => !b.cleared) ? `<h2>Blocked</h2>${li(s.blockers.filter((b) => !b.cleared).map((b) => `<li>${esc(b.what)} <span class="quiet">(${esc(b.stage)})</span></li>`))}` : ""}
<h2>Latest</h2>${recent ? `<ul>${recent}</ul>` : `<p class="quiet">nothing yet</p>`}
</main></body></html>
`;
}
// One writer at a time: a lock folder, made atomically, held while the log is read, numbered and appended. A lock older
// than a minute is from a writer that died, and is taken over.
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
export function locked(root, work) {
  const { dir } = paths(root), lock = join(dir, "lock");
  mkdirSync(dir, { recursive: true });
  for (let tries = 0; ; tries++) {
    try { mkdirSync(lock); break; } catch (err) {
      if (err.code !== "EEXIST") throw err;
      // A stale lock is moved aside under a name of its own before it is removed, so of two writers that both saw it, only
      // one takes it over: the other's rename fails, or finds a fresh lock and puts it back, and waits like any writer.
      try {
        if (Date.now() - statSync(lock).mtimeMs > 60_000) {
          const aside = `${lock}.stale.${process.pid}`;
          renameSync(lock, aside);
          // What was moved may be a fresh lock another writer took in between: if so, put it back and wait.
          if (Date.now() - statSync(aside).mtimeMs > 60_000) rmdirSync(aside); else renameSync(aside, lock);
          continue;
        }
      } catch { continue; }
      if (tries > 500) throw new Error("another writer holds .orthograph/conductor/lock");
      pause(10);
    }
  }
  try { return work(); } finally { rmdirSync(lock); }
}
export function append(root, e, now = new Date().toISOString(), first = false) {
  if (!e || typeof e !== "object" || !TYPES.includes(e.type)) throw new Error(`unknown event type ${e?.type}; one of ${TYPES.join(", ")}`);
  return locked(root, () => {
    const events = readLog(root);
    if (first && events.length) throw new Error("this project already has a conductor log: use log, not init");
    const full = { ...e, n: events.length + 1, at: now }; // the number and the time are always the script's, never the caller's
    fold([...events, full]); // refuse an event the state cannot take, before it is written
    appendFileSync(paths(root).LOG, JSON.stringify(full) + "\n");
    return write(root, [...events, full]);
  });
}
export function init(root, goal) {
  if (!goal) throw new Error("init needs the goal, in the owner's words");
  append(root, { type: "goal.set", goal, done_when: ["the first operation is planned, described, has agreed journeys that fail on purpose, is built, reviewed, and run by the owner"], next: { do: "plan it with the owner", why: "nothing is planned yet" } }, undefined, true);
  return append(root, { type: "stage.entered", stage: "plan", because: "first" });
}
export const rebuild = (root) => write(root, readLog(root));
export function brief(root, quiet = false) {
  if (!existsSync(paths(root).LOG)) return quiet ? "" : "orthograph conductor: no project yet. Start with the conductor skill.";
  const s = fold(readLog(root)), r = s.roadmap.find((x) => x.stage === s.stage);
  return [`orthograph conductor: goal "${s.goal}"`, `now: ${r ? `${r.title}, visit ${s.visit}, ${r.status}` : "not started"}`,
    `done: ${s.roadmap.filter((x) => x.status === "done").map((x) => x.stage).join(", ") || "nothing yet"}`,
    s.next ? `next: ${s.next.do}${s.next.why ? ` (${s.next.why})` : ""}` : "", s.open.length ? `waiting: ${s.open.map((o) => o.q).join(" | ")}` : "",
    `running workers: ${s.workers.filter((t) => t.status === "running").map((t) => `${t.id} ${t.role}`).join(", ") || "none"}`,
    s.workers.some((t) => t.status !== "running" && !t.closed) ? `to close: ${s.workers.filter((t) => t.status !== "running" && !t.closed).map((t) => t.id).join(", ")}` : ""].filter(Boolean).join("\n");
}

// What the agent can do now without the owner, for a scheduled wake: check on running workers, and carry on with the
// current stage unless it waits on an answer only the owner can give. Questions for the owner never make work due.
export function due(root) {
  if (!existsSync(paths(root).LOG)) return { due: false, why: ["no project yet"] };
  const s = fold(readLog(root)), why = [];
  const running = s.workers.filter((t) => t.status === "running");
  if (running.length) why.push(`check on ${running.map((t) => t.id).join(", ")}`);
  const finished = s.workers.filter((t) => t.status !== "running" && !t.closed);
  if (finished.length) why.push(`close ${finished.map((t) => t.id).join(", ")}`);
  const r = s.roadmap.find((x) => x.stage === s.stage);
  const asks = s.open.filter((o) => o.waits_on === "owner" && o.blocks === s.stage);
  if (r && r.status === "doing" && !asks.length && s.next) why.push(`carry on: ${s.next.do}`);
  if (r && r.status === "blocked") why.push(`find a way round: ${s.blockers.filter((b) => !b.cleared).map((b) => b.what).join("; ")}`);
  if (!why.length) why.push(asks.length ? `waiting on the owner: ${asks.map((o) => o.q).join(" | ")}` : "nothing to do");
  return { due: running.length > 0 || finished.length > 0 || why.some((w) => w.startsWith("carry on") || w.startsWith("find a way")), why };
}

// The command line runs only when this file is run, not when it is imported (the tests import it).
const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };
if (process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--dir"), root = at >= 0 ? args.splice(at, 2)[1] : ".";
  const q = args.indexOf("--quiet"), quiet = q >= 0 && args.splice(q, 1).length > 0;
  const [cmd, value] = args;
  try {
    if (cmd === "init") console.log(`conductor started: ${init(root, value).goal}`);
    else if (cmd === "log") { const s = append(root, JSON.parse(value)); console.log(`logged #${s.last}; now ${s.stage}, visit ${s.visit}`); }
    else if (cmd === "rebuild") console.log(`rebuilt from ${rebuild(root).last} events`);
    else if (cmd === "show") console.log(readFileSync(paths(root).STATE, "utf8"));
    else if (cmd === "brief") { const b = brief(root, quiet); if (b) console.log(b); }
    else if (cmd === "due") { const d = due(root); console.log(`${d.due ? "due" : "idle"}: ${d.why.join("; ")}`); process.exit(d.due ? 0 : 3); }
    else { console.error("usage: conductor-state.mjs init|log|rebuild|brief|due|show [--dir <app>]"); process.exit(2); }
  } catch (err) { console.error(`conductor-state: ${err.message}`); process.exit(1); }
}
