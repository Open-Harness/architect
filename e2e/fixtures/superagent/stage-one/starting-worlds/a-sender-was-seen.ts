// Checks-author file (Goal 17, slice 6). A builder never edits it.
// From an observing superagent: its Slack source has seen one person, U1, who is not yet listed.
import { Blueprint } from "orthograph";
import seen from "@orthograph/intake/blueprint/things/account/verbs/seen.ts";

export default Blueprint.startingWorld("a-sender-was-seen", {
  from: "an-observing-superagent",
  cast: { source: Blueprint.system },
  makes: (s) => [s.source.run(seen, { superagent: s.world.superagent, source: "slack", external: "U1", login: "ann", bot: false })],
  gives: (s) => ({ account: s.last.account }),
});
