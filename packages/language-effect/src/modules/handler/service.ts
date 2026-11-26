import { Duration, Effect, Ref, Schema } from "effect";
import type { Operation, Principal } from "orthograph";
import { ErrorNames } from "orthograph/server";
import { Access } from "#modules/access/service.js";
import type { CallWiring } from "#modules/calls/types.js";
import type { Entry } from "#modules/journal/types.js";
import { Unit } from "#modules/records/service.js";
import { Records, Store } from "#modules/records/types.js";
import { Busy } from "#modules/work/types.js";
import { CALL_ID, newCallId } from "./internal/call-id.ts";
import { BlankReached, IdempotencyConflict, InvalidPayload, type HandlerApi } from "./types.ts";
import { canonical, sha256 } from "./internal/digest.ts";
import { answerAttributes, payloadAttributes, principalAttributes, requestAttributes } from "./internal/attributes.ts";
import { measureCall } from "./internal/call-metrics.ts";
import { Environment } from "./internal/environment.ts";
import { applyMove, checkFrom, chooseOutcome } from "./internal/move.ts";
import { prehandle } from "./internal/prehandle.ts";
import { recordingLogs } from "./internal/decided.ts";
import { settleViolation } from "./internal/invariants.ts";
import { spanned } from "./internal/span.ts";
import { Conflict, INNER, type Attempt, type Inner } from "./internal/attempt.ts";
import { ending, innerRun, tagOf, type AnyHandler } from "./internal/inner.ts";
import { stepsOf } from "./internal/steps.ts";
export { Reads } from "./internal/read.ts";
export { Environment } from "./internal/environment.ts";

type AnyCodec = Schema.Codec<object, unknown>;

/** Every round of contenders has at least one winner, so this many attempts outlasts any fair race (D2 #36). */
const ATTEMPTS = 64;

interface Spec {
  readonly name: string;
  readonly operation: unknown;
  readonly handler: AnyHandler;
  readonly notFrom?: string;
  readonly notFound?: Readonly<Record<string, string>>;
  readonly calls?: Readonly<Record<string, CallWiring>>;
  readonly codes?: Readonly<Record<string, string>>;
  /** The refusals the runtime makes for this operation's writes (G5): each error's tag to the full name of the rule it refuses for. From the model's `operations.<op>.invariants`. */
  readonly invariants?: Readonly<Record<string, string>>;
  /** Each adapter's mount by the name it is mounted under: what a `service` role in `allowed` is read against. */
  readonly mounts?: ReadonlyMap<unknown, string>;
  /** Each operation step's inner operation, served, by the step's key (#1079): what `steps.<key>(payload)` runs. */
  readonly operations?: Readonly<Record<string, unknown>>;
}

const serve = ({ name, operation, handler, notFrom, notFound = {}, calls, codes, invariants = {}, mounts, operations }: Spec) => {
  const op = operation as Operation;
  const budgetMs = op.budget === undefined ? undefined : Duration.toMillis(op.budget.p95);
  const decode = Schema.decodeUnknownEffect(op.payloadSchema as unknown as AnyCodec);
  const check = Schema.encodeEffect(op.answerSchema as unknown as AnyCodec);
  const refusals = new Set(op.errors.map(ErrorNames.nameOf).filter((tag) => tag !== undefined));
  if (notFrom !== undefined) refusals.add(notFrom);
  for (const tag of Object.values(notFound)) refusals.add(tag);
  for (const tag of Object.keys(invariants)) refusals.add(tag);
  if (op.allowed.some((role) => role.kind !== "anyone")) refusals.add("NotAllowed");
  const steps = stepsOf(name, op, { calls, operations });
  // Every refusal an inner operation can make is this one's too (#1079): counted as this call's refusal, never a defect.
  for (const tag of steps.innerRefusals) refusals.add(tag);
  // Run inside another operation, it keeps no request key: its own IdempotencyConflict is never the outer's.
  const innerRefusals: ReadonlySet<string> = new Set(refusals);
  if (op.idempotent === "request") refusals.add("IdempotencyConflict");
  const callRefusals = new Set([...refusals, "InvalidPayload"]);

  // One attempt: who may call, then the operation's own span (opened only once the caller may call, so a refused caller
  // leaves no handler span, only `<operation>.refused`, which carries the refusal), the machine's check, the handler,
  // its answer checked, its move, one commit.
  const refused = (principal: Principal, number: number, callId: string, request: string | undefined) => (e: unknown) => {
    const tag = tagOf(e);
    const code = codes?.[tag];
    return Effect.annotateCurrentSpan({ refusal: tag, ...(code === undefined ? {} : { "refusal.code": code }) }).pipe(
      spanned(`${name}.refused`, { operation: name, attempt: number, [CALL_ID]: callId, ...principalAttributes(principal, true), ...requestAttributes(request) }),
    );
  };
  const decodeAnswer = Schema.decodeUnknownEffect(op.answerSchema as unknown as AnyCodec);
  const attempt = (payload: object, principal: Principal, key: string | undefined, request: string | undefined, number: number, callId: string) =>
    Effect.gen(function* () {
      const store = yield* Store;
      const unit = yield* Unit.make(store);
      // What this attempt's operations share: an inner operation's writes are held in this unit and its entries join this journal.
      const journal: Array<Entry> = [];
      const shared: Attempt = { unit, principal, journal };
      const withRecords = Effect.provideService(Records, unit.records);
      // The check's own reads are not traced: a refusal is, in its own span.
      yield* Access.check({ allowed: op.allowed, payloadFields: op.payload, payload, principal, thing: op.thing, ...(mounts === undefined ? {} : { mounts }) }).pipe(
        withRecords, Effect.withTracerEnabled(false), Effect.tapError(refused(principal, number, callId, request)),
      );
      const logs = yield* recordingLogs(payload, op.payload);
      // The operation is counted work from its handler to its commit (M8.07): a world is quiet only once its writes are visible.
      const busy = (yield* Busy).as(name);
      return yield* Effect.gen(function* () {
        // The operation's span, which a move's attributes are written on whichever step span the handler is in.
        const operationSpan = yield* Effect.currentSpan;
        yield* Effect.annotateCurrentSpan(payloadAttributes(payload, op.payload));
        // Where the call ran: the world's environment, and the kind of store its thing lives in.
        yield* Effect.annotateCurrentSpan({ environment: yield* Environment, store: op.thing.lives });
        // The same request key from the same caller is one call: answer what was answered, and change nothing.
        const kept = key === undefined ? undefined : yield* store.answered(key);
        if (kept !== undefined) {
          // The kept answer is bound to the payload it was made for: the same key with another payload is another request.
          const { payload: madeFor, answer } = JSON.parse(kept) as { readonly payload: string; readonly answer: unknown };
          if (madeFor !== sha256(canonical(payload))) return yield* new IdempotencyConflict();
          yield* Effect.annotateCurrentSpan({ "request.replayed": true });
          return yield* decodeAnswer(answer).pipe(Effect.orDie);
        }
        // What the payload names, read once and handed in; a missing one is refused before the handler, then the from-check.
        const handed = yield* prehandle(op, notFound, payload, unit);
        const from = yield* checkFrom(op, notFrom, handed.subject);
        const chosen = yield* Ref.make<string | undefined>(undefined);
        const move = (to?: string) => chooseOutcome(name, op, to, operationSpan).pipe(Effect.flatMap((o) => Ref.set(chosen, o)));
        const answer = yield* handler(payload, { principal, steps: steps.bind(shared), move, ...handed }).pipe(Effect.provideService(Records, logs.watching(unit.records)), logs.around);
        // Recorded before the check, so an answer outside its declaration is evidence `prove` can name.
        yield* Effect.annotateCurrentSpan(answerAttributes(answer, op.answer));
        // An answer that breaks its declaration is the handler's bug, never the caller's: it dies, loudly.
        const wire = yield* check(answer).pipe(
          Effect.mapError((e) => new Error(`${name} answered outside its declaration: ${e.message}`)),
          Effect.orDie,
        );
        const outcome = yield* Ref.get(chosen);
        // Its own move comes after every inner operation's, as the moves were made.
        const own = outcome === undefined ? undefined : yield* applyMove(name, op, payload, answer, outcome, unit, handed.id);
        const entries = [...journal, ...(own === undefined ? [] : [own])];
        // The state the subject was in, written once the move is made: a refused call made no move.
        if (from !== undefined && outcome !== undefined) yield* Effect.annotateCurrentSpan({ "move.from": from });
        const request = key === undefined ? {} : { request: { key, answer: JSON.stringify({ payload: sha256(canonical(payload)), answer: wire }) } };
        // Every rule this call's rows could break, after the move and before the commit: the store's own index then catches the race.
        const broken = yield* unit.check;
        if (broken !== undefined) return yield* settleViolation(name, invariants, logs, () => new Conflict())(broken);
        const writes = yield* unit.writes;
        // #764: the lists the handler read, which the store guards like an update's version.
        const lists = yield* unit.lists;
        const committed = yield* store.commit({ writes, entries, ...request, ...(lists.length > 0 ? { lists } : {}) }).pipe(
          Effect.tap((outcome) => Effect.annotateCurrentSpan({
            "commit.outcome": outcome,
            // The event the move emitted, named only on the commit that journalled it: a conflicted attempt emitted nothing.
            ...(outcome === "committed" && own !== undefined ? { "event.name": own.event } : {}),
          })),
          spanned(`${name}.commit`, { "step.kind": "commit", "commit.writes": writes.length, "commit.entries": entries.length }),
          // A write section: the commit happens only while the world still holds this request's token, and a reset waits for it (M8.07).
          busy.fenced,
        );
        if (committed === "conflict") return yield* new Conflict();
        return answer;
      }).pipe(
        // Every refusal and every defect is written on the operation's span: what `prove` reads.
        // A refusal also carries the log that decided it, when the handler logged one before refusing.
        Effect.tapCause(ending(codes, logs.last)),
        spanned(name, { operation: name, attempt: number, [CALL_ID]: callId, ...principalAttributes(principal), ...requestAttributes(request) }),
        busy.counted,
      );
    });

  const run = (payload: object, principal: Principal, request?: string) => {
    // Keyed by operation and caller as well, so one caller's key never answers another's call.
    // Each kind is its own: an agent's retries never answer its person's call (M2-auth, "Smaller calls" 1).
    const who = "person" in principal ? `${principal.kind}:${principal.person}` : principal.kind === "service" ? `service:${principal.mount}` : principal.kind;
    const key = op.idempotent === "request" && request !== undefined ? `${name}|${who}|${request}` : undefined;
    // The call is named once, before its first attempt, and every attempt's span carries the name: attempts of one call are sequential, but different
    // calls' attempts overlap, so nothing else in a trace says which attempts belong together (O3).
    const loop = (number: number, callId: string): Effect.Effect<object, unknown, unknown> =>
      attempt(payload, principal, key, key === undefined ? undefined : request, number, callId).pipe(
        Effect.catch((e) =>
          !(e instanceof Conflict) ? Effect.fail(e)
          : number < ATTEMPTS ? loop(number + 1, callId)
          : Effect.die(new Error(`${name} lost its version race ${ATTEMPTS} times in a row`)),
        ),
      );
    return Effect.flatMap(newCallId, (callId) => loop(1, callId));
  };
  // What an outer operation runs when its handler runs this one as `steps.<key>(payload)` (#1079).
  const inner: Inner = { name, operation, refusals: innerRefusals, run: innerRun({ name, op, handler, notFrom, notFound, invariants, codes, mounts, steps }) };
  return {
    name,
    operation,
    [INNER]: inner,
    call: (raw: unknown, principal: Principal) =>
      decode(raw).pipe(
        Effect.mapError((e) => new InvalidPayload({ issues: e.message })),
        Effect.flatMap((payload) => run(payload, principal)),
        measureCall(name, principal, callRefusals, budgetMs),
      ),
    run: (payload: object, principal: Principal, request?: string) => run(payload, principal, request).pipe(measureCall(name, principal, refusals, budgetMs)),
  };
};

/** Typed at the edge (`HandlerApi`); inside, one untyped implementation serves every operation. */
export const Handlers: HandlerApi = {
  serve: serve as unknown as HandlerApi["serve"],
  blank: ((what: string, kind?: "failure") => (kind === "failure" ? () => new BlankReached({ what }) : Effect.die(new BlankReached({ what })))) as unknown as HandlerApi["blank"],
};

/** Operations that run on the caller's device (M1.27): the generated SDK serves each plugin's `runs: "client"` operation with this. */
export { Device } from "./internal/device.ts";
