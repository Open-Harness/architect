import { Effect } from "effect";
import { acting, type Allowed, type InstanceOf, type Principal, type Role, type ServiceRole, type Thing } from "orthograph";
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
 * payload field points at, or a path that starts from the subject when the payload has no such field (a read).
 */
const roleOn = (role: Role, path: string | undefined, payloadFields: Fields, payload: object, decide: (instance: InstanceOf<Thing>) => boolean, own: Thing | undefined) =>
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
    return instance !== undefined && decide(instance as never);
  });

/** The name a thing gives a field: the key its `fields` hold it under. */
const nameOf = (thing: Thing, field: object | undefined): string | undefined => Object.keys(thing.fields).find((k) => thing.fields[k] === field);

/**
 * `actor:` (K40 fix 1, with `within`): the instance's mount and outside id are the caller's, it is in a state `while` names, and, when the role says
 * `within`, the call names the same value for that field as the instance holds. Two connections can share an outside id, so the id alone never matches.
 */
const senderAdmitted = (role: Role, mount: string, id: string, payload: object) => (instance: InstanceOf<Thing>): boolean => {
  const form = role.actor!;
  const mountKey = nameOf(role.thing, form.mount);
  const idKey = nameOf(role.thing, form.id);
  const withinKey = form.within === undefined ? undefined : nameOf(role.thing, form.within);
  const row = instance as unknown as Record<string, unknown>;
  const states = form.while.map((state) => state.key);
  return mountKey !== undefined && idKey !== undefined && row[mountKey] === mount && row[idKey] === id
    && (states.length === 0 || states.includes(String(row["state"])))
    && (withinKey === undefined || (payload as Record<string, unknown>)[withinKey] === row[withinKey]);
};

/** `agent:` (K40 fix 3): the field the role names holds the id of the agent that is calling. */
const agentAdmitted = (role: Role, agent: string) => (instance: InstanceOf<Thing>): boolean => {
  const key = nameOf(role.thing, role.agent);
  return key !== undefined && (instance as unknown as Record<string, unknown>)[key] === agent;
};

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
  // A role made with `actor:` admits the outside account that sent the call; one made with `agent:` admits the agent acting as itself. Neither admits a person.
  const named = entry.kind === "role" ? entry : entry.kind === "role-of" ? entry.role : undefined;
  const path = entry.kind === "role-of" ? entry.path : undefined;
  if (named?.actor !== undefined) return principal.kind === "service" && principal.actor !== undefined ? roleOn(named as Role, path, payloadFields, payload, senderAdmitted(named as Role, principal.mount, principal.actor.id, payload), own) : Effect.succeed(false);
  if (named?.agent !== undefined) return principal.kind === "agent" && "agent" in principal ? roleOn(named as Role, path, payloadFields, payload, agentAdmitted(named as Role, principal.agent), own) : Effect.succeed(false);
  const who = acting(principal);
  if (!who || (kept !== undefined && !kept.includes(who.via))) return Effect.succeed(false);
  if (entry.kind === "signed-in") return Effect.succeed(true);
  if (entry.kind === "role-of") return roleOn(entry.role as Role, entry.path, payloadFields, payload, (i) => (entry.role as Role).rule(i, who), own);
  return roleOn(entry as Role, undefined, payloadFields, payload, (i) => (entry as Role).rule(i, who), own);
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
