import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { EventNames } from "orthograph/server";
import { BusyLive } from "#modules/work/service.js";
import { Handlers, Reads } from "#modules/handler/service.js";
import type { Handler } from "#modules/handler/types.js";
import { storeMemory } from "./service.ts";
import { Records } from "./types.ts";

const Amount = Blueprint.value(Blueprint.uint(128));
const Person = Blueprint.thing({ description: "Someone.", fields: { id: Blueprint.id("per") } });
const Purse = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("pur"), member: Person.fields.id, spent: Amount } });
const Spent = Blueprint.event({ purse: Purse.fields.id, amount: Amount });
EventNames.name(Spent, "Spent");
const Opened = Blueprint.event({ purse: Purse.fields.id });
const machine = Blueprint.machine(Purse, {
  states: ["active"],
  moves: { open: { from: [], to: "active", emits: Opened }, spend: { from: ["active"], to: "active", emits: Spent } },
  notFrom: { exit: 40 },
});
const holder = Blueprint.role(Purse, { rule: (p, who) => p.member === who.person });
const spend = Blueprint.operation(Purse, {
  description: "Spend.", payload: { purse: Purse.fields.id, amount: Amount }, answer: { spent: Amount },
  move: machine.moves.spend, allowed: [holder], idempotent: "request",
});
const get = Blueprint.read(Purse, { by: "id", fields: ["member", "spent", "state"], allowed: [holder] });
const spender: Handler<typeof spend, Records> = ({ purse, amount }, { move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const spent = ((yield* records.find(Purse, purse))!["spent"] as bigint) + amount;
    yield* records.update(Purse, purse, { spent });
    yield* move();
    return { spent };
  });
const olga = { kind: "person", person: "per_olga", via: "session" } as const;
const bob = { kind: "person", person: "per_bob", via: "session" } as const;
const world = () => storeMemory([[Purse, { id: "pur_1", member: "per_olga", spent: 0n, state: "active" }]]);
const served = Handlers.serve({ name: "purse.spend", operation: spend, handler: spender, notFrom: "PurseNotActive" });

describe("a request key", () => {
  it("the same key twice is one call: the same answer, one event, spent once", async () => {
    const memory = world();
    const [a, b] = await Effect.runPromise(Effect.all([
      served.run({ purse: "pur_1" as never, amount: 100n }, olga, "coffee-1"),
      served.run({ purse: "pur_1" as never, amount: 100n }, olga, "coffee-1"),
    ], { concurrency: "unbounded" }).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));
    expect([a, b]).toEqual([{ spent: 100n }, { spent: 100n }]);
    expect(memory.rows[0]!.instance["spent"]).toBe(100n);
    expect(memory.entries).toHaveLength(1);
  });

  it("another key, or no key, is another call", async () => {
    const memory = world();
    await Effect.runPromise(Effect.all([
      served.run({ purse: "pur_1" as never, amount: 100n }, olga, "a"),
      served.run({ purse: "pur_1" as never, amount: 100n }, olga, "b"),
      served.run({ purse: "pur_1" as never, amount: 100n }, olga),
    ]).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));
    expect(memory.rows[0]!.instance["spent"]).toBe(300n);
  });
});

describe("a read", () => {
  const read = Reads.serve({ name: "purse.get", read: get });
  it("answers the fields it names, with the state, to someone its role allows", async () => {
    const answer = await Effect.runPromise(read.run({ id: "pur_1" }, olga).pipe(Effect.provide(world().layer)));
    expect(answer).toEqual({ member: "per_olga", spent: 0n, state: "active" });
  });
  it("refuses someone else, and refuses a missing id the same way", async () => {
    for (const [who, id] of [[bob, "pur_1"], [olga, "pur_9"]] as const) {
      const exit = await Effect.runPromiseExit(read.run({ id }, who).pipe(Effect.provide(world().layer)));
      expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toMatchObject({ _tag: "NotAllowed" });
    }
  });
});
