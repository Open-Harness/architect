// What a caller is shown of a call's outcome: the answer and a refusal's fields, cut by the one visibility rule for
// the audience the caller is in this call (the roles they hold, and whether the call issued a secret to them).
import { Effect } from "effect";
import type { FieldsInput, Principal, Role } from "orthograph";
import { listItemFields } from "orthograph/server";
import { Access } from "#modules/access/service.js";
import { Unit } from "#modules/records/service.js";
import { Records, Store } from "#modules/records/types.js";
import { Audience, cutAnswer, Visibility } from "#modules/visibility/service.js";
import type { ShownOperation, WireApi } from "../types.ts";

/** The roles the caller holds in this call: asked only when some field in `groups` is private to roles. */
export const held = (op: ShownOperation, payload: object, principal: Principal, ...groups: ReadonlyArray<FieldsInput>): Effect.Effect<ReadonlyArray<Role>, never, Store> =>
  Visibility.needsRoles(...groups)
    ? Effect.gen(function* () {
        const unit = yield* Unit.make(yield* Store);
        return yield* Access.holds({ allowed: op.allowed, payloadFields: op.payload, payload, principal, thing: op.thing }).pipe(Effect.provideService(Records, unit.records));
      })
    : Effect.succeed([]);

/** A list read's `items` are the thing's instances, so their fields are the thing's own, and `state`. */
export const itemsOf = (op: ShownOperation): FieldsInput | undefined => (op.kind === "read" && op.by === "list" ? listItemFields(op.thing) : undefined);

const tagOf = (e: unknown): string | undefined =>
  typeof e === "object" && e !== null && typeof (e as { readonly _tag?: unknown })._tag === "string" ? (e as { readonly _tag: string })._tag : undefined;

export const shown: WireApi["shown"] = (declared) => (served, payload, principal) => (effect) => {
  const op = served.operation;
  const items = itemsOf(op);
  return (effect as Effect.Effect<unknown, unknown, never>).pipe(
    // An operation's answer is the call that issued whatever it marks `issued`, to its own caller; a read issues nothing.
    Effect.flatMap((answer) =>
      held(op, payload, principal, op.answer, ...(items ? [items] : [])).pipe(
        Effect.map((roles) => cutAnswer(op, answer as object, roles, items)),
      )),
    Effect.catch((failure: unknown) => {
      const tag = tagOf(failure);
      const fields = tag === undefined ? undefined : declared[tag]?.fields;
      // The machine's own refusal, `NotAllowed` and a bad payload carry nothing but public values: they pass as they are.
      if (tag === undefined || fields === undefined) return Effect.fail(failure);
      return held(op, payload, principal, fields).pipe(
        Effect.flatMap((roles) => Effect.fail({ _tag: tag, ...Visibility.redact(Audience.principal(roles), fields, failure as object) })),
      );
    }),
  ) as never;
};
