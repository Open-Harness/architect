import { Effect } from "effect";
import type { Allowed, Principal, Role, Thing } from "orthograph";
import { Records } from "#modules/records/types.js";
import { NotAllowed, type AccessApi } from "./types.ts";
import { referencedThing } from "./internal/path.ts";

/** The thing whose id a field holds, followed back to the `id` it was taken from: what a payload field names. */
export { referencedThing };

type Person = Extract<Principal, { kind: "person" }>;
type Fields = { readonly [key: string]: unknown };

/** Where a walk starts: a payload field holding some thing's id. */
const start = (payloadFields: Fields, payload: object, key: string): { thing: Thing | undefined; id: unknown } => ({
  thing: referencedThing(payloadFields[key]),
  id: (payload as Record<string, unknown>)[key],
});

/** The payload field that names an instance of `thing`: the subject, for a bare role or a path from the subject. */
const subjectKey = (payloadFields: Fields, thing: Thing) => Object.keys(payloadFields).find((k) => referencedThing(payloadFields[k]) === thing);

/** Walk `keys` from an instance, field by field, to the instance the role is decided on. */
const walk = (from: { thing: Thing | undefined; id: unknown }, keys: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const records = yield* Records;
    let { thing, id } = from;
    for (const key of keys) {
      if (!thing || typeof id !== "string") return undefined;
      const instance = yield* records.find(thing, id);
      if (!instance) return undefined;
      id = instance[key];
      thing = referencedThing(thing.fields[key]);
    }
    return thing && typeof id === "string" ? { thing, id } : undefined;
  });

/**
 * A role decided on an instance: `grantee` on the operation's own subject, `owner.of("organization")` on the thing a
 * payload field points at, or a path that starts from the subject when the payload has no such field (a read).
 */
const roleOn = (role: Role, path: string | undefined, payloadFields: Fields, payload: object, person: Person, own: Thing | undefined) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const keys = path === undefined ? [] : path.split(".");
    const first = keys[0];
    const fromPayload = first !== undefined && first in payloadFields;
    const subject = own && subjectKey(payloadFields, own);
    const origin = fromPayload
      ? start(payloadFields, payload, first)
      : subject !== undefined
        ? start(payloadFields, payload, subject)
        : path === undefined
          ? start(payloadFields, payload, subjectKey(payloadFields, role.thing) ?? "")
          : undefined;
    if (!origin) return false;
    const target = yield* walk(origin, fromPayload ? keys.slice(1) : keys);
    if (!target || target.thing !== role.thing) return false;
    const instance = yield* records.find(role.thing, target.id);
    return instance !== undefined && role.rule(instance as never, person);
  });

const allows = (a: Allowed, payloadFields: Fields, payload: object, principal: Principal, own: Thing | undefined): Effect.Effect<boolean, never, Records> => {
  // The keeper calls only what lists it, even an operation open to anyone; and only the keeper may call what lists it (M8-checks call 4).
  if (a.kind === "keeper") return Effect.succeed(principal.kind === "keeper");
  if (principal.kind === "keeper") return Effect.succeed(false);
  if (a.kind === "anyone") return Effect.succeed(true);
  if (principal.kind !== "person") return Effect.succeed(false);
  if (a.kind === "signed-in") return Effect.succeed(true);
  if (a.kind === "role-of") return roleOn(a.role, a.path, payloadFields, payload, principal, own);
  return roleOn(a, undefined, payloadFields, payload, principal, own);
};

/** The role an `allowed` entry names, if it names one. */
const roleOf = (a: Allowed): Role | undefined => (a.kind === "role" ? a : a.kind === "role-of" ? a.role : undefined);


export const Access: AccessApi = {
  holds: ({ allowed, payloadFields, payload, principal, thing }) =>
    Effect.gen(function* () {
      const held: Array<Role> = [];
      for (const a of allowed) {
        const role = roleOf(a);
        if (role && (yield* allows(a, payloadFields, payload, principal, thing))) held.push(role);
      }
      return held;
    }),
  check: ({ allowed, payloadFields, payload, principal, thing }) =>
    Effect.gen(function* () {
      for (const a of allowed) if (yield* allows(a, payloadFields, payload, principal, thing)) return;
      return yield* new NotAllowed();
    }),
};
