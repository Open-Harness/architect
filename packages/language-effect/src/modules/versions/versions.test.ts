import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Handlers } from "#modules/handler/service.js";
import { storeMemory } from "#modules/records/service.js";
import { BusyLive } from "#modules/work/service.js";
import { Versions } from "./service.ts";

class Stale extends Blueprint.error({ current: Blueprint.uint(32) }, { exit: 62 }) {}
const Rule = Blueprint.thing({
  description: "A rule set.",
  fields: { id: Blueprint.id("rul"), owner: Blueprint.id("own"), revision: Blueprint.uint(32), mode: Blueprint.oneOf(["a", "b"]) },
  code: "RU",
  versions: { key: "owner" },
});
const Saved = Blueprint.event({ owner: Rule.fields.owner, revision: Rule.fields.revision });
const machine = Blueprint.machine(Rule, { states: ["current"], moves: { save: { from: [], to: "current", emits: Saved } }, notFrom: { exit: 63 } });
const save = Blueprint.operation(Rule, {
  description: "Save.", payload: { owner: Rule.fields.owner, base: Blueprint.uint(32), mode: Rule.fields.mode }, answer: { revision: Rule.fields.revision },
  move: machine.moves.save, errors: [Stale], allowed: [Blueprint.signedIn],
});
const get = Blueprint.operation(Rule, { description: "Get.", payload: { owner: Rule.fields.owner, revision: Blueprint.optional(Blueprint.uint(32)) }, answer: { revision: Rule.fields.revision, mode: Rule.fields.mode }, allowed: [Blueprint.signedIn] });
const who = { kind: "person", person: "per_ada", via: "session" } as const;
const stocked = () => storeMemory([]);

const call = (store: ReturnType<typeof stocked>, op: typeof save | typeof get, verb: "save" | "get", payload: Record<string, unknown>) =>
  Effect.runPromiseExit((Handlers.serve({ name: `rule.${verb}`, operation: op, handler: Versions.handler(verb, Rule, Stale) as never }).run(payload as never, who) as Effect.Effect<unknown, unknown, never>).pipe(Effect.provide(Layer.mergeAll(BusyLive, store.layer))));
const value = (exit: Exit.Exit<unknown, unknown>) => (Exit.isSuccess(exit) ? exit.value : Cause.squash(exit.cause));

describe("versions", () => {
  it("serves exactly the four verbs, on a thing with versions whose key the payload names", () => {
    expect(Versions.serves(Rule, "save", ["owner", "base"])).toBe(true);
    expect(Versions.serves(Rule, "update", ["owner"])).toBe(false);
    expect(Versions.serves(Rule, "save", ["base"])).toBe(false);
  });

  it("keeps every save, reads each by its number, and refuses a save made from an older version", async () => {
    const store = stocked();
    expect(value(await call(store, save, "save", { owner: "own_1", base: 0n, mode: "a" }))).toEqual({ revision: 1n });
    expect(value(await call(store, save, "save", { owner: "own_1", base: 1n, mode: "b" }))).toEqual({ revision: 2n });
    const refused = value(await call(store, save, "save", { owner: "own_1", base: 1n, mode: "a" }));
    expect(refused).toBeInstanceOf(Stale);
    expect(refused).toMatchObject({ current: 2n });
    expect(value(await call(store, get, "get", { owner: "own_1" }))).toMatchObject({ revision: 2n, mode: "b" });
    expect(value(await call(store, get, "get", { owner: "own_1", revision: 1n }))).toMatchObject({ revision: 1n, mode: "a" });
    expect(value(await call(store, save, "save", { owner: "own_2", base: 0n, mode: "a" }))).toEqual({ revision: 1n });
  });

  it("refuses a read of a version that was never saved, as a read of nothing is", async () => {
    expect(value(await call(stocked(), get, "get", { owner: "own_9" }))).toMatchObject({ _tag: "NotAllowed" });
  });
});

