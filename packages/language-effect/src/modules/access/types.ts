// Who may call: an operation's `allowed`, checked before its handler runs.
import type { Effect } from "effect";
import { NotAllowed, type Allowed, type Principal, type Role, type Thing } from "orthograph";
import type { Records } from "#modules/records/types.js";

/** The caller has none of the operation's roles. The handler never runs. Exit 3. Declared in blueprint for journeys. */
export { NotAllowed };

export interface AccessApi {
  /**
   * The roles the caller holds for this call: each role that an `allowed` entry names and that the caller satisfies, decided
   * the way `check` decides it. What a field `private` to roles is shown to (the MCP server's redaction, D3 #125); `anyone`
   * and `signedIn` are not roles, so a call allowed by them alone holds none.
   */
  readonly holds: (spec: {
    readonly allowed: ReadonlyArray<Allowed>;
    readonly payloadFields: { readonly [key: string]: unknown };
    readonly payload: object;
    readonly principal: Principal;
    readonly thing?: Thing;
    /** Each adapter's mount by the name it is mounted under: what a `service` role is read against. */
    readonly mounts?: ReadonlyMap<unknown, string>;
  }) => Effect.Effect<ReadonlyArray<Role>, never, Records>;
  /**
   * Allowed if any entry allows: anyone; anyone signed in; a bare role on the operation's own subject (`grantee`);
   * or a role on the thing a path points at, from a payload field or, failing that, from the subject.
   */
  readonly check: (spec: {
    readonly allowed: ReadonlyArray<Allowed>;
    readonly payloadFields: { readonly [key: string]: unknown };
    readonly payload: object;
    readonly principal: Principal;
    /** The operation's own thing: its instance named in the payload is the subject. */
    readonly thing?: Thing;
    readonly mounts?: ReadonlyMap<unknown, string>;
  }) => Effect.Effect<void, NotAllowed, Records>;
}
