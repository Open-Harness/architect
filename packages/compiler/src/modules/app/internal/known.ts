// What a declaration of the map points at, found by identity: an operation, a role, a thing or a value is the very object its
// own file exported, so its name is the one its path gave it.
import type { Allowed, RouteParam } from "orthograph";
import type { AllowedModel, FieldModel } from "#modules/model/types.js";
import type { AppWorld } from "../types.ts";

export interface Known {
  /** An operation or read, to its name (`profile.get`). */
  readonly operations: ReadonlyMap<unknown, string>;
  readonly roles: ReadonlyMap<unknown, string>;
  readonly things: ReadonlyMap<unknown, string>;
  readonly values: ReadonlyMap<unknown, string>;
}

export const knownOf = (world: AppWorld): Known => ({
  operations: new Map([...world.things].flatMap(([thing, t]) => [...t.verbs].map(([verb, v]) => [v.declaration, `${thing}.${verb}`] as const))),
  roles: new Map([...world.things].flatMap(([thing, t]) => [...t.roles].map(([role, r]) => [r, `${thing}.${role}`] as const))),
  things: new Map([...world.things].flatMap(([name, t]) => (t.thing ? [[t.thing, name] as const] : []))),
  values: new Map([...world.values].map(([name, v]) => [v, name] as const)),
});

/** Who may open a page, as an operation's `allowed` is written into the model. `?` (with a problem) for a role no `roles.ts` exports. */
export const allowedOf = (a: Allowed, known: Known, file: string, problems: Array<string>): AllowedModel => {
  if (a.kind === "anyone" || a.kind === "signed-in") return { kind: a.kind };
  const nameOf = (r: unknown) => known.roles.get(r) ?? (problems.push(`${file}: uses a role not exported from a roles.ts`), "?");
  return a.kind === "role" ? { kind: "role", role: nameOf(a) } : { kind: "role-of", role: nameOf(a.role), path: a.path };
};

/** A route parameter's type, as a payload field's is in the model: the value, the field it came from, the named value it is. */
export const paramOf = (p: RouteParam, known: Known, where: string, problems: Array<string>): FieldModel => {
  const value = p.kind === "field" ? p.value : p;
  const named = known.values.get(value);
  const thing = p.kind === "field" ? known.things.get(p.of) : undefined;
  if (p.kind === "field" && thing === undefined) problems.push(`${where}: uses a field of a thing that isn't in the blueprint`);
  const description = p.description;
  return {
    value: value.meta,
    ...(named ? { named } : {}),
    ...(p.kind === "field" && thing ? { ref: `${thing}.${p.key}` } : {}),
    ...(description === undefined ? {} : { description }),
  };
};
