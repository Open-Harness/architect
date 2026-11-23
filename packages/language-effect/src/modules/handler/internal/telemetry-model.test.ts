import { Duration, Effect, Metric, Tracer } from "effect";
import { expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { ErrorNames, EventNames } from "orthograph/server";
import { storeMemory } from "#modules/records/service.js";
import { Records } from "#modules/records/types.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "../service.ts";
import { Environment } from "./environment.ts";

// M1.36: the move, the event, the refusal's code, the environment and the store, and the budget's breaches.
const Allowance = Blueprint.thing({ description: "An allowance.", fields: { id: Blueprint.id("alw") } });
const Granted = Blueprint.event({ allowance: Allowance.fields.id });
const Closed = Blueprint.event({ allowance: Allowance.fields.id });
EventNames.name(Granted, "Granted");
EventNames.name(Closed, "Closed");
class TooMuch extends Blueprint.error({}, { exit: 40 }) {}
ErrorNames.name(TooMuch, "TooMuch");
const machine = Blueprint.machine(Allowance, {
  states: ["active", "closed"], notFrom: { exit: 41 },
  moves: { grant: { from: [], to: "active", emits: Granted }, close: { from: ["active"], to: "closed", emits: Closed } },
});
const grant = Blueprint.operation(Allowance, {
  description: "Grant.", payload: { allowance: Allowance.fields.id }, answer: { allowance: Allowance.fields.id },
  move: machine.moves.grant, allowed: [Blueprint.signedIn],
});
const close = Blueprint.operation(Allowance, {
  description: "Close.", payload: { allowance: Allowance.fields.id }, answer: { allowance: Allowance.fields.id },
  move: machine.moves.close, errors: [TooMuch], allowed: [Blueprint.signedIn], budget: { p95: Duration.zero },
});
const codes = { TooMuch: "AL-001", AllowanceNotActive: "AL-900" };
const person = { kind: "person", person: "per_ada", via: "session" } as const;

it("writes move.from, event.name on the commit, refusal.code, environment and store, and counts a call past its budget", () => {
  const spans: Array<Tracer.NativeSpan> = [];
  const tracer = Tracer.make({ span: (options) => { const span = new Tracer.NativeSpan(options); spans.push(span); return span; } });
  const granted = Handlers.serve({ name: "allowance.grant", operation: grant, handler: ({ allowance }, { move }) =>
    Effect.gen(function* () { yield* (yield* Records).insert(Allowance, { id: allowance }); yield* move(); return { allowance }; }) });
  const closed = (refuse: boolean) => Handlers.serve({ name: "allowance.close", operation: close, notFrom: "AllowanceNotActive", codes, handler: ({ allowance }, { move }) =>
    refuse ? Effect.fail(new TooMuch({})) : move().pipe(Effect.as({ allowance })) });
  const attrs = (name: string) => spans.filter((s) => s.name === name).map((s) => Object.fromEntries(s.attributes));
  return Effect.runPromise(Effect.gen(function* () {
    yield* granted.call({ allowance: "alw_1" }, person);
    yield* Effect.exit(closed(true).call({ allowance: "alw_1" }, person));
    yield* closed(false).call({ allowance: "alw_1" }, person);
    yield* Effect.exit(closed(false).call({ allowance: "alw_1" }, person));

    expect(attrs("allowance.grant")[0]).toMatchObject({ environment: "staging", store: "database" });
    expect(attrs("allowance.grant")[0]).not.toHaveProperty("move.from");
    const [refused, moved, notFrom] = attrs("allowance.close");
    expect(refused).toMatchObject({ refusal: "TooMuch", "refusal.code": "AL-001", environment: "staging", store: "database" });
    expect(refused).not.toHaveProperty("move.from");
    expect(moved).toMatchObject({ "move.from": "active", "move.to": "closed" });
    expect(moved).not.toHaveProperty("refusal.code");
    expect(moved).not.toHaveProperty("event.name");
    expect(notFrom).toMatchObject({ refusal: "AllowanceNotActive", "refusal.code": "AL-900" });
    expect(attrs("allowance.close.commit").map((a) => a["event.name"])).toEqual(["Closed"]);
    expect(attrs("allowance.grant.commit").map((a) => a["event.name"])).toEqual(["Granted"]);

    const snapshots = yield* Metric.snapshot;
    const breaches = snapshots.flatMap((s) => s.type === "Counter" && s.id === "ortho.budget.breaches" ? [{ attributes: s.attributes, count: Number(s.state.count) }] : []);
    // Three calls of `close`, each past a budget of nothing; `grant` declares none.
    expect(breaches).toEqual([{ attributes: { operation: "allowance.close" }, count: 3 }]);
  }).pipe(Effect.provide([storeMemory().layer, BusyLive]), Effect.provideService(Environment, "staging"), Effect.provideService(Tracer.Tracer, tracer)));
});
