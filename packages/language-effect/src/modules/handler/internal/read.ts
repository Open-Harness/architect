import { Cause, Effect, Schema } from "effect";
import { NotAllowed, type Principal, type Read } from "orthograph";
import { Access } from "#modules/access/service.js";
import { Unit } from "#modules/records/service.js";
import { Records, Store, type ListQuery, type Unit as UnitOf } from "#modules/records/types.js";
import { CURSOR, derivedOne, derivedPage, notServed, unserved } from "./derived.ts";
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

/** One instance by its id, and what its derive adds; a missing one is `NotAllowed` as well. */
const derivedById = (read: Read<any, any, any>, payload: ReadPayload, unit: UnitOf) =>
  Effect.gen(function* () {
    const found = yield* unit.read(read.thing, String(payload["id"]));
    if (!found) return yield* new NotAllowed();
    return yield* derivedOne(read, found);
  });

const refusals = new Set(["NotAllowed", "ReadNotServed"]);
const callRefusals = new Set([...refusals, "SchemaError"]);

type Listing = Omit<ListQuery, "after">;

/**
 * A list with `first` (GOAL17-slice9-build call 2): the rows holding the value come first, then the rest, each group in the read's order, in one page
 * of `limit` rows and no cursor. The rest is read page by page and the first group's rows left out, until the page is full or the rows run out.
 */
const firstThenRest = (store: Store["Service"], listing: Listing, [field, value]: readonly [string, unknown]) =>
  Effect.gen(function* () {
    const ahead = yield* store.list({ ...listing, where: { ...listing.where, [field]: value }, after: undefined });
    const rows = [...ahead.items];
    let after: string | undefined;
    let more = rows.length < listing.limit;
    while (more) {
      const page = yield* store.list({ ...listing, after });
      for (const row of page.items) if (rows.length < listing.limit && row[field] !== value) rows.push(row);
      after = page.next ?? undefined;
      more = page.next !== null && rows.length < listing.limit;
    }
    return { items: rows.map((i) => ({ ...i, state: i.state ?? "none" })), next: null } as ReadAnswer;
  });

/** A page: the instances matching the filters the caller gave, `page` of them, in the read's order. */
const byList = (read: Read<any, any, any>, payload: ReadPayload) =>
  Effect.gen(function* () {
    const store = yield* Store;
    const { cursor, state, ...filters } = payload as { readonly cursor?: string; readonly state?: string; readonly [field: string]: unknown };
    if (cursor !== undefined && !CURSOR.test(cursor)) return yield* new NotAllowed();
    // A field the read pins (`only`) is never the caller's to set: it is the read's own filter, whatever the payload says.
    const { state: pinnedState, ...pinned } = (read.only ?? {}) as { readonly state?: string; readonly [field: string]: unknown };
    const where = { ...Object.fromEntries(Object.entries(filters).filter(([k]) => read.where.includes(k))), ...pinned };
    const spec = { thing: read.thing, state: pinnedState ?? state, order: read.order ?? "newest", limit: read.page ?? 50 } as const;
    const ahead = Object.entries(read.first ?? {})[0];
    if (ahead !== undefined) return yield* firstThenRest(store, { ...spec, where }, ahead);
    const listed = yield* store.list({ ...spec, where, after: cursor });
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
          // Fail closed: a derive that looks at something no store can list is not served, and serving it as a plain read would drop its adds.
          if (read.derive !== undefined && unserved(read.derive)) return yield* notServed(name);
          const answer = read.by === "list"
            ? (read.derive === undefined ? yield* byList(read, payload) : yield* derivedPage(read, payload))
            : (read.derive === undefined ? yield* byId(read, payload, unit) : yield* derivedById(read, payload, unit));
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
