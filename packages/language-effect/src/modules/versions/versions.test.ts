import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Handlers } from "#modules/handler/service.js";
import { storeMemory } from "#modules/records/service.js";
import { Store } from "#modules/records/types.js";
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
const machine = Blueprint.machine(Rule, {
  states: ["current"],
  moves: { save: { from: [], to: "current", emits: Saved }, restore: { from: [], to: "current", emits: Saved } },
  notFrom: { exit: 63 },
});
const save = Blueprint.operation(Rule, {
  description: "Save.", payload: { owner: Rule.fields.owner, base: Blueprint.uint(32), mode: Rule.fields.mode }, answer: { revision: Rule.fields.revision },
  move: machine.moves.save, errors: [Stale], allowed: [Blueprint.signedIn],
});
const restore = Blueprint.operation(Rule, {
  description: "Restore.", payload: { owner: Rule.fields.owner, revision: Rule.fields.revision, base: Blueprint.uint(32) }, answer: { revision: Rule.fields.revision },
  move: machine.moves.restore, errors: [Stale], allowed: [Blueprint.signedIn],
});
const get = Blueprint.operation(Rule, { description: "Get.", payload: { owner: Rule.fields.owner, revision: Blueprint.optional(Blueprint.uint(32)) }, answer: { revision: Rule.fields.revision, mode: Rule.fields.mode }, allowed: [Blueprint.signedIn] });
const who = { kind: "person", person: "per_ada", via: "session" } as const;
/** A store that holds the rule every thing with versions holds: one row per revision of a key. */
const stocked = () => storeMemory([], Versions.rulesOf("rule", Rule));
const ops = { save, restore, get } as const;

const run = (store: ReturnType<typeof stocked>, verb: keyof typeof ops, payload: Record<string, unknown>) =>
  (Handlers.serve({ name: `rule.${verb}`, operation: ops[verb], handler: Versions.handler(verb, Rule, Stale) as never }).run(payload as never, who) as Effect.Effect<unknown, unknown, never>)
    .pipe(Effect.provide(Layer.mergeAll(BusyLive, store.layer)));
const call = (store: ReturnType<typeof stocked>, verb: keyof typeof ops, payload: Record<string, unknown>) => Effect.runPromiseExit(run(store, verb, payload));
const value = (exit: Exit.Exit<unknown, unknown>) => (Exit.isSuccess(exit) ? exit.value : Cause.squash(exit.cause));

describe("versions", () => {
  it("serves exactly the four verbs, on a thing with versions whose key the payload names", () => {
    expect(Versions.serves(Rule, "save", ["owner", "base"])).toBe(true);
    expect(Versions.serves(Rule, "update", ["owner"])).toBe(false);
    expect(Versions.serves(Rule, "save", ["base"])).toBe(false);
  });

  it("keeps every save, reads each by its number, and refuses a save made from an older version", async () => {
    const store = stocked();
    expect(value(await call(store, "save", { owner: "own_1", base: 0n, mode: "a" }))).toEqual({ revision: 1n });
    expect(value(await call(store, "save", { owner: "own_1", base: 1n, mode: "b" }))).toEqual({ revision: 2n });
    const refused = value(await call(store, "save", { owner: "own_1", base: 1n, mode: "a" }));
    expect(refused).toBeInstanceOf(Stale);
    expect(refused).toMatchObject({ current: 2n });
    expect(value(await call(store, "get", { owner: "own_1" }))).toMatchObject({ revision: 2n, mode: "b" });
    expect(value(await call(store, "get", { owner: "own_1", revision: 1n }))).toMatchObject({ revision: 1n, mode: "a" });
    expect(value(await call(store, "save", { owner: "own_2", base: 0n, mode: "a" }))).toEqual({ revision: 1n });
  });

  it("refuses a read of a version that was never saved, as a read of nothing is", async () => {
    expect(value(await call(stocked(), "get", { owner: "own_9" }))).toMatchObject({ _tag: "NotAllowed" });
  });

  it("two first saves made at once: one is revision 1 and the other is refused as stale, never a second revision 1", async () => {
    const store = stocked();
    const both = await Effect.runPromise(
      Effect.all([Effect.exit(run(store, "save", { owner: "own_1", base: 0n, mode: "a" })), Effect.exit(run(store, "save", { owner: "own_1", base: 0n, mode: "b" }))], { concurrency: 2 }),
    );
    const results = both.map(value);
    expect(results.filter((r) => (r as { revision?: bigint }).revision === 1n)).toHaveLength(1);
    const lost = results.filter((r) => r instanceof Stale);
    expect(lost).toHaveLength(1);
    expect(lost[0]).toMatchObject({ current: 1n });
    expect(value(await call(store, "get", { owner: "own_1", revision: 1n }))).toMatchObject({ revision: 1n });
  });

  it("the rule is what refuses a second revision 1 when both saves read no version: the store answers a conflict", async () => {
    const store = stocked();
    const row = (id: string) => ({ kind: "insert" as const, thing: Rule, fields: { id, owner: "own_1", revision: 1n, mode: "a" }, state: "current" });
    const commit = (id: string) => Effect.runPromise(Effect.flatMap(Store, (s) => s.commit({ writes: [row(id)], entries: [] })).pipe(Effect.provide(store.layer)));
    expect(await commit("rul_1")).toBe("committed");
    expect(await commit("rul_2")).toBe("conflict");
  });

  it("restores an old revision as a new version made from its content, and keeps the ones between", async () => {
    const store = stocked();
    await call(store, "save", { owner: "own_1", base: 0n, mode: "a" });
    await call(store, "save", { owner: "own_1", base: 1n, mode: "b" });
    expect(value(await call(store, "restore", { owner: "own_1", revision: 1n, base: 2n }))).toEqual({ revision: 3n });
    expect(value(await call(store, "get", { owner: "own_1" }))).toMatchObject({ revision: 3n, mode: "a" });
    expect(value(await call(store, "get", { owner: "own_1", revision: 2n }))).toMatchObject({ revision: 2n, mode: "b" });
    expect(value(await call(store, "get", { owner: "own_1", revision: 1n }))).toMatchObject({ revision: 1n, mode: "a" });
  });

  it("refuses a restore of a revision never saved, and one made from an older version, and makes nothing", async () => {
    const store = stocked();
    await call(store, "save", { owner: "own_1", base: 0n, mode: "a" });
    expect(value(await call(store, "restore", { owner: "own_1", revision: 7n, base: 1n }))).toMatchObject({ _tag: "NotAllowed" });
    await call(store, "save", { owner: "own_1", base: 1n, mode: "b" });
    const stale = value(await call(store, "restore", { owner: "own_1", revision: 1n, base: 1n }));
    expect(stale).toBeInstanceOf(Stale);
    expect(stale).toMatchObject({ current: 2n });
    expect(value(await call(store, "get", { owner: "own_1" }))).toMatchObject({ revision: 2n });
  });
});
