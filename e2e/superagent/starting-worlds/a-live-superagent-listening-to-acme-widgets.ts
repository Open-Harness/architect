import { Blueprint } from "orthograph";
import accountSeen from "@orthograph/intake/blueprint/things/account/verbs/seen.ts";
import accountList from "@orthograph/intake/blueprint/things/account/verbs/list.ts";

/** The coder is live, and ann (GitHub 583231) is a listed account of it: a mention of hers on acme/widgets may start work. */
export default Blueprint.startingWorld("a-live-superagent-listening-to-acme-widgets", {
  from: "reply-a-live-superagent",
  cast: { sys: Blueprint.system, ann: Blueprint.signedIn },
  makes: (s) => [
    s.sys.run(accountSeen, { superagent: s.world.superagent, source: "github", external: "583231", login: "ann", bot: false }),
    s.ann.run(accountList, { account: s.last.account }),
  ],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent }),
});
