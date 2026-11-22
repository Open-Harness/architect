// Journey-author file (M8.04). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`.
import { Blueprint, expect, noEvents, refuses } from "orthograph";
import { machine } from "../blueprint/things/membership/machine.ts";
import join from "../blueprint/things/membership/verbs/join.ts";
import miss from "../blueprint/things/membership/verbs/miss.ts";
import renew from "../blueprint/things/membership/verbs/renew.ts";
import pay from "../blueprint/things/membership/verbs/pay.ts";
import open from "../blueprint/things/purse/verbs/open.ts";
import spend from "../blueprint/things/purse/verbs/spend.ts";
import openBudget from "../blueprint/things/budget/verbs/open.ts";
import get from "../blueprint/things/membership/verbs/get.ts";

// The keeper is a built-in system principal that can call only moves made by time (K23 section 3), even an operation
// open to anyone; and no one else can call a move made by time.
export default Blueprint.journey("the keeper calls nothing else", {
  cast: { aaron: Blueprint.anyone, keeper: Blueprint.keeper },
  starts: "member-since-january",
  steps: (s) => [
    s.step("the keeper cannot join, though anyone may", s.keeper.run(join, { name: "Keeper" }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("the keeper cannot open a purse", s.keeper.run(open, { limit: 1n }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("the keeper cannot open a budget", s.keeper.run(openBudget, { title: "Keeper's" }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "the keeper cannot mark a payment missed",
      s.keeper.run(miss, { membership: s.world.membership }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.world.membership, "active"),
    ),
    s.step("the keeper cannot pay", s.keeper.run(pay, { membership: s.world.membership }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("aaron opens a purse", s.aaron.run(open, { limit: 10n }), expect((a) => a.purse).toMatch(/^pur_/)),
    s.step("the keeper cannot spend from it", s.keeper.run(spend, { purse: s.last.purse, amount: 1n }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("aaron cannot renew: only the keeper may", s.aaron.run(renew, { membership: s.world.membership }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "read back, untouched",
      s.aaron.run(get, { id: s.world.membership }),
      expect((a) => [a.period, a.renewals, a.state]).toEqual([1n, 0n, "active"]),
      noEvents(),
    ),
  ],
});
