import { Blueprint } from "orthograph";
import { accountSeen } from "../../kit/ops.ts";
import { ANN } from "../../kit/consts.ts";

/** The source has seen ann's GitHub account (K40 fix 1): the door makes it, a person lists it. */
export default Blueprint.startingWorld("an-account-was-seen", {
  from: "a-live-superagent",
  cast: { sys: Blueprint.system },
  makes: (s) => [s.sys.run(accountSeen, { superagent: s.world.superagent, source: ANN.source, external: ANN.external, login: ANN.login, bot: false })],
  gives: (s) => ({ main: s.world.main, superagent: s.world.superagent, account: s.last.account }),
});
