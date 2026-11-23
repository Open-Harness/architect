// What the runtime reads before a handler runs, and what it refuses as `<Thing>NotFound` (K16, M1.46). Each payload field
// that holds some thing's id is read and handed in (`refs`). A missing one is refused `NotAllowed` when every way in is a
// role check that reads it (a stranger learns nothing about what exists), and `<Thing>NotFound` otherwise.
import type { Allowed, Field, FieldsInput, Operation, Thing } from "orthograph";

/** A generated not-found refusal: after the machine's (900) in a thing's codes. */
export const NOT_FOUND_NUMBER = 901;
/** Its exit: the CLI's "not found", beside `NotAllowed`'s 3. */
export const NOT_FOUND_EXIT = 4;

const isField = (x: unknown): x is Field => typeof x === "object" && x !== null && (x as { kind?: unknown }).kind === "field";

/** The thing whose id a field holds: followed back to the `id` it was taken from, as the runtime's role check does. */
const referenced = (field: unknown): Thing | undefined => {
  let f: Field | undefined = isField(field) ? field : undefined;
  while (f) {
    if (f.key === "id") return f.of;
    f = f.from;
  }
  return undefined;
};

/** The payload field naming an instance of `thing`. */
const keyOf = (payload: FieldsInput, thing: Thing) => Object.keys(payload).find((k) => referenced(payload[k]) === thing);

/** The payload field a role check starts its walk from, and so reads: undefined for `anyone` and `signedIn`. */
const readBy = (a: Allowed, payload: FieldsInput, own: Thing): string | undefined => {
  if (a.kind === "anyone" || a.kind === "signed-in") return undefined;
  if (a.kind === "role-of") {
    const first = a.path.split(".")[0] ?? "";
    return first in payload ? first : keyOf(payload, own);
  }
  return keyOf(payload, own) ?? keyOf(payload, a.thing);
};

export interface Found {
  /** Each payload field holding a thing's id, and that thing. */
  readonly refs: ReadonlyMap<string, Thing>;
  /** The fields whose missing instance is refused `<Thing>NotFound`: no role check reads them on every way in. */
  readonly notFound: ReadonlyMap<string, Thing>;
}

export const foundOf = (op: Operation): Found => {
  const refs = new Map<string, Thing>();
  for (const [key, field] of Object.entries(op.payload)) {
    const thing = referenced(field);
    if (thing) refs.set(key, thing);
  }
  const creating = op.move !== undefined && op.move.from.length === 0;
  const notFound = new Map([...refs].filter(([key, thing]) =>
    !(creating && thing === op.thing) && !op.allowed.every((a) => readBy(a, op.payload, op.thing) === key)));
  return { refs, notFound };
};

/** A thing's not-found refusal: the one it declares under that name, else generated at `<XX>-901` (`generated` is that code, from the lock), exit 4. */
export const notFoundOf = (
  identifier: string, generated: string,
  errors: Readonly<Record<string, { readonly exit: number; readonly code: string }>>,
): { readonly error: string; readonly exit: number; readonly code: string } => {
  const error = `${identifier}NotFound`;
  const declared = errors[error];
  return declared ? { error, exit: declared.exit, code: declared.code } : { error, exit: NOT_FOUND_EXIT, code: generated };
};

/** An operation's part of the model: `refs` and `notFound` by payload field, each present only when it has any. */
export const foundModel = (op: Operation, nameOf: (t: Thing) => string | undefined, errorOf: (thing: string) => string | undefined) => {
  const found = foundOf(op);
  const refs = Object.fromEntries([...found.refs].map(([k, t]) => [k, nameOf(t) ?? "?"]));
  const notFound = Object.fromEntries([...found.notFound].map(([k, t]) => [k, errorOf(nameOf(t) ?? "") ?? "?"]));
  return { ...(Object.keys(refs).length > 0 ? { refs } : {}), ...(Object.keys(notFound).length > 0 ? { notFound } : {}) };
};

/** An operation the runtime can serve: none of the parts the read needs is still `Blueprint.todo`. */
export const missedBy = (d: Operation | { readonly kind: "read" }, blank: (x: unknown) => boolean): ReadonlyArray<Thing> =>
  d.kind !== "operation" || [d.payload, d.allowed, d.move].some(blank) || Object.values(d.payload).some(blank)
    ? [] : [...foundOf(d).notFound.values()];

/** A creating move's field that carries the new id: the answer's, else the payload's, holding the thing's own `id`. */
export const mintsOf = (creating: boolean, own: string, ...fields: ReadonlyArray<Readonly<Record<string, { readonly ref?: string }>>>) =>
  creating ? fields.flatMap((f) => Object.keys(f).filter((k) => f[k]!.ref === `${own}.id`))[0] : undefined;
