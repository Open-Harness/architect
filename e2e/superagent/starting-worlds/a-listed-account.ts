import { Blueprint } from "orthograph";
import { accountList } from "../../kit/ops.ts";

export default Blueprint.startingWorld("a-listed-account", {
  from: "an-account-was-seen",
  cast: { ann: Blueprint.signedIn },
  makes: (s) => [s.ann.run(accountList, { account: s.world.account })],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.world.account }),
});
