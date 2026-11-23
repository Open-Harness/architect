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

/**
 * Who may open a page, as an operation's `allowed` is written into the model. A page is opened by a caller of a request, so the
 * runtime's own principals (`system`, `keeper`) and a role made for an outside service are refused as a problem naming the file;
 * a narrowed entry (its ways in) is the entry it narrows, since a page has no ways in of its own.
 */
export const allowedOf = (a: Allowed, known: Known, file: string, problems: Array<string>): AllowedModel => {
  if (a.kind === "narrowed") return allowedOf(a.entry, known, file, problems);
  if (a.kind === "anyone" || a.kind === "signed-in") return { kind: a.kind };
  if (a.kind === "system" || a.kind === "keeper") {
    problems.push(`${file}: allows ${a.kind}, which has no credential and never opens a page: a page is allowed to anyone, signed-in callers or a role`);
    return { kind: a.kind };
  }
  const nameOf = (r: unknown) => known.roles.get(r) ?? (problems.push(`${file}: uses a role not exported from a roles.ts`), "?");
  const service = a.kind === "role" ? a.service : a.role.service;
  if (service !== undefined) problems.push(`${file}: allows ${nameOf(a.kind === "role" ? a : a.role)}, a role for an outside service${a.kind === "role-of" ? ` (scoped by ${a.path})` : ""}, which never opens a page`);
  return a.kind === "role" ? { kind: "role", role: nameOf(a) } : { kind: "role-of", role: nameOf(a.role), path: a.path };
};

/** A route parameter's type, as a payload field's is in the model: the value, the field it came from, the named value it is. */
export const paramOf = (p: RouteParam, known: Known, where: string, problems: Array<string>): FieldModel => {
  const value = p.kind === "field" ? p.value : p;
  const named = known.values.get(value);
  const thing = p.kind === "field" ? known.things.get(p.of) : undefined;
  if (p.kind === "field" && thing === undefined) problems.push(`${where}: uses a field of a thing that isn't in the blueprint`);
  const description = p.description;
  const meta = value.meta;
  // An address carries text, never an amount and its asset (M6-money): a money parameter is refused, and the placeholder never reaches a model.
  if (meta.type === "money") problems.push(`${where}: a route parameter can't be money: an address carries an id or text, not an amount and its asset`);
  return {
    value: meta.type === "money" ? { type: "text", max: 0 } : meta,
    ...(named ? { named } : {}),
    ...(p.kind === "field" && thing ? { ref: `${thing}.${p.key}` } : {}),
    ...(description === undefined ? {} : { description }),
  };
};
