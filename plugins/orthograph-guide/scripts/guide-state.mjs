#!/usr/bin/env node
// The guide's state, kept in the app's own repository under .orthograph/guide/: node guide-state.mjs <command> [args]
//   init "<goal in the owner's words>"   start a project: writes the first event and the roadmap
//   log '<event as JSON>'                append one event to log.jsonl, then rebuild state.json and GUIDE.md
//   rebuild                              make state.json and GUIDE.md again from log.jsonl alone
//   brief                                print where the project is and what is next, in a few lines (the turn hook runs this)
//   show                                 print state.json
// log.jsonl is the truth: append-only, one event per line, never rewritten. state.json and GUIDE.md are made from it, so
// either can be deleted and rebuilt. Only the main agent (the guide) runs this; a thread hands its result back instead.
// Plain Node, no dependencies. --dir <path> sets the app's folder (the current folder by default).
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";


// The stages, in their usual order, and what "done" means for each. A check with `cmd` is run; one with `reader` is a
// person's yes. The guide's stage skills say how to meet each one. Stages after "done" are named so the roadmap is whole,
// and gain their skills later.
export const STAGES = [
  { stage: "plan", title: "Plan it", done_when: [
    { check: "one page names the things, who may do what, what must stay true, what waits, where two places must agree, and the doubts", reader: "owner" },
    { check: "the owner has agreed the page, and every doubt is marked spike or blank" , reader: "owner" } ] },
  { stage: "spike", title: "Spike what you doubt", done_when: [
    { check: "every doubt marked spike has a page under spikes/ with its question, answer and open risks" },
    { check: "the plan is updated from what the spikes found, or the owner has said it stands", reader: "owner" } ] },
  { stage: "describe", title: "Describe it", done_when: [
    { check: "the blueprint declares every thing and operation the plan names" },
    { check: "ortho check lists no blank the plan already answers, and every blank left is an open question for the owner", cmd: "ortho check" },
    { check: "ortho generate has run, so nothing is drifting", cmd: "ortho check" } ] },
  { stage: "done", title: "Say what done means", done_when: [
    { check: "every thing has its journey stubs, filled in by an author who will not build", cmd: "ortho check" },
    { check: "ortho prove --empty is red, and every green step is marked proved by the description", cmd: "ortho prove --empty" },
    { check: "the owner has read the journeys as stories and agreed them", reader: "owner" } ] },
  { stage: "build", title: "Build until green", done_when: [] },
  { stage: "review", title: "Review without reading the code", done_when: [] },
  { stage: "trace", title: "Run it, break it, read the trace", done_when: [] },
  { stage: "stage", title: "Stage it", done_when: [] },
  { stage: "watch", title: "Watch it", done_when: [] },
  { stage: "change", title: "Change it, months later", done_when: [] },
  { stage: "agents", title: "More than one agent", done_when: [] },
];
export const TYPES = ["goal.set", "stage.entered", "stage.done", "stage.reopened", "decision", "open", "closed", "thread.started", "thread.returned", "check.ran", "blocker", "replan", "note"];

const paths = (root) => { const dir = join(resolve(root), ".orthograph/guide"); return { dir, LOG: join(dir, "log.jsonl"), STATE: join(dir, "state.json"), PAGE: join(dir, "GUIDE.md") }; };
export const readLog = (root = ".") => { const { LOG } = paths(root); return existsSync(LOG) ? readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l, k) => { try { return JSON.parse(l); } catch { throw new Error(`log.jsonl line ${k + 1} is not JSON`); } }) : []; };

// The snapshot is a fold over the log. Every visit of a stage is kept, so a loop (plan, spike, plan again) is history, not loss.
export function fold(events) {
  const s = { goal: null, done_when: [], stage: null, visit: 0, roadmap: STAGES.map((x) => ({ stage: x.stage, title: x.title, status: "todo", done_when: x.done_when, visits: [] })), decided: [], open: [], threads: [], blockers: [], plan: [], next: null, last: 0 };
  const road = (name) => s.roadmap.find((r) => r.stage === name) ?? (() => { throw new Error(`no stage ${name}`); })();
  const current = (name) => { const r = road(name); return r.visits[r.visits.length - 1]; };
  for (const e of events) {
    s.last = e.n;
    switch (e.type) {
      case "goal.set": s.goal = e.goal; s.done_when = e.done_when ?? s.done_when; break;
      case "stage.entered": case "stage.reopened": {
        const r = road(e.stage); r.status = "doing";
        r.visits.push({ visit: r.visits.length + 1, because: e.type === "stage.reopened" ? `reopened from ${e.from}: ${e.because}` : (e.because ?? "first"), at: e.n, checks: [], threads: [], ended: null });
        s.stage = e.stage; s.visit = r.visits.length; break;
      }
      case "stage.done": { const r = road(e.stage), v = current(e.stage); if (v) v.ended = { outcome: "done", at: e.n }; r.status = "done"; break; }
      case "check.ran": { const v = current(e.stage); if (v) v.checks.push({ check: e.check, cmd: e.cmd, pass: e.pass, at: e.n }); break; }
      case "decision": s.decided.push({ q: e.q, a: e.a, by: e.by ?? "owner", at: e.n }); s.open = s.open.filter((o) => o.q !== e.q); break;
      case "open": s.open.push({ q: e.q, waits_on: e.waits_on ?? "owner", blocks: e.blocks ?? e.stage, at: e.n }); break;
      case "closed": s.open = s.open.filter((o) => o.q !== e.q); break;
      case "thread.started": s.threads.push({ id: e.thread, role: e.role, stage: e.stage, visit: s.visit, task: e.task, status: "running", at: e.n }); current(e.stage)?.threads.push(e.thread); break;
      case "thread.returned": { const t = s.threads.find((x) => x.id === e.thread); if (t) { t.status = e.outcome; t.returned = e.n; } for (const q of e.open ?? []) s.open.push({ q, waits_on: "owner", blocks: e.stage, at: e.n }); break; }
      case "blocker": s.blockers.push({ what: e.what, stage: e.stage, at: e.n, cleared: false }); road(e.stage).status = "blocked"; break;
      case "replan": s.plan = e.plan ?? s.plan; for (const b of s.blockers) if (!b.cleared && (e.clears ?? []).includes(b.what)) b.cleared = true; if (road(s.stage).status === "blocked") road(s.stage).status = "doing"; break;
      case "note": break;
    }
    if (e.next) s.next = e.next;
  }
  return s;
}

const tick = { todo: "[ ]", doing: "[~]", done: "[x]", blocked: "[!]" };
export function page(s) {
  const out = [`# The guide`, "", `Made from .orthograph/guide/log.jsonl. Do not edit: the guide rewrites it every turn.`, "", `**Goal:** ${s.goal ?? "not set yet"}`, ""];
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

function write(root, events) { const { STATE, PAGE } = paths(root); const s = fold(events); writeFileSync(STATE, JSON.stringify(s, null, 2) + "\n"); writeFileSync(PAGE, page(s)); return s; }
export function append(root, e, now = new Date().toISOString()) {
  const { dir, LOG } = paths(root);
  mkdirSync(dir, { recursive: true });
  const events = readLog(root);
  if (!e || !TYPES.includes(e.type)) throw new Error(`unknown event type ${e?.type}; one of ${TYPES.join(", ")}`);
  const full = { n: events.length + 1, at: now, ...e };
  fold([...events, full]); // refuse an event the state cannot take, before it is written
  appendFileSync(LOG, JSON.stringify(full) + "\n");
  return write(root, [...events, full]);
}
export function init(root, goal) {
  if (!goal) throw new Error("init needs the goal, in the owner's words");
  if (readLog(root).length) throw new Error("this project already has a guide log: use log, not init");
  append(root, { type: "goal.set", goal, done_when: ["the first operation is planned, described, has agreed journeys that fail on purpose, and is proved and reviewed"], next: { do: "plan it with the owner", why: "nothing is planned yet" } });
  return append(root, { type: "stage.entered", stage: "plan", because: "first" });
}
export const rebuild = (root) => write(root, readLog(root));
export function brief(root) {
  if (!existsSync(paths(root).LOG)) return "orthograph guide: no project yet. Start with the guide skill.";
  const s = fold(readLog(root)), r = s.roadmap.find((x) => x.stage === s.stage);
  return [`orthograph guide: goal "${s.goal}"`, `now: ${r ? `${r.title}, visit ${s.visit}, ${r.status}` : "not started"}`,
    `done: ${s.roadmap.filter((x) => x.status === "done").map((x) => x.stage).join(", ") || "nothing yet"}`,
    s.next ? `next: ${s.next.do}${s.next.why ? ` (${s.next.why})` : ""}` : "", s.open.length ? `waiting: ${s.open.map((o) => o.q).join(" | ")}` : "",
    `running threads: ${s.threads.filter((t) => t.status === "running").map((t) => `${t.id} ${t.role}`).join(", ") || "none"}`].filter(Boolean).join("\n");
}

// The command line runs only when this file is run, not when it is imported (the tests import it).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--dir"), root = at >= 0 ? args.splice(at, 2)[1] : ".";
  const [cmd, value] = args;
  try {
    if (cmd === "init") console.log(`guide started: ${init(root, value).goal}`);
    else if (cmd === "log") { const s = append(root, JSON.parse(value)); console.log(`logged #${s.last}; now ${s.stage}, visit ${s.visit}`); }
    else if (cmd === "rebuild") console.log(`rebuilt from ${rebuild(root).last} events`);
    else if (cmd === "show") console.log(readFileSync(paths(root).STATE, "utf8"));
    else if (cmd === "brief") console.log(brief(root));
    else { console.error("usage: guide-state.mjs init|log|rebuild|brief|show [--dir <app>]"); process.exit(2); }
  } catch (err) { console.error(`guide-state: ${err.message}`); process.exit(1); }
}
