// A creating move the handler didn't store (M1.46): the runtime stores the instance, and its event is built from that
// instance too, so an event field only the thing holds (its `id`) is filled.
import { Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { EventNames } from "orthograph/server";
import { storeMemory } from "#modules/records/service.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "./service.ts";
import type { Handler } from "./types.ts";

const Amount = Blueprint.value(Blueprint.uint(128));
const Purse = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("pur"), limit: Amount } });
const Opened = Blueprint.event({ id: Purse.fields.id, limit: Amount });
EventNames.name(Opened, "Opened");
const machine = Blueprint.machine(Purse, { states: ["active"], moves: { open: { from: [], to: "active", emits: Opened } }, notFrom: { exit: 40 } });
const open = Blueprint.operation(Purse, {
  description: "Open a purse.", payload: { limit: Amount }, answer: { purse: Purse.fields.id },
  move: machine.moves.open, allowed: [Blueprint.signedIn],
});

describe("a creating move the runtime stores", () => {
  it("builds the event from the instance it stored: the event's id is the minted one", async () => {
    const handler: Handler<typeof open> = (_payload, { move, id }) => Effect.as(move(), { purse: id as never });
    const memory = storeMemory([]);
    const served = Handlers.serve({ name: "purse.open", operation: open, handler });
    const exit = await Effect.runPromiseExit(served.call({ limit: "10" }, { kind: "person", person: "per_ada", via: "session" }).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));
    expect(Exit.isSuccess(exit)).toBe(true);
    const purse = Exit.isSuccess(exit) ? (exit.value as { purse: string }).purse : "";
    expect(memory.entries.map((e) => [e.event, e.subject])).toEqual([["Opened", purse]]);
    expect(memory.rows.map((r) => r.instance["id"])).toEqual([purse]);
  });
});
