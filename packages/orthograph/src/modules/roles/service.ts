import type { Via } from "#modules/plugins/types.js";
import type { State } from "#modules/machines/types.js";
import type { Field } from "#modules/things/types.js";
import type { Allowed, Narrowed, Role, RoleOf, RolesApi, ServiceRole, SignedIn } from "./types.ts";

const ALL_WAYS: ReadonlyArray<Via> = ["session", "key", "device", "agent"];

/** The kept ways, sorted and without repeats: what the model records. */
const kept = (ways: ReadonlyArray<Via>): ReadonlyArray<Via> => [...new Set(ways)].sort();

const narrow = <A>(entry: A, via: ReadonlyArray<Via>): Narrowed<A> => Object.freeze({ kind: "narrowed" as const, entry, via: kept(via) });

/** `.via` and `.notVia` for an entry that has a person in it. */
const narrowable = <A>(entry: () => A) => ({
  via: (...ways: ReadonlyArray<Via>) => narrow(entry(), ways),
  notVia: (...ways: ReadonlyArray<Via>) => narrow(entry(), ALL_WAYS.filter((w) => !ways.includes(w))),
});

const roleOf = (role: Role<any> | ServiceRole<any>, path: string): RoleOf<any, string> => {
  const of: RoleOf<any, string> = Object.freeze({ kind: "role-of" as const, role, path, ...narrowable(() => of) });
  return of;
};

/**
 * Whether some entry of `allowed` admits an agent (M2-auth, fork 2): `anyone`, or an entry with a person in it whose kept ways in include `agent`.
 * A service role, the system and the keeper never do. The MCP door lists an operation as a tool by this, and the compiler says it as `agentTool`.
 */
export const admitsAgent = (allowed: ReadonlyArray<Allowed>): boolean =>
  allowed.some((a) => {
    const entry = a.kind === "narrowed" ? a.entry : a;
    if (entry.kind === "anyone") return true;
    if (entry.kind === "system" || entry.kind === "keeper" || (entry.kind === "role" && (entry.service !== undefined || entry.actor !== undefined)) || (entry.kind === "role-of" && (entry.role.service !== undefined || entry.role.actor !== undefined))) return false;
    return a.kind !== "narrowed" || a.via.includes("agent");
  });

export const Roles: RolesApi = {
  role: ((thing: Role["thing"], spec: { readonly rule?: Role["rule"]; readonly service?: ServiceRole["service"]; readonly actor?: { readonly mount: Field; readonly id: Field }; readonly within?: Field; readonly while?: ReadonlyArray<State>; readonly agent?: Field }) => {
    const role: object = Object.freeze({
      kind: "role" as const,
      thing,
      // An account or an agent is matched by id at the door, never by a person's rule: a rule given a person admits no one.
      rule: spec.rule ?? (() => false),
      ...(spec.actor === undefined ? {} : { actor: Object.freeze({ mount: spec.actor.mount, id: spec.actor.id, within: spec.within, while: Object.freeze([...(spec.while ?? [])]) }) }),
      ...(spec.agent === undefined ? {} : { agent: spec.agent }),
      ...(spec.service === undefined ? {} : { service: spec.service }),
      of: (path: string): RoleOf<any, string> => roleOf(role as Role, path),
      ...(spec.service === undefined ? narrowable(() => role) : {}),
    });
    return role as unknown as Role | ServiceRole;
  }) as unknown as RolesApi["role"],
  anyone: Object.freeze({ kind: "anyone" }),
  signedIn: (() => {
    const signedIn: SignedIn = Object.freeze({ kind: "signed-in" as const, ...narrowable(() => signedIn) });
    return signedIn;
  })(),
  system: Object.freeze({ kind: "system" }),
  keeper: Object.freeze({ kind: "keeper" }),
};
