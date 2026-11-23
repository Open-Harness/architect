// Checks-author file (Goal 17, slice 6). A builder never edits it.
// From an observing superagent: ada saves its first policy (observe, with the bot UB1 on the Slack bot list), and its Slack
// source has seen four accounts: U1, whom ada lists; U2, a stranger; UB1, a bot on the list; UB2, a bot not on it.
import { Blueprint } from "orthograph";
import save from "@orthograph/intake/blueprint/things/policy/verbs/save.ts";
import seen from "@orthograph/intake/blueprint/things/account/verbs/seen.ts";
import list from "@orthograph/intake/blueprint/things/account/verbs/list.ts";

export default Blueprint.startingWorld("a-person-a-stranger-and-two-bots", {
  from: "an-observing-superagent",
  cast: { ada: Blueprint.signedIn, source: Blueprint.system },
  makes: (s) => [
    s.ada.run(save, { superagent: s.world.superagent, base: 0n, mode: "observe", allowed: [], bots: ["slack:UB1"], admission: {}, rules: [] }),
    s.source.run(seen, { superagent: s.world.superagent, source: "slack", external: "U1", login: "ann", bot: false }),
    s.ada.run(list, { account: s.last.account }),
    s.source.run(seen, { superagent: s.world.superagent, source: "slack", external: "U2", login: "stranger", bot: false }),
    s.source.run(seen, { superagent: s.world.superagent, source: "slack", external: "UB1", login: "reviewer-bot", bot: true }),
    s.source.run(seen, { superagent: s.world.superagent, source: "slack", external: "UB2", login: "other-bot", bot: true }),
    // seen again, last: the same account (an-account-is-seen-once), so the world can give U1's id
    s.source.run(seen, { superagent: s.world.superagent, source: "slack", external: "U1", login: "ann", bot: false }),
  ],
  gives: (s) => ({ account: s.last.account }),
});
