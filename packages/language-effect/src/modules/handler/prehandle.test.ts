// K16, M1.46 (checks ahead of their build, written by the ✍️ author): the runtime hands a handler what it already read
// or can make from the declaration, and refuses what is missing before the handler runs. A handler holds only decisions.
// Through `Handlers.serve` with an in-memory store, as handler.test.ts does; a builder never edits this file.
import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { EventNames } from "orthograph/server";
import { storeMemory } from "#modules/records/service.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "./service.ts";
import type { Handler } from "./types.ts";

const Amount = Blueprint.value(Blueprint.uint(128));
const Person = Blueprint.thing({ description: "Someone.", fields: { id: Blueprint.id("per") } });
const Purse = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("pur"), member: Person.fields.id, limit: Amount, spent: Amount } });
const Opened = Blueprint.event({ purse: Purse.fields.id, limit: Amount });
EventNames.name(Opened, "Opened");
const Spent = Blueprint.event({ purse: Purse.fields.id, amount: Amount });
EventNames.name(Spent, "Spent");
const machine = Blueprint.machine(Purse, {
  states: ["active", "exhausted"],
  moves: { open: { from: [], to: "active", emits: Opened }, spend: { from: ["active"], to: ["active", "exhausted"], emits: Spent } },
  notFrom: { exit: 40 },
});
const holder = Blueprint.role(Purse, { rule: (p, who) => p.member === who.person });

/** What K16 adds to the handler's context. Read through a cast so this file type-checks before it exists. */
interface Prehandled {
  readonly subject?: Readonly<Record<string, unknown>>;
  readonly refs?: Readonly<Record<string, Readonly<Record<string, unknown>> | undefined>>;
  readonly id?: string;
}
const given = (context: unknown) => context as Prehandled;

// Signed in is enough: no role check reads the purse, so the runtime reads it for the handler.
const spend = Blueprint.operation(Purse, {
  description: "Spend some.", payload: { purse: Purse.fields.id, amount: Amount }, answer: { remaining: Amount },
  move: machine.moves.spend, allowed: [Blueprint.signedIn],
});
// The holder's role check reads the purse: a missing one stays NotAllowed, so a stranger learns nothing.
const held = Blueprint.operation(Purse, {
  description: "Spend some, as the holder.", payload: { purse: Purse.fields.id, amount: Amount }, answer: { remaining: Amount },
  move: machine.moves.spend, allowed: [holder],
});
// A creating move whose payload names a person no role check reads.
const open = Blueprint.operation(Purse, {
  description: "Open a purse for someone.", payload: { member: Purse.fields.member, limit: Amount }, answer: { purse: Purse.fields.id },
  move: machine.moves.open, allowed: [Blueprint.signedIn],
});

const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const notFound = { purse: "PurseNotFound", member: "PersonNotFound" };
const world = () => storeMemory([[Purse, { id: "pur_1", member: "per_ada", limit: 500n, spent: 100n, state: "active" }], [Person, { id: "per_ada" }]]);
const run = <A>(effect: Effect.Effect<A, unknown, never>) => Effect.runPromiseExit(effect);
const refusal = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined);

describe("K16: the runtime hands in what it already read (M1.46)", () => {
  it("hands the handler its subject, the instance the from-check read", async () => {
    const seen: Array<Prehandled["subject"]> = [];
    const handler: Handler<typeof spend> = ({ amount }, context) => {
      seen.push(given(context).subject);
      const subject = given(context).subject ?? {};
      const remaining = (subject["limit"] as bigint) - (subject["spent"] as bigint) - amount;
      return Effect.as(context.move(remaining === 0n ? "exhausted" : "active"), { remaining });
    };
    const memory = world();
    const served = Handlers.serve({ name: "purse.spend", operation: spend, handler, notFrom: "PurseNotActive", notFound } as never);
    const exit = await run(served.call({ purse: "pur_1", amount: "50" }, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))) as never);
    expect(seen[0], "context.subject").toMatchObject({ id: "pur_1", limit: 500n, spent: 100n, state: "active" });
    expect(Exit.isSuccess(exit) ? exit.value : refusal(exit)).toEqual({ remaining: 350n });
  });

  it("hands in each thing the payload references by id, keyed by the payload's field", async () => {
    const seen: Array<Prehandled["refs"]> = [];
    const handler: Handler<typeof open> = (_payload, context) => {
      seen.push(given(context).refs);
      return Effect.as(context.move(), { purse: (given(context).id ?? "pur_x") as never });
    };
    const memory = world();
    const served = Handlers.serve({ name: "purse.open", operation: open, handler, notFound } as never);
    await run(served.call({ member: "per_ada", limit: "10" }, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))) as never);
    expect(seen[0], "context.refs").toMatchObject({ member: { id: "per_ada" } });
  });

  it("mints a creating move's id and hands it in, and the answer that uses it commits", async () => {
    const ids: Array<string | undefined> = [];
    const handler: Handler<typeof open> = (_payload, context) => {
      ids.push(given(context).id);
      return Effect.as(context.move(), { purse: given(context).id as never });
    };
    const memory = world();
    const served = Handlers.serve({ name: "purse.open", operation: open, handler, notFound } as never);
    const exit = await run(served.call({ member: "per_ada", limit: "10" }, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))) as never);
    expect(ids[0], "context.id").toMatch(/^pur_[0-9a-z]+$/);
    expect(Exit.isSuccess(exit) ? exit.value : refusal(exit)).toEqual({ purse: ids[0] });
    expect(memory.entries.map((e) => e.event)).toEqual(["Opened"]);
  });
});

describe("K16: a missing id is refused before the handler, with a generated <Thing>NotFound (M1.46)", () => {
  const ran: Array<string> = [];
  const spender: Handler<typeof spend> = () => Effect.sync(() => ran.push("spend")).pipe(Effect.as({ remaining: 0n }));
  const opener: Handler<typeof open> = () => Effect.sync(() => ran.push("open")).pipe(Effect.as({ purse: "pur_x" as never }));

  it("refuses a missing subject no role check read as PurseNotFound, carrying the id, and never runs the handler", async () => {
    ran.length = 0;
    const served = Handlers.serve({ name: "purse.spend", operation: spend, handler: spender, notFrom: "PurseNotActive", notFound } as never);
    const exit = await run(served.call({ purse: "pur_gone", amount: "1" }, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, world().layer))) as never);
    expect(refusal(exit)).toMatchObject({ _tag: "PurseNotFound", id: "pur_gone" });
    expect(ran).toEqual([]);
  });

  it("refuses a referenced id that names nothing as PersonNotFound, and never runs the handler", async () => {
    ran.length = 0;
    const served = Handlers.serve({ name: "purse.open", operation: open, handler: opener, notFound } as never);
    const exit = await run(served.call({ member: "per_nobody", limit: "10" }, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, world().layer))) as never);
    expect(refusal(exit)).toMatchObject({ _tag: "PersonNotFound", id: "per_nobody" });
    expect(ran).toEqual([]);
  });

  it("control: a missing subject behind a role check stays NotAllowed", async () => {
    ran.length = 0;
    const served = Handlers.serve({ name: "purse.held", operation: held, handler: spender, notFrom: "PurseNotActive", notFound } as never);
    const exit = await run(served.call({ purse: "pur_gone", amount: "1" }, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, world().layer))) as never);
    expect(refusal(exit)).toMatchObject({ _tag: "NotAllowed" });
    expect(ran).toEqual([]);
  });
});
