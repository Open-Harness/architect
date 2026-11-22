// Check 05 (M5.04): delivery that survives. A delivery that dies is retried with doubling backoff and, after the
// fifteenth attempt, is a `failed` row on /_world/outbox that redelivers with the command; and killing the world in the
// middle of a delivery delivers once after the restart (the milestone's done check). Each is the claim `notifications.md`
// makes of the outbox and Q5 of M5-reach-out pins.
//
// The club is check 02's (`e2e/fixtures/events/out`), launched (world.ts) so it can be killed, with the notification's
// sender pointed at a real HTTP server this check runs (sink.ts): `down` makes every attempt die, `hold` leaves one
// attempt in flight. The world's outbox runs on the real clock, with a short lease and first backoff (M5-reach-out Q1.6,
// `ORTHO_OUTBOX_LEASE`, `ORTHO_OUTBOX_BACKOFF`, written in the world's env file). Doubling from 2 ms, fifteen attempts are
// fourteen waits of 2 ms * (2^14 - 1) = 32.766 s: a check that waits less than 32 s between the first and the last
// attempt saw a fixed backoff, not a doubling one. Every expected count and name below is a literal.
//
// What is pinned: 15 attempts, then one `failed` row `{ event, to: "op:notification.invite", attempts: 15, outcome }`
// and no notification; `POST /_world/outbox/redeliver { event }` then delivers it once, and a second redeliver of a
// delivered row changes nothing and does not run the sender again; a kill while the sender holds a request, then a
// restart, leaves exactly one notification keyed by the event's id (the sender saw the held attempt and the retry: at
// least once outside, once inside), `failed` empty, and still one after more than two leases; an actor's events, killed
// before they all reach home, still deliver once each.
//
// Red today on the missing surface only: the club's blueprint does not load (`Blueprint.on`, `Blueprint.system`), and
// the Worker has no outbox, no `/_world/outbox`, no redelivery.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { startSink, type Sink } from "./sink.ts";
import { club, generated, nothingRunning } from "./support.ts";
import { call, journalOf, launchWorld, quiet, redeliver, trace, type Live } from "./world.ts";

const copy = club("out");
const handler = join(copy.root, "src/notification/invite.ts");
const original = readFileSync(handler, "utf8");
const sinks: Array<Sink> = [];
const worlds: Array<Live> = [];
/** Each test's world and sender end with the test: the next one starts clean and nothing is left running. */
afterEach(async () => {
  for (const world of worlds.splice(0)) await world.stop();
  for (const sink of sinks.splice(0)) await sink.close();
});
afterAll(() => {
  nothingRunning(copy.root);
  copy.remove();
});

/** The club generated with its sender pointed at `sink`, launched with a short lease and first backoff. */
const start = async (name: string) => {
  const sink = await startSink();
  sinks.push(sink);
  writeFileSync(handler, original.replace('"__SINK__"', JSON.stringify(sink.url)));
  const world = await launchWorld(generated(copy.root), name, { ORTHO_OUTBOX_LEASE: "3 seconds", ORTHO_OUTBOX_BACKOFF: "2 millis" });
  worlds.push(world);
  return { sink, world };
};
const send = async (url: string, operation: string, payload: object) => {
  const t = trace();
  const answer = await call(url, operation, payload, { traceparent: t.header });
  expect(answer.status, JSON.stringify(answer.body)).toBe(200);
  return t;
};
const notified = async (url: string) => {
  const page = await call(url, "notification.list", {});
  expect(page.status, JSON.stringify(page.body)).toBe(200);
  return (page.body["items"] as ReadonlyArray<{ to: string; cause: string; state: string }>).map((i) => [i.to, i.cause, i.state]);
};
/** The id of the one event a trace's journal holds under `name`. */
const eventOf = async (url: string, traceId: string, name: string) => {
  const rows = (await journalOf(url, traceId)).filter((r) => r.event === name);
  expect(rows.map((r) => r.event)).toEqual([name]);
  return rows[0]!.id;
};

describe("05 M5.04: delivery that survives", () => {
  it("a delivery that dies is retried fifteen times with doubling backoff, then shows as failed, and redelivers with the command", async () => {
    const { sink, world } = await start("events-retries");
    sink.mode("down");
    const t = await send(world.url, "invitation.send", { email: "bo@dies.example" });
    const event = await eventOf(world.url, t.id, "InvitationSent");
    const settled = await quiet(world.url, 120_000);
    expect(settled.pending + settled.claimed).toBe(0);
    expect(settled.failed.map((f) => [f.event, f.to, f.attempts])).toEqual([[event, "op:notification.invite", 15]]);
    expect(settled.failed[0]!.outcome).toMatch(/the sender answered 500/);
    expect(settled.refused).toEqual([]);

    const gaps = sink.hits.slice(1).map((h, i) => h.at - sink.hits[i]!.at);
    expect(sink.hits.map((h) => h.cause), "one sender request per attempt").toEqual(Array(15).fill(event));
    expect(sink.hits.at(-1)!.at - sink.hits[0]!.at, "fourteen doubling waits from 2 ms").toBeGreaterThanOrEqual(32_000);
    expect(gaps.at(-1)!, "the last wait is 2 ms * 2^13").toBeGreaterThanOrEqual(15_000);
    for (let i = 9; i < gaps.length; i++) expect(gaps[i]!, `wait ${i + 1} against wait ${i}`).toBeGreaterThanOrEqual(gaps[i - 1]! * 1.5);
    expect(await notified(world.url)).toEqual([]);

    sink.mode("up");
    const again = await redeliver(world.url, event, "op:notification.invite");
    expect([again.status, again.body]).toEqual([200, { redelivered: 1 }]);
    expect((await quiet(world.url)).failed).toEqual([]);
    expect(await notified(world.url)).toEqual([["bo@dies.example", event, "delivered"]]);
    expect(sink.hits).toHaveLength(16);

    // A delivered row redelivered changes nothing, and the sender is not asked again: the first answer is kept.
    expect((await redeliver(world.url, event)).body).toEqual({ redelivered: 1 });
    expect((await quiet(world.url)).failed).toEqual([]);
    expect(await notified(world.url)).toEqual([["bo@dies.example", event, "delivered"]]);
    expect(sink.hits).toHaveLength(16);
  });

  it("killing the world in the middle of a delivery delivers once after the restart", async () => {
    const { sink, world } = await start("events-kill");
    sink.mode("hold");
    const t = await send(world.url, "invitation.send", { email: "bo@holds.example" });
    const event = await eventOf(world.url, t.id, "InvitationSent");
    await sink.held();
    await world.kill();

    sink.mode("up");
    await world.restart();
    const settled = await quiet(world.url, 120_000);
    expect([settled.pending, settled.claimed, settled.failed, settled.refused]).toEqual([0, 0, [], []]);
    expect(await notified(world.url)).toEqual([["bo@holds.example", event, "delivered"]]);
    expect(sink.hits.map((h) => [h.to, h.cause]), "the held attempt, then the retry").toEqual([["bo@holds.example", event], ["bo@holds.example", event]]);
    expect((await journalOf(world.url, t.id)).map((r) => r.event)).toEqual(["InvitationSent", "NotificationDelivered"]);

    // More than two leases later nothing has come back to deliver it a second time.
    await new Promise<void>((resolve) => { setTimeout(resolve, 8000); });
    expect(await notified(world.url)).toEqual([["bo@holds.example", event, "delivered"]]);
    expect((await quiet(world.url)).failed).toEqual([]);
    expect(sink.hits).toHaveLength(2);
  });

  it("an actor's events, killed before they have all come home, are delivered once each after the restart", async () => {
    const { world } = await start("events-actor");
    const traces = [];
    for (const to of ["a@kills.example", "b@kills.example", "c@kills.example"]) traces.push([to, await send(world.url, "ping.send", { to })] as const);
    await world.kill();
    await world.restart();
    expect((await quiet(world.url, 120_000)).failed).toEqual([]);
    const events = await Promise.all(traces.map(async ([to, t]) => [to, await eventOf(world.url, t.id, "Pinged")] as const));
    expect((await notified(world.url)).map(([to, cause, state]) => [to, cause, state]).sort()).toEqual(events.map(([to, id]) => [to, id, "delivered"]).sort());
  });
});
