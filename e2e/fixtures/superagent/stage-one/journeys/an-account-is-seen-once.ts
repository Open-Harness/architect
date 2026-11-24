// Checks-author file (Goal 17, slice 6). A builder never edits it.
// K40 fix 1 and GOAL17-account-key: an Account is one outside account of one superagent's source, keyed by its outside id
// (`external`). Seeing it again is the same account in the state it was in; only a person lists and unlists it.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { AccountListed, AccountSeen, AccountUnlisted } from "@orthograph/intake/blueprint/things/account/events.ts";
import { machine } from "@orthograph/intake/blueprint/things/account/machine.ts";
import seen from "@orthograph/intake/blueprint/things/account/verbs/seen.ts";
import list from "@orthograph/intake/blueprint/things/account/verbs/list.ts";
import unlist from "@orthograph/intake/blueprint/things/account/verbs/unlist.ts";

export default Blueprint.journey("an account is seen once", {
  cast: { ada: Blueprint.signedIn, source: Blueprint.system },
  starts: "a-sender-was-seen-beside-another-superagent",
  steps: (s) => [
    s.step(
      "the source sees the account again before anyone lists it: the same account, still seen, nothing recorded",
      s.source.run(seen, { superagent: s.world.superagent, source: "slack", external: "U1", login: "ann", bot: false }),
      expect((a) => a.account).toBe(s.world.account),
      noEvents(),
      machine.isIn(s.world.account, "seen"),
    ),
    s.step(
      "ada lists it: its person's words may start work",
      s.ada.run(list, { account: s.world.account }),
      emits(AccountListed, { account: s.world.account }),
      machine.isIn(s.world.account, "listed"),
    ),
    s.step(
      "the source sees it again, under a new login: the same account, still listed, nothing recorded",
      s.source.run(seen, { superagent: s.world.superagent, source: "slack", external: "U1", login: "ann-renamed", bot: false }),
      expect((a) => a.account).toBe(s.world.account),
      noEvents(),
      machine.isIn(s.world.account, "listed"),
    ),
    s.step(
      "listing a listed account is refused",
      s.ada.run(list, { account: s.world.account }),
      refuses(machine.notFrom, { state: "listed" }),
      noEvents(),
    ),
    s.step(
      "ada stops letting it ask",
      s.ada.run(unlist, { account: s.world.account }),
      emits(AccountUnlisted, { account: s.world.account }),
      machine.isIn(s.world.account, "unlisted"),
    ),
    s.step(
      "the source sees an unlisted account again: it stays unlisted, nothing recorded",
      s.source.run(seen, { superagent: s.world.superagent, source: "slack", external: "U1", login: "ann", bot: false }),
      expect((a) => a.account).toBe(s.world.account),
      noEvents(),
      machine.isIn(s.world.account, "unlisted"),
    ),
    s.step(
      "an unlisted account can be listed again",
      s.ada.run(list, { account: s.world.account }),
      emits(AccountListed, { account: s.world.account }),
      machine.isIn(s.world.account, "listed"),
    ),
    s.step(
      "the same outside id on another source is another account, and the first stays listed",
      s.source.run(seen, { superagent: s.world.superagent, source: "github", external: "U1", login: "ann", bot: false }),
      emits(AccountSeen, { superagent: s.world.superagent }),
      machine.isIn(s.last.account, "seen"),
      machine.isIn(s.world.account, "listed"),
    ),
    s.step(
      "the same outside id on another superagent is another account, and the first stays listed",
      s.source.run(seen, { superagent: s.world.other, source: "slack", external: "U1", login: "ann", bot: false }),
      emits(AccountSeen, { superagent: s.world.other }),
      machine.isIn(s.last.account, "seen"),
      machine.isIn(s.world.account, "listed"),
    ),
    s.step(
      "a person cannot record an account a source saw",
      s.ada.run(seen, { superagent: s.world.superagent, source: "slack", external: "U9", login: "nobody", bot: false }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
  ],
});
