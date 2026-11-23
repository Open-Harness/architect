import { Cause, Effect, Schema } from "effect";
import { NotAllowed, type Principal, type Read } from "orthograph";
import { Access } from "#modules/access/service.js";
import { Unit } from "#modules/records/service.js";
import { Records, Store, type Unit as UnitOf } from "#modules/records/types.js";
import { ReadNotServed } from "../types.ts";
import { answerAttributes, payloadAttributes, principalAttributes } from "./attributes.ts";
import { CALL_ID, newCallId } from "./call-id.ts";
import { measureCall } from "./call-metrics.ts";
import { spanned } from "./span.ts";
import type { ReadAnswer, ReadPayload, ReadsApi } from "../types.ts";
import { defectAttributes } from "./defect.ts";

type AnyCodec = Schema.Codec<object, unknown>;

const tagOf = (e: unknown): string =>
  typeof e === "object" && e !== null && typeof (e as { _tag?: unknown })._tag === "string" ? (e as { _tag: string })._tag : String(e);

/** One instance by its id; a missing one is `NotAllowed`, so a read never says what exists. */
const byId = (read: Read<any, any, any>, payload: ReadPayload, unit: UnitOf) =>
  Effect.gen(function* () {
    const found = yield* unit.read(read.thing, String(payload["id"]));
    if (!found) return yield* new NotAllowed();
    return Object.fromEntries(read.fields.map((f) => [f, f === "state" ? (found.state ?? "none") : found[f]])) as ReadAnswer;
  });

/** A cursor is the position of the last instance of the page before; anything else is not one this read handed out. */
const CURSOR = /^[0-9]{1,15}$/;
const refusals = new Set(["NotAllowed", "ReadNotServed"]);
const callRefusals = new Set([...refusals, "SchemaError"]);

/** A page: the instances matching the filters the caller gave, `page` of them, in the read's order. */
const byList = (read: Read<any, any, any>, payload: ReadPayload) =>
  Effect.gen(function* () {
    const store = yield* Store;
    const { cursor, state, ...filters } = payload as { readonly cursor?: string; readonly state?: string; readonly [field: string]: unknown };
    if (cursor !== undefined && !CURSOR.test(cursor)) return yield* new NotAllowed();
    const listed = yield* store.list({
      thing: read.thing,
      where: Object.fromEntries(Object.entries(filters).filter(([k]) => read.where.includes(k))),
      state,
      order: read.order ?? "newest",
      limit: read.page ?? 50,
      after: cursor,
    });
    const items = listed.items.map((i) => ({ ...i, state: i.state ?? "none" }));
    return { items, next: listed.next } as ReadAnswer;
  });

/** Reads are served beside operations: the same role check, the same span, no handler. */
export const Reads: ReadsApi = {
  serve: ({ name, read, mounts }) => {
    const decode = Schema.decodeUnknownEffect(read.payloadSchema as unknown as AnyCodec);
    const check = Schema.encodeEffect(read.answerSchema as unknown as AnyCodec);
    const run = (payload: ReadPayload, principal: Principal) =>
      Effect.flatMap(newCallId, (callId) => Effect.gen(function* () {
        const unit = yield* Unit.make(yield* Store);
        yield* Access.check({ allowed: read.allowed, payloadFields: read.payload, payload, principal, thing: read.thing, ...(mounts === undefined ? {} : { mounts }) }).pipe(
          Effect.provideService(Records, unit.records),
          Effect.withTracerEnabled(false),
        );
        return yield* Effect.gen(function* () {
          yield* Effect.annotateCurrentSpan(payloadAttributes(payload, read.payload));
          // Fail closed: a pinned or derived read is served from slice 7, and serving it as a plain read would drop `only` and its adds.
          if (read.only !== undefined || read.derive !== undefined) {
            return yield* new ReadNotServed({ read: name, message: `${name}: derived and pinned reads are served from slice 7 of Goal 17` });
          }
          const answer = read.by === "list" ? yield* byList(read, payload) : yield* byId(read, payload, unit);
          yield* Effect.annotateCurrentSpan(answerAttributes(answer, read.answer, read.by === "list" ? read.thing.fields : undefined));
          yield* check(answer).pipe(Effect.mapError((e) => new Error(`${name} answered outside its declaration: ${e.message}`)), Effect.orDie);
          return answer;
        }).pipe(
          // A refusal is written on the span as the handler wrapper does, and ends it ok (O1).
          Effect.tapCause((cause) => (Cause.hasDies(cause) ? Effect.annotateCurrentSpan(defectAttributes(cause)) : Effect.annotateCurrentSpan({ refusal: tagOf(Cause.squash(cause)) }))),
          spanned(name, { operation: name, [CALL_ID]: callId, ...principalAttributes(principal) }),
        );
      }));
    return {
      name,
      operation: read,
      run: (payload, principal) => run(payload, principal).pipe(measureCall(name, principal, refusals)),
      call: (raw, principal) => decode(raw).pipe(Effect.flatMap((p) => run(p as ReadPayload, principal)), measureCall(name, principal, callRefusals)),
    };
  },
};
