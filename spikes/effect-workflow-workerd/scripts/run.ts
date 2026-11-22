// Runs the spike: starts dist/worker.js (run `pnpm build` first) in workerd through Miniflare with its Durable Objects
// persisted under .mf/, and prints every check and measurement as JSON lines. Exits 1 if any check fails. Throwaway.
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { resolve } from "node:path";
import { rmSync } from "node:fs";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 1, 9);
const iso = (t: number) => new Date(t).toISOString();

rmSync(".mf", { recursive: true, force: true });
const options = convertV4MiniflareOptions({
  resourcePersistencePath: resolve(".mf"),
  modules: true,
  scriptPath: "dist/worker.js",
  compatibilityDate: "2026-08-01",
  compatibilityFlags: ["nodejs_compat"],
  durableObjects: {
    CLUSTER_WORKFLOW: { className: "ClusterWorkflow", useSQLite: true },
    WORLD: { className: "World", useSQLite: true },
    LEDGER: { className: "Ledger", useSQLite: true },
  },
});
let mf = new Miniflare(options);
let restarts = 0;
/** The strongest eviction there is locally: stop workerd and start a new process on the same storage. */
const restart = async () => {
  await mf.dispose();
  mf = new Miniflare(options);
  await mf.ready;
  restarts++;
};

const call = async (path: string, body?: unknown): Promise<any> => {
  const res = await mf.dispatchFetch("http://spike.local" + path, body === undefined ? {} : { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { status: res.status, text }; }
};
const status = (run: string) => call(`/status?run=${run}`);
const ledger = async (run: string) => (await status(run)).ledger;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const waitFor = async <A>(what: string, read: () => Promise<A>, ok: (a: A) => boolean, limit = 15_000): Promise<{ value: A; ms: number }> => {
  const started = performance.now();
  for (;;) {
    const value = await read();
    if (ok(value)) return { value, ms: Math.round(performance.now() - started) };
    if (performance.now() - started > limit) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(value)}`);
    await sleep(25);
  }
};

let failed = 0;
const check = (name: string, ok: boolean, evidence: unknown) => {
  if (!ok) failed++;
  console.log(JSON.stringify({ check: name, ok, evidence }));
};
const measure = (name: string, value: unknown) => console.log(JSON.stringify({ measure: name, value }));
const canon = (v: unknown): unknown => v !== null && typeof v === "object" && !Array.isArray(v)
  ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canon(x)]))
  : v;
/** Equal as JSON, ignoring the order of object keys (the ledger returns its counts in SQL order). */
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

await mf.ready;

// ── A. Replay after eviction, an event, a wait on the world's clock, duplicate wake-ups ──────────────────────────
{
  const run = "a";
  const t = await call("/start", { run, sleep: "timers", settleDelayMs: 1500 });
  const parked = await waitFor("A parked on the event", () => status(run), (s) => s.object.activities.length === 2 && s.object.execution?.result?.includes("Suspended"));
  measure("A: start → suspended on the event (ms)", { start: t.ms, untilSuspended: parked.ms });
  check("A1 freeze and propose each ran once, then the run suspended on the event",
    same(parked.value.ledger.calls, { freeze: 1, propose: 1 }) && same(parked.value.object.activities, ["freeze/1", "propose/1"]),
    { ledger: parked.value.ledger.calls, stored: parked.value.object.activities, result: parked.value.result });

  const before = parked.value.object.born;
  const evicted = await call("/evict", { run });
  const after = await status(run);
  check("A2 an evicted object comes back as a new instance with its activities from SQLite, and nothing re-ran",
    evicted.evicted && after.object.born !== before && same(after.object.activities, ["freeze/1", "propose/1"]) && same(after.ledger.calls, { freeze: 1, propose: 1 }),
    { evict: evicted.error, bornBefore: before, bornAfter: after.object.born, ledger: after.ledger.calls });

  const restartStarted = performance.now();
  await restart();
  measure("A: workerd restart (ms)", Math.round(performance.now() - restartStarted));

  const confirmed = await call("/confirm", { run, proposal: "proposal-7" });
  const linked = await waitFor("A linked and parked on the timer", () => status(run), (s) => s.object.activities.includes("timer/cooldown/1") && s.object.execution?.result?.includes("Suspended"));
  measure("A: event → replayed past freeze and propose, link done, parked on the timer (ms)", { confirm: confirmed.ms, untilParked: linked.ms });
  check("A3 after eviction and a workerd restart, the event's replay skipped freeze and propose and ran link once",
    same(linked.value.ledger.calls, { freeze: 1, propose: 1, link: 1 }) && linked.value.ledger.effects.link === "proposal-7",
    { ledger: linked.value.ledger, stored: linked.value.object.activities, deferreds: linked.value.object.deferreds });

  const world0 = await call("/world");
  check("A4 the wait is one row in the world's timer table, due 30 days after the world's instant when it was set (not the wall clock)",
    world0.timers.length === 1 && world0.timers[0].at === T0 + 30 * DAY && world0.timers[0].set_at === T0,
    { worldNow: world0.now, timers: world0.timers.map((r: any) => ({ ...r, at: iso(r.at), set_at: iso(r.set_at) })), realNow: iso(Date.now()) });

  const bornBeforeDup = linked.value.object.born;
  const dup = await call("/confirm", { run, proposal: "proposal-8" });
  await sleep(500);
  const afterDup = await status(run);
  const storedEvent = afterDup.object.deferredExits.confirmed as string;
  check("A5 a second delivery of the event (a different value) is refused by the engine: the stored exit still holds the first value, and link still ran once with it",
    storedEvent.includes("proposal-7") && !storedEvent.includes("proposal-8") && afterDup.object.deferreds.filter((n: string) => n === "confirmed").length === 1
      && same(afterDup.ledger.calls, { freeze: 1, propose: 1, link: 1 }) && afterDup.ledger.effects.link === "proposal-7" && afterDup.object.execution.result.includes("Suspended"),
    { secondConfirm: dup, storedEvent, sameInstance: afterDup.object.born === bornBeforeDup, ledger: afterDup.ledger });

  const almost = await call("/advance", { days: 29 });
  await sleep(300);
  const notYet = await status(run);
  check("A6 29 days on the world's clock: nothing fires, the run stays parked",
    almost.value.fired.length === 0 && notYet.ledger.calls.settle === undefined && notYet.object.execution.result.includes("Suspended"),
    { advance: { from: iso(almost.value.from), to: iso(almost.value.to), fired: almost.value.fired }, ledger: notYet.ledger.calls });

  const due = await call("/advance", { days: 1 });
  const settleAtReturn = (await ledger(run)).calls.settle ?? 0;
  const done = await waitFor("A complete", () => status(run), (s) => s.result !== null && s.result._tag === "Complete");
  measure("A: the 30th day → settled and complete (ms)", { advanceReturned: due.ms, settleRanWhenAdvanceReturned: settleAtReturn, untilComplete: done.ms });
  check("A7 the 30th day fires the timer once, in the world's time: settle ran once, at 1 December 09:00, and the run completed",
    due.value.fired.length === 1 && done.value.ledger.calls.settle === 1 && done.value.ledger.effects.settle === iso(T0 + 30 * DAY) && done.value.result.exit._tag === "Success",
    { fired: due.value.fired.map((f: any) => ({ ...f, at: iso(f.at) })), result: done.value.result, ledger: done.value.ledger });
  check("A8 with a settle that takes 1.5 s, the world's advance returned before settle ran: the replay runs detached, so 'quiet' needs the world's work count (K23 section 5)",
    settleAtReturn === 0, { settleCallsWhenAdvanceReturned: settleAtReturn });

  const refire = await call("/refire", { run });
  await sleep(500);
  await call("/evict", { run });
  const afterRefire = await status(run);
  check("A9 the same timer fired again, then the object evicted: settle still ran once and the result stands",
    afterRefire.ledger.calls.settle === 1 && same(afterRefire.result, done.value.result),
    { refire: refire.value, ledger: afterRefire.ledger.calls });
  check("A10 every activity body ran exactly once across one eviction, one workerd restart, a duplicate event and a duplicate timer",
    same(afterRefire.ledger.calls, { freeze: 1, propose: 1, link: 1, settle: 1 }), afterRefire.ledger.calls);
}

// ── B. Eviction in the middle of an activity (after its effect, before the engine saved its result) ──────────────
for (const [run, contact] of [["b-contact", true], ["b-alarm", false]] as const) {
  await call("/start", { run, sleep: "timers", crashIn: "propose" });
  const started = performance.now();
  // b-contact: the driver touches the object (a poll), which replays it. b-alarm: only the ledger is read, so nothing
  // but the engine's own guard alarm can bring the run back.
  const read = contact ? () => status(run).then((s) => s.ledger) : () => call(`/ledger?run=${run}`);
  const back = await waitFor(`${run} replayed propose`, read, (l: any) => (l.calls.propose ?? 0) >= 2, 120_000);
  const s = await status(run);
  measure(`B (${run}): eviction inside propose → propose replayed (ms)`, Math.round(performance.now() - started));
  check(`B ${run}: an eviction inside an activity runs its body again (at least once), and the request key applies its effect once`,
    back.value.calls.propose === 2 && back.value.calls.freeze === 1 && Object.keys(s.ledger.effects).length === 2 && s.object.activities.includes("propose/1"),
    { ledger: s.ledger, stored: s.object.activities, recoveredBy: contact ? "contact (a poll)" : "the engine's resume-guard alarm" });
}

// ── C. The engine's own DurableClock in a stepped world ────────────────────────────────────────────────────────
{
  const run = "c";
  await call("/start", { run, sleep: "clock" });
  await waitFor("C parked on the event", () => status(run), (s) => s.object.activities.length === 2);
  await call("/confirm", { run, proposal: "proposal-c" });
  const parked = await waitFor("C parked on its clock", () => status(run), (s) => s.object.clocks.length === 1 && s.object.execution.result?.includes("Suspended"));
  const clock = parked.value.object.clocks[0];
  const realNow = Date.now();
  check("C1 DurableClock.sleep(30 days) is due 30 days from the wall clock, not the world's: the engine reads its own Clock",
    Math.abs(clock.wake_up - (realNow + 30 * DAY)) < 60_000, { wakeUp: iso(clock.wake_up), alarm: iso(parked.value.object.alarm), realNow: iso(realNow), worldNow: parked.value.worldNow });
  const moved = await call("/advance", { days: 45 });
  await call("/alarm", { run });
  await sleep(500);
  const still = await status(run);
  check("C2 stepping the world 45 days and running the object's alarm by hand does not wake it: the run is still parked",
    still.object.execution.result.includes("Suspended") && still.ledger.calls.settle === undefined && still.object.clocks[0].fired === 0,
    { worldNow: still.worldNow, advanced: { from: iso(moved.value.from), to: iso(moved.value.to) }, clocks: still.object.clocks, ledger: still.ledger.calls });
}

measure("workerd restarts", restarts);
await mf.dispose();
console.log(JSON.stringify({ failed }));
process.exit(failed === 0 ? 0 : 1);
