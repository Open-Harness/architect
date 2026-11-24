// The outbox on a real D1 in workerd: a ticket's moves write rows with their events, and the drain calls `ticket.mark` as the system.
import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { TestClock } from "effect/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { ErrorNames, EventNames } from "orthograph/server";
import { Busy, BusyLive, Handlers, Records, Store, type Handler } from "@orthograph/language-effect";
import { Database } from "#modules/database/service.js";
import { StoreD1 } from "#modules/store/service.js";
import { Outbox } from "./service.ts";
import type { HopTable, OutboxRow, Served } from "./types.ts";

const Switch = Blueprint.thing({ description: "A switch.", fields: { id: Blueprint.id("swi") } });
const Ticket = Blueprint.thing({ description: "A ticket.", fields: { id: Blueprint.id("tkt") } });
const Opened = Blueprint.event({ ticket: Ticket.fields.id, sw: Switch.fields.id });
const Noted = Blueprint.event({ ticket: Ticket.fields.id, sw: Switch.fields.id });
EventNames.name(Opened, "TicketOpened");
EventNames.name(Noted, "TicketNoted");
const machine = Blueprint.machine(Ticket, {
  states: ["open"],
  moves: { open: { from: [], to: "open", emits: Opened }, note: { from: ["open"], to: "open", emits: Noted } },
  notFrom: { exit: 40 },
});
class Gone extends Blueprint.error({}, { exit: 41 }) {}
ErrorNames.name(Gone, "Gone");
const open = Blueprint.operation(Ticket, { description: "Open.", payload: { sw: Switch.fields.id }, answer: { ticket: Ticket.fields.id }, move: machine.moves.open, allowed: [Blueprint.signedIn] });
const note = Blueprint.operation(Ticket, { description: "Note.", payload: { ticket: Ticket.fields.id, sw: Switch.fields.id }, answer: { ticket: Ticket.fields.id }, move: machine.moves.note, allowed: [Blueprint.signedIn] });
const mark = Blueprint.operation(Ticket, {
  description: "Mark.", payload: { ticket: Ticket.fields.id }, answer: { ticket: Ticket.fields.id }, allowed: [Blueprint.system], errors: [Gone],
  on: [Blueprint.on(Opened, (e) => ({ ticket: e.ticket })), Blueprint.on(Noted, (e) => ({ ticket: e.ticket }))],
});
const later = Blueprint.operation(Ticket, { description: "Later.", payload: { ticket: Ticket.fields.id, sw: Switch.fields.id }, answer: { ticket: Ticket.fields.id }, allowed: [Blueprint.system] });
const remark = Blueprint.operation(Ticket, {
  description: "Remark.", payload: { ticket: Ticket.fields.id }, answer: { ticket: Ticket.fields.id }, allowed: [Blueprint.system], errors: [Gone],
  on: [Blueprint.on(Opened, (e) => ({ ticket: e.ticket }), { onRefused: { error: Gone, then: later } })],
});

const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const hold = { by: "switched", field: "sw" };
const hops: HopTable = new Map([
  ["TicketOpened", [{ to: "op:ticket.mark", hold }, { to: "op:ticket.remark" }]],
  ["TicketNoted", [{ to: "op:ticket.mark", hold }]],
]);

/** What `mark` does on each call: the script says to answer, die or refuse; the calls it saw are kept, with the key each came under. */
const script: { next: Array<"ok" | "die" | "refuse">; calls: Array<{ ticket: string; kind: string }>; later: Array<string>; handled: number } = { next: [], calls: [], later: [], handled: 0 };
const marker: Handler<typeof mark, Records> = ({ ticket }) =>
  Effect.gen(function* () {
    script.handled++;
    const what = script.next.shift() ?? "ok";
    if (what === "die") return yield* Effect.die(new Error("boom"));
    if (what === "refuse") return yield* Effect.fail(new Gone({}));
    return { ticket };
  });
const remarker: Handler<typeof remark, Records> = () => Effect.fail(new Gone({}));
const laterer: Handler<typeof later, Records> = ({ ticket }) => Effect.sync(() => { script.later.push(ticket); return { ticket }; });
const opener: Handler<typeof open, Records> = (_, { move }) =>
  Effect.gen(function* () {
    const id = `tkt_${crypto.randomUUID().slice(0, 8)}`;
    yield* (yield* Records).insert(Ticket, { id: id as never });
    yield* move();
    return { ticket: id as never };
  });
const noter: Handler<typeof note, Records> = ({ ticket }, { move }) => Effect.as(move(), { ticket });

const opened = Handlers.serve({ name: "ticket.open", operation: open, handler: opener });
const noted = Handlers.serve({ name: "ticket.note", operation: note, handler: noter, notFrom: "TicketNotOpen" });
const marked = Handlers.serve({ name: "ticket.mark", operation: mark, handler: marker });
const remarked = Handlers.serve({ name: "ticket.remark", operation: remark, handler: remarker });
const laterServed = Handlers.serve({ name: "ticket.later", operation: later, handler: laterer });

const store = StoreD1.layer({ tables: [[Ticket, "ticket"], [Switch, "switch"]], outbox: hops }).pipe(Layer.provide(Database.d1(env.DB)));
const world = Layer.mergeAll(store, BusyLive, TestClock.layer());
const declared = [["ticket.mark", mark], ["ticket.remark", remark], ["ticket.later", later]] as const;
const served = { "ticket.mark": marked, "ticket.remark": remarked, "ticket.later": laterServed } as unknown as Readonly<Record<string, Served<Store>>>;

const pass = (extra: { policy?: { backoff: number; max: number; attempts: number; lease: number } } = {}) =>
  Outbox.drain<Store>({ dbs: [{ db: env.DB, prefix: "evt_" }], hops: Outbox.hopsOf(declared, []), served, holds: ["switched"], next: () => Effect.void, ...extra });

const rows = async (): Promise<ReadonlyArray<Record<string, unknown>>> => (await env.DB.prepare(`SELECT * FROM "_outbox" ORDER BY "seq", "to"`).all()).results;
const run = <A>(program: Effect.Effect<A, unknown, Busy | Store>) => Effect.runPromise(program.pipe(Effect.provide(world)) as Effect.Effect<A>);
const outboxRows = async () => {
  const r = await Outbox.door([{ db: env.DB, prefix: "evt_" }], new Request("http://w/_world/outbox"))!;
  return ((await r.json()) as { rows: ReadonlyArray<OutboxRow> }).rows;
};

beforeEach(async () => {
  await env.DB.batch(["_outbox", "_outbox_rules", "_stats", "_journal", "_requests", "ticket", "switch"].map((t) => env.DB.prepare(`DELETE FROM "${t}"`)));
  script.next = []; script.calls = []; script.later = []; script.handled = 0;
});

describe("rows: written with the event, or not at all", () => {
  it("a commit writes one row per hop of its event, held by the switch it names", async () => {
    await run(opened.call({ sw: "swi_a" }, ada));
    const r = await rows();
    expect(r.map((x) => [x["to"], x["state"], x["attempts"], x["hold"], x["hold_by"]])).toEqual([["op:ticket.mark", "pending", 0, "swi_a", "switched"], ["op:ticket.remark", "pending", 0, null, null]]);
    expect(String(r[0]!["event"])).toMatch(/^evt_\d+$/);
    expect(r[0]!["subject"]).toMatch(/^tkt_/);
  });

  it("a commit that loses its guard writes no row, and is counted", async () => {
    const id = (await run(opened.call({ sw: "swi_a" }, ada))).ticket as string;
    const before = (await rows()).length;
    const entry = { trace: "t", operation: "ticket.note", move: "note", subject: "tkt_x", event: "TicketNoted", fields: { ticket: "tkt_x", sw: "swi_a" } };
    const outcome = await run(Effect.flatMap(Effect.service(Store), (s) => s.commit({ writes: [{ kind: "update", thing: Ticket, id, version: 9, changes: {}, state: undefined }], entries: [entry] })));
    expect(outcome).toBe("conflict");
    expect((await rows()).length).toBe(before);
    expect((await env.DB.prepare(`SELECT "n" FROM "_stats" WHERE "key" = 'conflicts'`).first<{ n: number }>())?.n).toBe(1);
  });
});

describe("the drain", () => {
  it("delivers each row once, in the order the events were written, as the system", async () => {
    const ids: Array<string> = [];
    for (let i = 0; i < 3; i++) ids.push((await run(opened.call({ sw: `swi_${i}` }, ada))).ticket as string);
    await run(pass());
    const done = await outboxRows();
    expect(done.every((r) => r.state === "delivered" && r.attempts === 0)).toBe(true);
    expect(done.filter((r) => r.to === "op:ticket.mark").map((r) => r.subject)).toEqual(ids);
    expect(script.handled).toBe(3);
  });

  it("a redelivery changes nothing: the key answers what the first answered", async () => {
    await run(opened.call({ sw: "swi_a" }, ada));
    await run(pass());
    expect(script.handled).toBe(1);
    const mine = (await outboxRows()).find((r) => r.to === "op:ticket.mark")!;
    const again = await Outbox.door([{ db: env.DB, prefix: "evt_" }], new Request("http://w/_world/outbox/redeliver", { method: "POST", body: JSON.stringify({ event: mine.event, to: "op:ticket.mark" }) }))!;
    expect(await again.json()).toEqual({ redelivered: 1 });
    await run(pass());
    expect(script.handled).toBe(1);
    expect((await outboxRows()).find((r) => r.to === "op:ticket.mark")).toMatchObject({ state: "delivered", attempts: 0 });
  });

  it("retries a defect with backoff, 1 s doubling, and a later row of the subject waits behind it", async () => {
    const id = (await run(opened.call({ sw: "swi_a" }, ada))).ticket as string;
    await run(noted.call({ ticket: id, sw: "swi_a" }, ada));
    script.next = ["die", "die"];
    await run(Effect.gen(function* () {
      yield* pass();
      let now = (yield* Effect.clockWith((c) => c.currentTimeMillis));
      const first = (yield* Effect.promise(outboxRows)).filter((r) => r.to === "op:ticket.mark");
      expect(first.map((r) => [r.state, r.attempts])).toEqual([["pending", 1], ["pending", 0]]);
      expect(Date.parse(first[0]!.due) - now).toBe(1000);
      yield* TestClock.adjust(1000); yield* pass();
      const second = (yield* Effect.promise(outboxRows)).filter((r) => r.to === "op:ticket.mark");
      expect(second.map((r) => [r.state, r.attempts])).toEqual([["pending", 2], ["pending", 0]]);
      now = yield* Effect.clockWith((c) => c.currentTimeMillis);
      expect(Date.parse(second[0]!.due) - now).toBe(2000);
      yield* TestClock.adjust(2000); yield* pass();
    }));
    expect((await outboxRows()).filter((r) => r.to === "op:ticket.mark").map((r) => [r.state, r.attempts])).toEqual([["delivered", 2], ["delivered", 0]]);
    expect(script.handled).toBe(4);
  });

  it("fails a row after its last attempt, kept", async () => {
    await run(opened.call({ sw: "swi_a" }, ada));
    script.next = ["die", "die"];
    await run(Effect.gen(function* () {
      const policy = { backoff: 10, max: 10, attempts: 2, lease: 30_000 };
      yield* pass({ policy }); yield* TestClock.adjust(10); yield* pass({ policy });
    }));
    expect((await outboxRows()).find((r) => r.to === "op:ticket.mark")).toMatchObject({ state: "failed", attempts: 2, outcome: "boom" });
  });

  it("a refusal is an answer: the row is refused and not retried", async () => {
    await run(opened.call({ sw: "swi_a" }, ada));
    script.next = ["refuse"];
    await run(Effect.gen(function* () { yield* pass(); yield* TestClock.adjust(100_000); yield* pass(); }));
    expect((await outboxRows()).find((r) => r.to === "op:ticket.mark")).toMatchObject({ state: "refused", attempts: 0, outcome: "Gone" });
    expect(script.handled).toBe(1);
  });

  it("a declared refusal ends the row delivered with the error's tag, no attempt, and calls the named operation", async () => {
    await run(opened.call({ sw: "swi_a" }, ada));
    await run(pass());
    expect((await outboxRows()).find((r) => r.to === "op:ticket.remark")).toMatchObject({ state: "delivered", attempts: 0, outcome: "Gone" });
    expect(script.later.length).toBe(1);
  });
});

describe("holds", () => {
  it("a held row stays pending, keeps its place and uses no attempt; letting it go delivers in order", async () => {
    await env.DB.prepare(`INSERT INTO "switch" ("id", "state") VALUES ('swi_a', 'on')`).run();
    const id = (await run(opened.call({ sw: "swi_a" }, ada))).ticket as string;
    await run(noted.call({ ticket: id, sw: "swi_a" }, ada));
    await run(Effect.gen(function* () { yield* pass(); yield* TestClock.adjust(1_000_000); yield* pass(); }));
    const held = (await outboxRows()).filter((r) => r.to === "op:ticket.mark");
    expect(held.map((r) => [r.name, r.state, r.attempts])).toEqual([["TicketOpened", "pending", 0], ["TicketNoted", "pending", 0]]);
    expect(script.handled).toBe(0);
    await env.DB.prepare(`UPDATE "switch" SET "state" = 'off'`).run();
    await run(pass());
    expect((await outboxRows()).filter((r) => r.to === "op:ticket.mark").map((r) => r.state)).toEqual(["delivered", "delivered"]);
    expect(script.handled).toBe(2);
  });

  it("a test's park holds one event name's future rows until it is released", async () => {
    const d = (path: string, body: unknown) => Outbox.door([{ db: env.DB, prefix: "evt_" }], new Request(`http://w/_world/outbox/${path}`, { method: "POST", body: JSON.stringify(body) }))!.then((r) => r.json() as Promise<Record<string, unknown>>);
    await d("hold", { name: "TicketOpened", to: "op:ticket.mark" });
    await run(opened.call({ sw: "swi_a" }, ada));
    await run(pass());
    expect(script.handled).toBe(0);
    expect(await d("release", { hold: "all" })).toEqual({ released: 1 });
    await run(pass());
    expect(script.handled).toBe(1);
  });
});

describe("a restart", () => {
  it("a row a dead drain claimed is taken again once its lease ends, and delivered once", async () => {
    await run(opened.call({ sw: "swi_a" }, ada));
    const now = await run(Effect.clockWith((c) => c.currentTimeMillis));
    await env.DB.prepare(`UPDATE "_outbox" SET "state" = 'claimed', "claim" = 'dead', "due" = ? WHERE "to" = 'op:ticket.mark'`).bind(now + 30_000).run();
    await run(pass());
    expect(script.handled).toBe(0);
    await run(Effect.gen(function* () { yield* TestClock.adjust(30_000); yield* pass(); yield* pass(); }));
    expect(script.handled).toBe(1);
    expect((await outboxRows()).find((r) => r.to === "op:ticket.mark")).toMatchObject({ state: "delivered" });
  });

  it("says when something is due next, so the timer can be set again", async () => {
    await run(opened.call({ sw: "swi_a" }, ada));
    script.next = ["die"];
    const seen: Array<number | undefined> = [];
    await run(Outbox.drain<Store>({ dbs: [{ db: env.DB, prefix: "evt_" }], hops: Outbox.hopsOf(declared, []), served, holds: ["switched"], next: (at) => Effect.sync(() => void seen.push(at)) }));
    const now = await run(Effect.clockWith((c) => c.currentTimeMillis));
    expect(seen).toEqual([now + 1000]);
  });
});
