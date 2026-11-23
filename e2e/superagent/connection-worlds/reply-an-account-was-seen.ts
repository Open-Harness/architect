import { Blueprint } from "orthograph";
import accountSeen from "@orthograph/intake/blueprint/things/account/verbs/seen.ts";

/** The source has seen ann's GitHub account (K40 fix 1); nobody has listed it yet. */
export default Blueprint.startingWorld("reply-an-account-was-seen", {
  from: "reply-a-live-superagent",
  cast: { sys: Blueprint.system },
  makes: (s) => [s.sys.run(accountSeen, { superagent: s.world.superagent, source: "github", external: "583231", login: "ann", bot: false })],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.last.account }),
});
