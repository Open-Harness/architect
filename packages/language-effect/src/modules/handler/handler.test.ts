import { Cause, Effect, Exit, Layer, Tracer } from "effect";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Blueprint } from "orthograph";
import { ErrorNames } from "orthograph/server";
import { Busy } from "#modules/work/types.js";
import { BusyLive } from "#modules/work/service.js";
import { storeMemory } from "#modules/records/service.js";
import { Records, Store } from "#modules/records/types.js";
import { EventNames } from "orthograph/server";
import { NotAllowed } from "#modules/access/types.js";
import { Handlers } from "./service.ts";
import { InvalidPayload, NotFrom, type Handler } from "./types.ts";

// A stand-in for acme's allowance, declared here: the runtime never imports a project.
const Amount = Blueprint.value(Blueprint.uint(128));
const Allowance = Blueprint.thing({
  description: "Money a member may spend.",
  fields: { id: Blueprint.id("alw"), member: Blueprint.id("per"), limit: Amount },
});
class AllowanceLimitTooHigh extends Blueprint.error({ cap: Amount }, { exit: 44 }) {}
ErrorNames.name(AllowanceLimitTooHigh, "AllowanceLimitTooHigh"); // what generated code does
const grant = Blueprint.operation(Allowance, {
  description: "Let a member spend, up to a limit.",
  payload: { member: Allowance.fields.member, limit: Allowance.fields.limit },
  answer: { allowance: Allowance.fields.id },
  errors: [AllowanceLimitTooHigh],
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
});

const handler: Handler<typeof grant> = (payload, { steps }) =>
  payload.limit > 1000n
    ? Effect.fail(new AllowanceLimitTooHigh({ cap: 1000n }))
    : steps.insert(Effect.succeed({ allowance: "alw_1" as never }));

/** The in-memory exporter: every span the runtime opens, kept for the test to read. */
const recording = () => {
  const spans: Array<Tracer.NativeSpan> = [];
  const tracer = Tracer.make({ span: (options) => { const s = new Tracer.NativeSpan(options); spans.push(s); return s; } });
  const store = storeMemory();
  return { spans, store, layer: Layer.mergeAll(BusyLive, store.layer, Layer.succeed(Tracer.Tracer, tracer)) };
};
const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const served = Handlers.serve({ name: "allowance.grant", operation: grant, handler });

describe("handler wrapper", () => {
  it("runs the handler in a span named after the operation, with its payload as attributes", async () => {
    const { spans, layer } = recording();
    const answer = await Effect.runPromise(Effect.provide(served.call({ member: "per_olga", limit: "500" }, ada), layer));
    expect(answer).toEqual({ allowance: "alw_1" });
    const span = spans.find((s) => s.name === "allowance.grant");
    expect(span?.status._tag).toBe("Ended");
    expect(Object.fromEntries(span!.attributes)).toMatchObject({
      operation: "allowance.grant", "principal.person": "per_ada", "payload.member": "per_olga", "payload.limit": "500",
    });
    const step = spans.find((s) => s.name === "allowance.grant.insert");
    expect(step?.parent._tag === "Some" && step.parent.value.spanId).toBe(span!.spanId);
  });

  it("runs each declared step in its own span, in order, marked with its kind", async () => {
    const settle = Blueprint.operation(Allowance, {
      description: "Load, wait, then answer.",
      payload: { member: Allowance.fields.member, limit: Allowance.fields.limit },
      answer: { allowance: Allowance.fields.id },
      allowed: [Blueprint.signedIn],
      steps: { load: Blueprint.step.database(), wait: Blueprint.step.wait() },
    });
    const h: Handler<typeof settle> = (_p, { steps }) =>
      Effect.gen(function* () {
        yield* steps.load(Effect.void);
        yield* steps.wait(Effect.void);
        return { allowance: "alw_1" as never };
      });
    const { spans, layer } = recording();
    await Effect.runPromise(Effect.provide(Handlers.serve({ name: "allowance.settle", operation: settle, handler: h }).call({ member: "per_olga", limit: "1" }, ada), layer));
    const stepSpans = spans.filter((x) => x.name.startsWith("allowance.settle.") && x.name !== "allowance.settle.commit");
    expect(stepSpans.map((x) => [x.name, x.attributes.get("step.kind")])).toEqual([
      ["allowance.settle.load", "database"], ["allowance.settle.wait", "wait"],
    ]);
  });

  it("passes a declared error through, typed, and counts the work until it ends", async () => {
    const { layer } = recording();
    const exit = await Effect.runPromise(Effect.provide(
      Effect.gen(function* () {
        const result = yield* Effect.exit(served.call({ member: "per_olga", limit: "5000" }, ada));
        return { result, count: yield* (yield* Busy).count };
      }), layer));
    expect(exit.count).toBe(0);
    const error = Exit.isFailure(exit.result) ? Cause.squash(exit.result.cause) : undefined;
    expect(error).toBeInstanceOf(AllowanceLimitTooHigh);
    expect(error).toMatchObject({ _tag: "AllowanceLimitTooHigh", cap: 1000n });
    expectTypeOf(served.call).returns.toExtend<Effect.Effect<unknown, AllowanceLimitTooHigh | InvalidPayload | NotAllowed | NotFrom, unknown>>();
  });

  it("refuses an anonymous caller with NotAllowed before the handler runs", async () => {
    const { spans, layer } = recording();
    const exit = await Effect.runPromiseExit(Effect.provide(served.call({ member: "per_olga", limit: "500" }, { kind: "anonymous" }), layer));
    expect(Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined).toBeInstanceOf(NotAllowed);
    // The handler never ran, so the operation has no span of its own; the refused call is still traced, in `.refused`.
    expect(spans.map((s) => s.name)).toEqual(["allowance.grant.refused"]);
    expect(spans[0]!.attributes.get("refusal")).toBe("NotAllowed");
    expect(spans[0]!.attributes.get("operation")).toBe("allowance.grant");
  });

  it("a refused NotAllowed call's span carries the refusal, its code and the operation, and the handler never ran", async () => {
    const { spans, layer } = recording();
    let ran = false;
    const s = Handlers.serve({ name: "allowance.grant", operation: grant, handler: () => { ran = true; return Effect.succeed({ allowance: "alw_1" as never }); }, codes: { NotAllowed: "AL-001" } });
    await Effect.runPromiseExit(Effect.provide(s.call({ member: "per_olga", limit: "500" }, { kind: "anonymous" }), layer));
    expect(ran).toBe(false);
    expect(spans[0]!.attributes.get("refusal.code")).toBe("AL-001");
    expect(spans[0]!.attributes.get("operation")).toBe("allowance.grant");
  });

  it("refuses a payload outside its declaration before the handler runs", async () => {
    const { spans, layer } = recording();
    const exit = await Effect.runPromiseExit(Effect.provide(served.call({ member: "olga", limit: "500" }, ada), layer));
    expect(Exit.isFailure(exit) && Cause.pretty(exit.cause)).toContain("InvalidPayload");
    expect(spans.some((s) => s.name === "allowance.grant.insert")).toBe(false);
  });

  it("an answer outside its declaration dies as the handler's bug", async () => {
    const bad = Handlers.serve({ name: "allowance.grant", operation: grant, handler: () => Effect.succeed({ allowance: "nope" as never }) });
    const exit = await Effect.runPromiseExit(Effect.provide(bad.call({ member: "per_olga", limit: "1" }, ada), recording().layer));
    expect(Exit.isFailure(exit) && Cause.pretty(exit.cause)).toContain("answered outside its declaration");
  });

  describe("moves", () => {
    const Granted = Blueprint.event({ allowance: Allowance.fields.id, limit: Amount });
    EventNames.name(Granted, "Granted");
    const machine = Blueprint.machine(Allowance, { states: ["active"], moves: { grant: { from: [], to: "active", emits: Granted } }, notFrom: { exit: 40 } });
    const moving = Blueprint.operation(Allowance, {
      description: "Grant, with its move.",
      payload: { member: Allowance.fields.member, limit: Allowance.fields.limit },
      answer: { allowance: Allowance.fields.id },
      move: machine.moves.grant,
      allowed: [Blueprint.signedIn],
    });
    const insertAndMove = (to?: string): Handler<typeof moving, Records> => (payload, { move }) =>
      Effect.gen(function* () {
        const records = yield* Records;
        yield* records.insert(Allowance, { id: "alw_7" as never, member: payload.member, limit: payload.limit });
        yield* move(to as never);
        return { allowance: "alw_7" as never };
      });

    it("sets the state and journals the event once the handler answers", async () => {
      const r = recording();
      const s = Handlers.serve({ name: "allowance.grant", operation: moving, handler: insertAndMove() });
      const state = await Effect.runPromise(Effect.gen(function* () {
        yield* s.call({ member: "per_olga", limit: "500" }, ada);
        return (yield* (yield* Store).find(Allowance, "alw_7"))?.instance.state;
      }).pipe(Effect.provide(r.layer)));
      expect(state).toBe("active");
      expect(r.store.entries).toEqual([
        expect.objectContaining({ operation: "allowance.grant", move: "grant", subject: "alw_7", event: "Granted", fields: { allowance: "alw_7", limit: "500" } }),
      ]);
      expect(r.spans[0]!.attributes.get("move.to")).toBe("active");
      expect(r.spans[0]!.attributes.get("answer.allowance")).toBe("alw_7");
    });

    it("a move made inside a step is written on the operation's span, not the step's", async () => {
      const r = recording();
      const stepped = Blueprint.operation(Allowance, {
        description: "Grant, with its move, in a step.",
        payload: { member: Allowance.fields.member, limit: Allowance.fields.limit },
        answer: { allowance: Allowance.fields.id },
        move: machine.moves.grant,
        allowed: [Blueprint.signedIn],
        steps: { insert: Blueprint.step.database() },
      });
      const inStep: Handler<typeof stepped, Records> = (payload, { move, steps }) => steps.insert(
        Effect.gen(function* () {
          const records = yield* Records;
          yield* records.insert(Allowance, { id: "alw_7" as never, member: payload.member, limit: payload.limit });
          yield* move();
          return { allowance: "alw_7" as never };
        }),
      );
      const s = Handlers.serve({ name: "allowance.grant", operation: stepped, handler: inStep });
      await Effect.runPromise(Effect.provide(s.call({ member: "per_olga", limit: "5" }, ada), r.layer));
      const op = r.spans.find((x) => x.name === "allowance.grant");
      const step = r.spans.find((x) => x.name === "allowance.grant.insert");
      expect(op!.attributes.get("move.name")).toBe("grant");
      expect(op!.attributes.get("move.to")).toBe("active");
      expect(step!.attributes.has("move.name")).toBe(false);
    });

    it("an outcome the move doesn't declare dies, and the span says what was asked", async () => {
      const r = recording();
      const s = Handlers.serve({ name: "allowance.grant", operation: moving, handler: insertAndMove("paused") });
      const exit = await Effect.runPromiseExit(Effect.provide(s.call({ member: "per_olga", limit: "5" }, ada), r.layer));
      expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
      expect(r.spans[0]!.attributes.get("move.to")).toBe("paused");
      expect(String(r.spans[0]!.attributes.get("defect"))).toContain("moved to paused");
      expect(r.store.entries).toEqual([]);
    });

    it("a refusal is written on the span", async () => {
      const r = recording();
      await Effect.runPromiseExit(Effect.provide(served.call({ member: "per_olga", limit: "5000" }, ada), r.layer));
      expect(r.spans[0]!.attributes.get("refusal")).toBe("AllowanceLimitTooHigh");
    });

    // O1's conventions: a refusal is an outcome, so its span ends ok; a defect is the only error.
    const endedAs = (span: Tracer.NativeSpan | undefined) => (span?.status._tag === "Ended" ? span.status.exit._tag : "not ended");

    it("a refusal ends its span ok, still tagged, and still fails the call", async () => {
      const r = recording();
      const exit = await Effect.runPromiseExit(Effect.provide(served.call({ member: "per_olga", limit: "5000" }, ada), r.layer));
      expect(Exit.isFailure(exit) && Cause.hasFails(exit.cause) && !Cause.hasDies(exit.cause)).toBe(true);
      expect(endedAs(r.spans[0])).toBe("Success");
      expect(r.spans[0]!.attributes.get("refusal")).toBe("AllowanceLimitTooHigh");
      expect(r.spans[0]!.attributes.has("defect")).toBe(false);
    });

    it("a refusal raised inside a step ends the step's span ok too", async () => {
      const inStep: Handler<typeof grant> = (_, { steps }) => steps.insert(Effect.fail(new AllowanceLimitTooHigh({ cap: 1000n })));
      const r = recording();
      const s = Handlers.serve({ name: "allowance.grant", operation: grant, handler: inStep });
      await Effect.runPromiseExit(Effect.provide(s.call({ member: "per_olga", limit: "5" }, ada), r.layer));
      const step = r.spans.find((x) => x.name === "allowance.grant.insert");
      expect(endedAs(step)).toBe("Success");
      expect(endedAs(r.spans.find((x) => x.name === "allowance.grant"))).toBe("Success");
    });

    it("a defect ends its span as an error, tagged defect, and carries no refusal", async () => {
      const dies: Handler<typeof grant> = () => Effect.die(new Error("the ledger is on fire"));
      const r = recording();
      const s = Handlers.serve({ name: "allowance.grant", operation: grant, handler: dies });
      const exit = await Effect.runPromiseExit(Effect.provide(s.call({ member: "per_olga", limit: "5" }, ada), r.layer));
      expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
      expect(endedAs(r.spans[0])).toBe("Failure");
      expect(String(r.spans[0]!.attributes.get("defect"))).toContain("the ledger is on fire");
      expect(r.spans[0]!.attributes.has("refusal")).toBe(false);
    });

    it("a refusal carries the log that decided it, and only this attempt's", async () => {
      const decides: Handler<typeof grant> = (payload) =>
        Effect.gen(function* () {
          yield* Effect.logInfo("looked it up");
          yield* Effect.logInfo("the limit is over the cap", { limit: String(payload.limit) });
          return yield* new AllowanceLimitTooHigh({ cap: 1000n });
        });
      const r = recording();
      const s = Handlers.serve({ name: "allowance.grant", operation: grant, handler: decides });
      await Effect.runPromiseExit(Effect.provide(s.call({ member: "per_olga", limit: "5000" }, ada), r.layer));
      expect(String(r.spans[0]!.attributes.get("refusal.log"))).toMatch(/^the limit is over the cap/);
      // A refusal with no log before it carries none: explainability then names it.
      const r2 = recording();
      await Effect.runPromiseExit(Effect.provide(served.call({ member: "per_olga", limit: "5000" }, ada), r2.layer));
      expect(r2.spans[0]!.attributes.has("refusal.log")).toBe(false);
    });
  });
});

describe("a move with a machine: the race, the machine's refusal, all or nothing", () => {
  const Spent = Blueprint.event({ allowance: Allowance.fields.id, amount: Amount });
  EventNames.name(Spent, "Spent");
  const Granted = Blueprint.event({ allowance: Allowance.fields.id });
  const Purse = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("alw"), limit: Amount, spent: Amount } });
  const machine = Blueprint.machine(Purse, {
    states: ["active", "exhausted", "revoked"],
    moves: { grant: { from: [], to: "active", emits: Granted }, spend: { from: ["active"], to: ["active", "exhausted"], emits: Spent } },
    notFrom: { exit: 40 },
  });
  const spend = Blueprint.operation(Purse, {
    description: "Spend some.",
    payload: { allowance: Purse.fields.id, amount: Amount },
    answer: { remaining: Amount },
    move: machine.moves.spend,
    allowed: [Blueprint.signedIn],
  });
  // Reads, yields to every other fiber (as a real store's await would), then writes: a lost update, unless guarded.
  const spender: Handler<typeof spend, Records> = ({ allowance, amount }, { move }) =>
    Effect.gen(function* () {
      const records = yield* Records;
      const found = (yield* records.find(Purse, allowance))!;
      yield* Effect.yieldNow;
      const spent = (found["spent"] as bigint) + amount;
      yield* records.update(Purse, allowance, { spent });
      const remaining = (found["limit"] as bigint) - spent;
      yield* move(remaining === 0n ? "exhausted" : "active");
      return { remaining };
    });
  const served = Handlers.serve({ name: "purse.spend", operation: spend, handler: spender, notFrom: "PurseNotActive" });
  const start = (state: string) => storeMemory([[Purse, { id: "alw_1", limit: 500n, spent: 0n, state }]]);

  it("50 concurrent spends of 10 against 500: every one lands, none is lost, and it ends exhausted", async () => {
    const memory = start("active");
    const layer = Layer.mergeAll(BusyLive, memory.layer);
    const calls = Array.from({ length: 50 }, () => served.call({ allowance: "alw_1", amount: "10" }, ada));
    const exits = await Effect.runPromise(Effect.all(calls.map((c) => Effect.exit(c)), { concurrency: "unbounded" }).pipe(Effect.provide(layer)));
    expect(exits.filter(Exit.isSuccess)).toHaveLength(50);
    expect(memory.rows[0]!.instance).toMatchObject({ spent: 500n, state: "exhausted" });
    expect(memory.entries).toHaveLength(50);
  });

  it("every attempt span of a call carries its call's name (O3): 50 concurrent calls are 50 names, and each name's attempts are 1..n", async () => {
    const memory = start("active");
    const spans: Array<Tracer.NativeSpan> = [];
    const tracer = Tracer.make({ span: (options) => { const s = new Tracer.NativeSpan(options); spans.push(s); return s; } });
    const layer = Layer.mergeAll(BusyLive, memory.layer, Layer.succeed(Tracer.Tracer, tracer));
    const calls = Array.from({ length: 50 }, () => served.call({ allowance: "alw_1", amount: "10" }, ada));
    await Effect.runPromise(Effect.all(calls, { concurrency: "unbounded" }).pipe(Effect.provide(layer)));
    const attempts = spans.filter((s) => s.name === "purse.spend");
    const byCall = new Map<string, Array<number>>();
    for (const s of attempts) {
      const id = s.attributes.get("call.id");
      expect(id, "every attempt span names its call").toMatch(/^call_[0-9a-z]{16}$/);
      byCall.set(String(id), [...(byCall.get(String(id)) ?? []), Number(s.attributes.get("attempt"))]);
    }
    expect(byCall.size).toBe(50);
    for (const numbers of byCall.values()) expect(numbers.sort((a, b) => a - b)).toEqual(numbers.map((_, i) => i + 1));
  });

  it("refuses with the machine's refusal, carrying the state it was in, before the handler runs", async () => {
    const memory = start("revoked");
    const exit = await Effect.runPromiseExit(served.call({ allowance: "alw_1", amount: "10" }, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));
    expect(Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined).toMatchObject({ _tag: "PurseNotActive", state: "revoked" });
    expect(memory.rows[0]!.instance["spent"]).toBe(0n);
  });

  it("a handler that dies after writing leaves nothing behind", async () => {
    const memory = start("active");
    const dying = Handlers.serve({ name: "purse.spend", operation: spend, notFrom: "PurseNotActive", handler: ({ allowance }) =>
      Effect.gen(function* () {
        yield* (yield* Records).update(Purse, allowance, { spent: 400n });
        return yield* Effect.die(new Error("halfway"));
      }) });
    await Effect.runPromiseExit(dying.call({ allowance: "alw_1", amount: "10" }, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));
    expect(memory.rows[0]!.instance["spent"]).toBe(0n);
    expect(memory.entries).toEqual([]);
  });
});
