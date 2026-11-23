import { Effect } from "effect";
import { acting, type Acting, type Allowed, type Principal, type Role, type ServiceRole, type Thing } from "orthograph";
import { Records } from "#modules/records/types.js";
import { NotAllowed, type AccessApi } from "./types.ts";
import { referencedThing } from "./internal/path.ts";

/** The thing whose id a field holds, followed back to the `id` it was taken from: what a payload field names. */
export { referencedThing };

type Mounts = ReadonlyMap<unknown, string>;
const NO_MOUNTS: Mounts = new Map();
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
 * payload field points at, or a path that starts from the subject when the payload has no such field (a read). On a read
 * by id, a path may name the subject's own thing first: `owner.of("membership.organization")` on `membership.get`.
 */
const roleOn = (role: Role, path: string | undefined, payloadFields: Fields, payload: object, person: Acting, own: Thing | undefined) =>
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
    // On a read by id (its payload is `{ id }`), a first key that is none of the subject's fields names the subject's own
    // thing (`membership.organization`), the way the same words name the payload's subject field on an operation (#761).
    // Only there: on an operation such a key is a typo, and it still admits nobody. Until #767, `check` doesn't catch a typo on a read.
    const namesSubject = !fromPayload && subject === "id" && own !== undefined && first !== undefined && !(first in own.fields);
    const target = yield* walk(origin, fromPayload || namesSubject ? keys.slice(1) : keys);
    if (!target || target.thing !== role.thing) return false;
    const instance = yield* records.find(role.thing, target.id);
    return instance !== undefined && role.rule(instance as never, person);
  });

/** The role an `allowed` entry names, if it names one (a narrowed entry names the role it narrowed). */
const roleOf = (a: Allowed): Role | ServiceRole | undefined => {
  const entry = a.kind === "narrowed" ? a.entry : a;
  return entry.kind === "role" ? entry : entry.kind === "role-of" ? entry.role : undefined;
};

/** What a service role is let through by: the mount it names is the mount the call came in by. */
const serviceAdmits = (role: ServiceRole, principal: Principal, mounts: Mounts) =>
  principal.kind === "service" && mounts.get(role.service) === principal.mount;

const allows = (a: Allowed, payloadFields: Fields, payload: object, principal: Principal, own: Thing | undefined, mounts: Mounts): Effect.Effect<boolean, never, Records> => {
  // A narrowed entry also needs the way the person or agent came in to be one it keeps (M2-auth, fork 2); a service or the system has no way in to narrow.
  const entry = a.kind === "narrowed" ? a.entry : a;
  const kept = a.kind === "narrowed" ? a.via : undefined;
  // The keeper calls only what lists it, even an operation open to anyone; and only the keeper may call what lists it (M8-checks call 4).
  if (entry.kind === "keeper") return Effect.succeed(principal.kind === "keeper");
  if (principal.kind === "keeper") return Effect.succeed(false);
  if (entry.kind === "anyone") return Effect.succeed(true);
  if (entry.kind === "system") return Effect.succeed(principal.kind === "system");
  if (entry.kind === "role" && entry.service !== undefined) return Effect.succeed(serviceAdmits(entry, principal, mounts));
  if (entry.kind === "role-of" && entry.role.service !== undefined) return Effect.succeed(serviceAdmits(entry.role, principal, mounts));
  const who = acting(principal);
  if (!who || (kept !== undefined && !kept.includes(who.via))) return Effect.succeed(false);
  if (entry.kind === "signed-in") return Effect.succeed(true);
  if (entry.kind === "role-of") return roleOn(entry.role as Role, entry.path, payloadFields, payload, who, own);
  return roleOn(entry as Role, undefined, payloadFields, payload, who, own);
};


export const Access: AccessApi = {
  holds: ({ allowed, payloadFields, payload, principal, thing, mounts = NO_MOUNTS }) =>
    Effect.gen(function* () {
      const held: Array<Role> = [];
      for (const a of allowed) {
        const role = roleOf(a);
        if (role && (yield* allows(a, payloadFields, payload, principal, thing, mounts))) held.push(role as Role);
      }
      return held;
    }),
  check: ({ allowed, payloadFields, payload, principal, thing, mounts = NO_MOUNTS }) =>
    Effect.gen(function* () {
      for (const a of allowed) if (yield* allows(a, payloadFields, payload, principal, thing, mounts)) return;
      return yield* new NotAllowed();
    }),
};
