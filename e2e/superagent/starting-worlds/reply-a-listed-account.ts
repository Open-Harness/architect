import { Blueprint } from "orthograph";
import accountSeen from "@orthograph/intake/blueprint/things/account/verbs/seen.ts";
import accountList from "@orthograph/intake/blueprint/things/account/verbs/list.ts";

/** The source has seen ann's GitHub account (K40 fix 1) and a person has listed it; the world gives its id for the accept. */
export default Blueprint.startingWorld("reply-a-listed-account", {
  from: "reply-a-live-superagent",
  cast: { sys: Blueprint.system, ann: Blueprint.signedIn },
  makes: (s) => [
    s.sys.run(accountSeen, { superagent: s.world.superagent, source: "github", external: "583231", login: "ann", bot: false }),
    s.ann.run(accountList, { account: s.last.account }),
  ],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.last.account }),
});
