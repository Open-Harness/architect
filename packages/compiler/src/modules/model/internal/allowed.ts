// An `allowed` entry as the model says it: which role or built-in, the ways in it keeps, and the adapter's mount a service role is for.
import type { Allowed, Role } from "orthograph";
import type { AllowedModel } from "../types.ts";
import type { Layout } from "./layout.ts";

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
    if (a.kind === "signed-in") return { kind: "signed-in", ...via };
    const name = (r: unknown) => roleNames.get(r as never) ?? unknown(problems, `${where}: uses a role not exported from a roles.ts`);
    const role = a.kind === "role" ? a : a.role;
    const service = role.service === undefined ? {} : { service: mountName(role.service, where) };
    if (a.kind === "role") return { kind: "role", role: name(a), ...service, ...via };
    return { kind: "role-of", role: name(a.role), path: a.path, ...service, ...via };
  };
  return allowedModel;
};
