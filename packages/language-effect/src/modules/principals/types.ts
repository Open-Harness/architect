// Who is calling. The host turns a request's credentials into a principal before any role or handler sees it.
import { Context, type Effect } from "effect";
import type { Principal } from "orthograph";

/** Where a request came in: the HTTP API, or the MCP server. */
export type PrincipalDoor = "api" | "mcp";

export class Principals extends Context.Service<Principals, {
  /**
   * The principal behind an `Authorization` header, or anonymous. A bad credential is anonymous, never an error. `door` is where the
   * request came in (M2-auth, "Smaller calls" 3): at `mcp` every credential makes an agent for its person; at `api`, the default,
   * a credential made for an agent is one, and the rest are people by the way they signed in.
   */
  readonly of: (authorization: string | undefined, door?: PrincipalDoor) => Effect.Effect<Principal>;
}>()("@orthograph/language-effect/Principals") {}
