import { Blueprint } from "orthograph";
import accountList from "@orthograph/intake/blueprint/things/account/verbs/list.ts";

/** A person has listed ann's seen account; the world gives its id for the accept. `account.list` answers `{}`, so the id comes from the world before. */
export default Blueprint.startingWorld("reply-a-listed-account", {
  from: "reply-an-account-was-seen",
  cast: { ann: Blueprint.signedIn },
  makes: (s) => [s.ann.run(accountList, { account: s.world.account })],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.world.account }),
});
