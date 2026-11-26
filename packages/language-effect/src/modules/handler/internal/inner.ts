// An inner operation (#1079, CX-inner-operations): another operation of the app, run by an outer handler as `steps.<key>(payload)`. Its whole
// pipeline runs for the same caller, inside the outer's attempt: its access rule (judged for the caller, never as system), what its payload names,
// its from-check, its handler, its answer's declaration, its move and event, and its G5 rules. It never commits: its writes are held in the outer's
// unit and its entries join the outer's journal, so the one commit carries both, a refusal anywhere writes nothing, and a lost race runs it again.
import { Cause, Effect, Ref, Schema } from "effect";
import type { Operation, Principal } from "orthograph";
import { Access } from "#modules/access/service.js";
import { Records } from "#modules/records/types.js";
import { answerAttributes, payloadAttributes, principalAttributes } from "./attributes.ts";
import { Conflict, type Attempt } from "./attempt.ts";
import { recordingLogs } from "./decided.ts";
import { defectAttributes } from "./defect.ts";
import { settleViolation } from "./invariants.ts";
import { applyMove, checkFrom, chooseOutcome } from "./move.ts";
import { prehandle, type Prehandled } from "./prehandle.ts";
import { spanned } from "./span.ts";

type AnyCodec = Schema.Codec<object, unknown>;
export type AnyHandler = (payload: object, context: { principal: Principal; steps: object; move: (to?: string) => Effect.Effect<void> } & Prehandled) => Effect.Effect<object, unknown, unknown>;

export const tagOf = (e: unknown): string =>
  typeof e === "object" && e !== null && typeof (e as { _tag?: unknown })._tag === "string" ? (e as { _tag: string })._tag : String(e);

/**
 * How an operation's span ends, an outer's or an inner's: a defect writes the defect, a refusal its tag, its code and the log that decided it. A lost
 * race writes nothing: the call runs again.
 */
export const ending = (codes: Readonly<Record<string, string>> | undefined, last: Effect.Effect<string | undefined>) => (cause: Cause.Cause<unknown>) => {
  if (Cause.hasDies(cause)) return Effect.annotateCurrentSpan(defectAttributes(cause));
  const refusal = Cause.squash(cause);
  if (refusal instanceof Conflict) return Effect.void;
  const tag = tagOf(refusal);
  const code = codes?.[tag];
  return last.pipe(Effect.flatMap((log) =>
    Effect.annotateCurrentSpan({ refusal: tag, ...(code === undefined ? {} : { "refusal.code": code }), ...(log === undefined ? {} : { "refusal.log": log }) })));
};

export interface Pipeline {
  readonly name: string;
  readonly op: Operation;
  readonly handler: AnyHandler;
  readonly notFrom: string | undefined;
  readonly notFound: Readonly<Record<string, string>>;
  readonly invariants: Readonly<Record<string, string>>;
  readonly codes: Readonly<Record<string, string>> | undefined;
  readonly mounts: ReadonlyMap<unknown, string> | undefined;
  /** Its own steps' runners, bound to the attempt it runs in: an inner operation's inner operations run in the same one. */
  readonly steps: { readonly bind: (attempt: Attempt) => object };
}

/** Run `pipeline` as an inner operation, inside `attempt`: the answer as code has it (never its wire form), or its refusal. */
export const innerRun = (pipeline: Pipeline) => {
  const { name, op, handler, notFrom, notFound, invariants, codes, mounts } = pipeline;
  const encodePayload = Schema.encodeEffect(op.payloadSchema as unknown as AnyCodec);
  const check = Schema.encodeEffect(op.answerSchema as unknown as AnyCodec);
  // The rules its own rows can break, refused here with its own refusal; a rule only the outer's rows break is the outer's to settle at its commit.
  const own = new Set(Object.values(invariants));
  return (payload: object, attempt: Attempt) =>
    Effect.gen(function* () {
      const { unit, principal } = attempt;
      // The outer handler hands the payload as code has it: one outside the declaration is the outer handler's bug.
      yield* encodePayload(payload).pipe(Effect.mapError((e) => new Error(`${name} was run with a payload outside its declaration: ${e.message}`)), Effect.orDie);
      // Its access rule, for the caller, reading through the outer's writes. A refused caller leaves no span of the inner operation, only `<op>.refused`.
      yield* Access.check({ allowed: op.allowed, payloadFields: op.payload, payload, principal, thing: op.thing, ...(mounts === undefined ? {} : { mounts }) }).pipe(
        Effect.provideService(Records, unit.records), Effect.withTracerEnabled(false),
        Effect.tapError((e) => Effect.annotateCurrentSpan({ refusal: tagOf(e) }).pipe(spanned(`${name}.refused`, { operation: name, ...principalAttributes(principal, true) }))),
      );
      const logs = yield* recordingLogs(payload, op.payload);
      return yield* Effect.gen(function* () {
        const span = yield* Effect.currentSpan;
        yield* Effect.annotateCurrentSpan(payloadAttributes(payload, op.payload));
        const handed = yield* prehandle(op, notFound, payload, unit);
        const from = yield* checkFrom(op, notFrom, handed.subject);
        const chosen = yield* Ref.make<string | undefined>(undefined);
        const move = (to?: string) => chooseOutcome(name, op, to, span).pipe(Effect.flatMap((o) => Ref.set(chosen, o)));
        const answer = yield* handler(payload, { principal, steps: pipeline.steps.bind(attempt), move, ...handed }).pipe(
          Effect.provideService(Records, logs.watching(unit.records)), logs.around,
        );
        yield* Effect.annotateCurrentSpan(answerAttributes(answer, op.answer));
        yield* check(answer).pipe(Effect.mapError((e) => new Error(`${name} answered outside its declaration: ${e.message}`)), Effect.orDie);
        const outcome = yield* Ref.get(chosen);
        // Its move is applied once its handler answers, as an outer's is.
        const entry = outcome === undefined ? undefined : yield* applyMove(name, op, payload, answer, outcome, unit, handed.id);
        if (from !== undefined && outcome !== undefined) yield* Effect.annotateCurrentSpan({ "move.from": from });
        const broken = yield* unit.check;
        if (broken !== undefined && own.has(broken.rule)) return yield* settleViolation(name, invariants, logs, () => new Conflict())(broken);
        // Its entry joins the attempt's journal only once it has answered, in the order the moves were made.
        if (entry !== undefined) attempt.journal.push(entry);
        return answer;
      }).pipe(Effect.tapCause(ending(codes, logs.last)), spanned(name, { operation: name, ...principalAttributes(principal) }));
    });
};
