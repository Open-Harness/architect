import { Effect, Metric, Ref } from "effect";
import { expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { ErrorNames } from "orthograph/server";
import { storeMemory } from "#modules/records/service.js";
import { Store } from "#modules/records/types.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "../service.ts";

it("counts each run and call once, including a retry, a replay, refusals and a defect", () => {
  const Amount = Blueprint.uint(128);
  const Allowance = Blueprint.thing({ description: "An allowance.", fields: { id: Blueprint.id("alw") } });
  class TooMuch extends Blueprint.error({}, { exit: 40 }) {}
  ErrorNames.name(TooMuch, "TooMuch");
  const spend = Blueprint.operation(Allowance, {
    description: "Spend from an allowance.", payload: { amount: Amount }, answer: { remaining: Amount },
    allowed: [Blueprint.signedIn], errors: [TooMuch], idempotent: "request",
  });
  const name = "allowance.spend";
  const { run, call } = Handlers.serve({ name, operation: spend, handler: ({ amount }) => {
    if (amount === 2n) return Effect.fail(new TooMuch({}));
    if (amount === 3n) return Effect.die(new Error("internal diagnostic"));
    if (amount === 4n) return Effect.fail({ _tag: "Undeclared", detail: "internal diagnostic" } as unknown as TooMuch);
    return Effect.succeed({ remaining: 4n });
  } });
  const person = { kind: "person", person: "per_olga", via: "session" } as const;
  return Effect.runPromise(Effect.gen(function* () {
    const store = yield* Store;
    const first = yield* Ref.make(true);
    const attempts = yield* Ref.make(0);
    yield* run({ amount: 1n }, person, "same-request").pipe(Effect.provideService(Store, {
      ...store,
      commit: (commit) => Ref.update(attempts, (n) => n + 1).pipe(Effect.andThen(Ref.getAndSet(first, false)),
        Effect.flatMap((conflict) => conflict ? Effect.succeed("conflict" as const) : store.commit(commit))),
    }));
    expect(yield* Ref.get(attempts)).toBe(2);
    expect(yield* run({ amount: 1n }, person, "same-request")).toEqual({ remaining: 4n }); // the stored answer is replayed (same key, same payload)
    yield* call({ amount: "1" }, person);
    yield* Effect.exit(call({ amount: "invalid" }, person));
    yield* Effect.exit(call({ amount: "1" }, { kind: "anonymous" }));
    yield* Effect.exit(run({ amount: 2n }, person));
    yield* Effect.exit(run({ amount: 3n }, person));
    yield* Effect.exit(run({ amount: 4n }, person));

    const snapshots = yield* Metric.snapshot;
    const counters = snapshots.flatMap((s) => s.type === "Counter" && s.id === "ortho.calls" ? [{ attributes: s.attributes, count: Number(s.state.count) }] : []);
    const counted = (outcome: string, count: number, kind: string, refusal?: string) => ({
      attributes: { operation: name, "principal.kind": kind, outcome, ...(refusal === undefined ? {} : { refusal }) }, count,
    });
    expect(counters).toHaveLength(5);
    expect(counters).toEqual(expect.arrayContaining([
      counted("answered", 3, "person"), counted("refused", 1, "person", "InvalidPayload"),
      counted("refused", 1, "person", "TooMuch"), counted("refused", 1, "anonymous", "NotAllowed"), counted("defect", 2, "person"),
    ]));
    const durations = snapshots.flatMap((s) => s.type === "Histogram" && s.id === "ortho.call.duration" ? [{ attributes: s.attributes, count: s.state.count }] : []);
    expect(durations).toEqual([{ attributes: { operation: name, unit: "ms" }, count: 8 }]);
  }).pipe(Effect.provide([storeMemory().layer, BusyLive]), Effect.provideService(Metric.MetricRegistry, new Map())));
});
