// An `allowed` entry as the model says it: which role or built-in, the ways in it keeps, and the adapter's mount a service role is for;
// and whether a role path in it walks to an instance of its role's thing.
import type { Allowed, FieldsInput, Role, Thing } from "orthograph";
import type { AllowedModel } from "../types.ts";
import { referenced } from "./found.ts";
import { camel, type Layout } from "./layout.ts";

/** Records a problem and answers the `?` the model shows for a name it could not find. */
const unknown = (problems: Array<string>, p: string): string => {
  problems.push(p);
  return "?";
};

/**
 * `allowedModel` reads one entry of a declaration's `allowed` (or a journey's cast). A narrowed entry (`.via`, `.notVia`) says the ways in it
 * keeps, sorted; a `service` role says the name of the adapter it admits (M2-auth, fork 3).
 */
export const allowedOf = (layout: Layout, roleNames: ReadonlyMap<Role<any>, string>, problems: Array<string>) => {
  /** The name an adapter is mounted under: its file's. A `service` role admits the service of that mount. */
  const mountName = (mount: unknown, where: string): string => {
    const found = [...layout.mounts].find(([, m]) => m.mount === mount);
    if (!found) return unknown(problems, `${where}: a service role names a mount that is not mounted: mount its adapter in blueprint/adapters/`);
    if (found[1].kind !== "adapter") unknown(problems, `${where}: a service role names ${found[0]}, which is not an adapter: only an adapter's door makes a service`);
    return found[0];
  };
  const allowedModel = (entry: Allowed, where: string): AllowedModel => {
    // A narrowed entry keeps the ways in it names (sorted by the declaration), and none may be empty.
    const a = entry.kind === "narrowed" ? entry.entry : entry;
    if (entry.kind === "narrowed" && entry.via.length === 0) problems.push(`${where}: .via(...) names no way in, so nobody could call it`);
    const via = entry.kind === "narrowed" ? { via: [...entry.via] } : {};
    if (a.kind === "anyone") return { kind: "anyone" };
    if (a.kind === "system") return { kind: "system" };
    if (a.kind === "keeper") return { kind: "keeper" };
    if (a.kind === "signed-in") return { kind: "signed-in", ...via };
    const name = (r: unknown) => roleNames.get(r as never) ?? unknown(problems, `${where}: uses a role not exported from a roles.ts`);
    const role = a.kind === "role" ? a : a.role;
    const service = role.service === undefined ? {} : { service: mountName(role.service, where) };
    if (a.kind === "role") return { kind: "role", role: name(a), ...service, ...via };
    return { kind: "role-of", role: name(a.role), path: a.path, ...service, ...via };
  };
  return allowedModel;
};

/**
 * The problem with a role path that walks to nothing (#767). `owner.of("<path>")` is decided by walking the path field by field to an
 * instance of the role's thing, as language-effect's access does: from the payload field its first key names, else from the subject.
 * On a read by id the first key may name the subject's own thing, spelt as its name in camel case (`bankAccount`), the name it has
 * before any mount renames it (`ownName`); the runtime takes any key that is no field of the subject so, and `check` holds it to that
 * spelling. A service role is decided by its mount, not a path.
 */
export const rolePathProblem = (spec: {
  readonly entry: Allowed;
  readonly payload: FieldsInput;
  readonly own: Thing;
  readonly ownName: string;
  readonly names: { readonly role: (r: unknown) => string; readonly thing: (t: Thing) => string };
  readonly where: string;
}): string | undefined => {
  const { payload, own, names, where } = spec;
  const a = spec.entry.kind === "narrowed" ? spec.entry.entry : spec.entry;
  if (a.kind !== "role-of" || a.role.service !== undefined) return undefined;
  const role = a.role as Role;
  const said = `${where}: ${names.role(role)} is decided on "${a.path}"`;
  const [first = "", ...rest] = a.path.split(".");
  const subject = Object.keys(payload).find((k) => referenced(payload[k]) === own);
  const ownName = camel(spec.ownName);
  let thing = first in payload ? referenced(payload[first]) : subject !== undefined ? own : undefined;
  if (thing === undefined) {
    return first in payload
      ? `${said}, but the payload's ${first} holds no thing's id`
      : `${said}, but ${first} is no payload field, and the payload names no ${ownName} to start from: its fields are ${Object.keys(payload).join(", ")}`;
  }
  const namesSubject = !(first in payload) && subject === "id" && first === ownName && !(first in own.fields);
  for (const key of first in payload || namesSubject ? rest : [first, ...rest]) {
    if (!(key in thing.fields)) return `${said}, but ${names.thing(thing)} has no field ${key}: its fields are ${Object.keys(thing.fields).join(", ")}`;
    const next = referenced(thing.fields[key]);
    if (next === undefined) return `${said}, but ${names.thing(thing)}.${key} holds no thing's id, so the walk stops there`;
    thing = next;
  }
  return thing === role.thing ? undefined : `${said}, which reaches a ${names.thing(thing)}, but ${names.role(role)} is a role on ${names.thing(role.thing)}`;
};
