// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { treasury } from "../things/allowance/roles.ts";

/**
 * From the `safe` adapter's world (slice 7, M6-chain "The budgets example"): a Safe owned by ada, with the budgets module
 * enabled and a test token minted to it. Nothing is granted yet. It makes nothing of its own, so it is only a name for
 * what the adapter gives: the Safe and its token.
 */
export default Blueprint.startingWorld("funded", {
  from: "safe",
  cast: { ada: treasury }, // ada acts as the Safe, through its owners
  makes: () => [],
  gives: (s) => ({ safe: s.world.safe, token: s.world.token }),
});
