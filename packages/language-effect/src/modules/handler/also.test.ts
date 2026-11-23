// `also` (GOAL17-slice9-build, call 8): a handler's second move of another thing, in the same commit. Both entries are journalled, or neither.
import { Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { EventNames } from "orthograph/server";
import { storeMemory } from "#modules/records/service.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "./service.ts";
import type { Handler } from "./types.ts";

const Purse = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("pur"), note: Blueprint.text({ max: 40 }) } });
const Note = Blueprint.thing({ description: "A note on a purse.", fields: { id: Blueprint.id("not"), purse: Purse.fields.id, text: Blueprint.text({ max: 40 }) } });
const Opened = Blueprint.event({ id: Purse.fields.id });
const Noted = Blueprint.event({ id: Note.fields.id, purse: Note.fields.purse });
const Read = Blueprint.event({ id: Note.fields.id });
EventNames.name(Opened, "Opened");
EventNames.name(Noted, "Noted");
EventNames.name(Read, "Read");
const purseMachine = Blueprint.machine(Purse, { states: ["active"], moves: { open: { from: [], to: "active", emits: Opened } }, notFrom: { exit: 40 } });
const noteMachine = Blueprint.machine(Note, { states: ["new", "read"], moves: { write: { from: [], to: "new", emits: Noted }, read: { from: ["new"], to: "read", emits: Read } }, notFrom: { exit: 41 } });
const open = Blueprint.operation(Purse, {
  description: "Open a purse, with a note.", payload: { note: Purse.fields.note }, answer: { purse: Purse.fields.id, note: Note.fields.id },
  move: purseMachine.moves.open, allowed: [Blueprint.signedIn],
});
const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const serve = (handler: Handler<typeof open>, memory = storeMemory([])) =>
  [Handlers.serve({ name: "purse.open", operation: open, handler }), memory] as const;
const run = (served: ReturnType<typeof serve>[0], memory: ReturnType<typeof serve>[1]) =>
  Effect.runPromiseExit(served.call({ note: "hello" }, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));

describe("also", () => {
  it("makes another thing's creating move in the same commit: both rows and both events, the second's id answered", async () => {
    const [served, memory] = serve((payload, { move, id, also }) =>
      Effect.gen(function* () {
        const note = yield* also(noteMachine.moves.write, { fields: { purse: id as string, text: payload.note } });
        yield* move();
        return { purse: id as never, note: note as never };
      }));
    const exit = await run(served, memory);
    expect(Exit.isSuccess(exit)).toBe(true);
    const answer = (Exit.isSuccess(exit) ? exit.value : {}) as { purse: string; note: string };
    expect(memory.entries.map((e) => [e.event, e.subject])).toEqual([["Opened", answer.purse], ["Noted", answer.note]]);
    expect(memory.rows.map((r) => [r.instance["id"], r.instance["state"]]).sort()).toEqual([[answer.note, "new"], [answer.purse, "active"]].sort());
  });

  it("moves an existing instance of another thing, from a state its move declares", async () => {
    const memory = storeMemory([[Note, { id: "not_1", purse: "pur_1", text: "x", state: "new" }]]);
    const [served] = serve((_p, { move, id, also }) =>
      Effect.gen(function* () {
        yield* also(noteMachine.moves.read, { id: "not_1", fields: {} });
        yield* move();
        return { purse: id as never, note: "not_1" as never };
      }), memory);
    expect(Exit.isSuccess(await run(served, memory))).toBe(true);
    expect(memory.entries.map((e) => e.event)).toEqual(["Opened", "Read"]);
    expect(memory.rows.find((r) => r.instance["id"] === "not_1")?.instance["state"]).toBe("read");
  });

  it("dies on a move from a state it does not declare, and commits nothing", async () => {
    const memory = storeMemory([[Note, { id: "not_1", purse: "pur_1", text: "x", state: "read" }]]);
    const [served] = serve((_p, { move, id, also }) =>
      Effect.gen(function* () {
        yield* also(noteMachine.moves.read, { id: "not_1", fields: {} });
        yield* move();
        return { purse: id as never, note: "not_1" as never };
      }), memory);
    expect(Exit.isFailure(await run(served, memory))).toBe(true);
    expect(memory.entries).toEqual([]);
  });
});
