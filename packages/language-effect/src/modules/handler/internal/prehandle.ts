// What the runtime reads and makes before the handler runs (K16, M1.46): the instance the call is about, each thing the
// payload names by id, and a creating move's new id. Each is read here once, in the call's unit (the role check reads on
// its own), so the from-check, the commit's version guard and the handler all see the same instance.
import { Effect } from "effect";
import type { Operation } from "orthograph";
import { referencedThing } from "#modules/access/service.js";
import { Ids } from "#modules/ids/service.js";
import type { Instance, Unit } from "#modules/records/types.js";
import { NotFound } from "../types.ts";
import { subjectOf } from "./move.ts";

export interface Prehandled {
  /** The instance the call is about, when the payload names one of its thing by id. */
  readonly subject: Instance | undefined;
  /** Each thing a payload field names by id, keyed by that field; undefined when nothing has that id. */
  readonly refs: Readonly<Record<string, Instance | undefined>>;
  /** A creating move's new id, minted before the handler runs; undefined for any other call. */
  readonly id: string | undefined;
}

/** A move with no `from` makes its instance. */
export const creates = (op: Operation): boolean => op.move !== undefined && op.move.from.length === 0;

/**
 * Read what the payload names. A field in `notFound` that names nothing is refused with its `<Thing>NotFound`, carrying
 * the id: the compiler lists only fields no role check reads, since a role-gated miss is already `NotAllowed`.
 */
export const prehandle = (op: Operation, notFound: Readonly<Record<string, string>>, payload: object, unit: Unit) =>
  Effect.gen(function* () {
    const values = payload as Readonly<Record<string, unknown>>;
    const refs: Record<string, Instance | undefined> = {};
    for (const [key, field] of Object.entries(op.payload)) {
      const thing = referencedThing(field);
      const id = values[key];
      if (thing === undefined || typeof id !== "string") continue;
      const found = yield* unit.read(thing, id);
      const tag = notFound[key];
      if (found === undefined && tag !== undefined) return yield* Effect.fail(new NotFound({ _tag: tag, id }));
      refs[key] = found;
    }
    const subjectId = creates(op) ? undefined : subjectOf(op, payload);
    const subject = subjectId === undefined ? undefined : yield* unit.read(op.thing, subjectId);
    const idField = op.thing.fields["id"];
    const id = creates(op) && idField !== undefined ? ((yield* Ids.of(idField)) as string) : undefined;
    return { subject, refs, id } satisfies Prehandled;
  });
