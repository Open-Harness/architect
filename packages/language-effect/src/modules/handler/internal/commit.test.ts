import { Effect, Ref, Tracer } from "effect";
import { expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { EventNames } from "orthograph/server";
import { storeMemory } from "#modules/records/service.js";
import { Records, Store } from "#modules/records/types.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "../service.ts";

it("records the commit and its counts under each operation attempt after a conflict", () => {
  const Allowance = Blueprint.thing({ description: "An allowance.", fields: { id: Blueprint.id("alw") } });
  const Granted = Blueprint.event({ allowance: Allowance.fields.id });
  EventNames.name(Granted, "Granted");
  const machine = Blueprint.machine(Allowance, {
    states: ["active"], moves: { grant: { from: [], to: "active", emits: Granted } }, notFrom: { exit: 40 },
  });
  const operation = Blueprint.operation(Allowance, {
    description: "Grant an allowance.", payload: { allowance: Allowance.fields.id },
    answer: { allowance: Allowance.fields.id }, move: machine.moves.grant, allowed: [Blueprint.signedIn],
  });
  const { call } = Handlers.serve({ name: "allowance.grant", operation, handler: ({ allowance }, { move }) =>
    Effect.gen(function* () {
      yield* (yield* Records).insert(Allowance, { id: allowance });
      yield* move();
      return { allowance };
    }),
  });
  const spans: Array<Tracer.NativeSpan> = [];
  const tracer = Tracer.make({ span: (options) => { const span = new Tracer.NativeSpan(options); spans.push(span); return span; } });
  const memory = storeMemory();
  return Effect.runPromise(Effect.gen(function* () {
    const store = yield* Store;
    const first = yield* Ref.make(true);
    const answer = yield* call({ allowance: "alw_1" }, { kind: "person", person: "per_ada", via: "session" }).pipe(
      Effect.provideService(Store, { ...store,
        commit: (commit) => Ref.getAndSet(first, false).pipe(
          Effect.flatMap((conflict) => conflict ? Effect.succeed("conflict" as const) : store.commit(commit)),
        ),
      }),
    );
    expect(answer).toEqual({ allowance: "alw_1" });
    expect(memory.entries).toHaveLength(1);

    const attempts = spans.filter((span) => span.name === "allowance.grant");
    expect(attempts.map((span) => span.attributes.get("attempt"))).toEqual([1, 2]);
    const commits = spans.filter((span) => span.name === "allowance.grant.commit");
    expect(commits.map((span) => span.parent._tag === "Some" && span.parent.value.spanId)).toEqual(attempts.map((span) => span.spanId));
    expect(commits.map((span) => Object.fromEntries(span.attributes))).toEqual([
      { "step.kind": "commit", "commit.writes": 1, "commit.entries": 1, "commit.outcome": "conflict" },
      { "step.kind": "commit", "commit.writes": 1, "commit.entries": 1, "commit.outcome": "committed", "event.name": "Granted" },
    ]);
  }).pipe(Effect.provide([memory.layer, BusyLive]), Effect.provideService(Tracer.Tracer, tracer)));
});
