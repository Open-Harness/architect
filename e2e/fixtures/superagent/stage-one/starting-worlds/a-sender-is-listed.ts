// Checks-author file (Goal 17, slice 6). A builder never edits it.
// From a seen sender: ada saves the superagent's first policy (observe) and lists U1, so U1's words may start work.
import { Blueprint } from "orthograph";
import save from "@orthograph/intake/blueprint/things/policy/verbs/save.ts";
import list from "@orthograph/intake/blueprint/things/account/verbs/list.ts";

export default Blueprint.startingWorld("a-sender-is-listed", {
  from: "a-sender-was-seen",
  cast: { ada: Blueprint.signedIn },
  makes: (s) => [
    s.ada.run(save, { superagent: s.world.superagent, base: 0n, mode: "observe", allowed: [], bots: [], admission: {}, rules: [] }),
    s.ada.run(list, { account: s.world.account }),
  ],
  gives: () => ({}),
});
