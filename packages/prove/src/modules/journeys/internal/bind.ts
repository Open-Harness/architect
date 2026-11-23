// A cast member whose role names no person (K40 fixes 1 and 3): `listed`, made with `actor:`, is the outside account the world's `account` is; `itsMain`
// and `itsAgent`, made with `agent:`, are the agent its superagent or ticket holds. The instance is the one the starting world gave under the role's thing's
// name (`s.world.account`, `s.world.superagent`, `s.world.ticket`), read from the world's facts, so a journey never writes an id for them.
import { Effect } from "effect";
import type { Principal, Role, Thing } from "orthograph";
import type { Facts } from "../types.ts";
import { mintCredential } from "./world.ts";

const nameOf = (thing: Thing, field: object | undefined): string | undefined => Object.keys(thing.fields).find((k) => thing.fields[k] === field);

/** Whether a cast member's role is one of the two that name no person. */
export const namesNoPerson = (role: { readonly kind?: string; readonly actor?: unknown; readonly agent?: unknown } | undefined): boolean =>
  role?.kind === "role" && (role.actor !== undefined || role.agent !== undefined);

export interface Bound {
  readonly principal: Principal;
  /** The world's token for the principal, or empty when the world gave no instance to bind it to. */
  readonly token: string;
  /** Why it is bound to no one, when it is not. */
  readonly problem?: string;
}

const NO_ONE = (problem: string): Bound => ({ principal: { kind: "anonymous" }, token: "", problem });

export const bind = (url: string, facts: Facts, tableOf: (thing: Thing) => string | undefined, world: Readonly<Record<string, unknown>>, role: Role): Effect.Effect<Bound> =>
  Effect.gen(function* () {
    const table = tableOf(role.thing);
    const id = table === undefined ? undefined : world[table];
    if (table === undefined || typeof id !== "string") return NO_ONE(`the starting world gave no s.world.${table ?? "?"}, which the role acts as`);
    const row = yield* facts.record(table, id);
    if (row === null) return NO_ONE(`s.world.${table} (${id}) is not in the world`);
    if (role.actor !== undefined) {
      const mount = row[nameOf(role.thing, role.actor.mount) ?? ""];
      const external = row[nameOf(role.thing, role.actor.id) ?? ""];
      if (typeof mount !== "string" || typeof external !== "string") return NO_ONE(`${table} ${id} holds no mount or outside id`);
      const token = (yield* mintCredential(url, { service: mount, actor: { id: external } })) ?? "";
      return { principal: { kind: "service", mount, actor: { id: external } }, token };
    }
    const agent = row[nameOf(role.thing, role.agent) ?? ""];
    if (typeof agent !== "string") return NO_ONE(`${table} ${id} holds no agent`);
    const token = (yield* mintCredential(url, { agent })) ?? "";
    return { principal: { kind: "agent", agent, via: "agent" }, token };
  });
