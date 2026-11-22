// Journey-author file (M8.04). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`.
// `s.keeper.run(op, payload, { due })` fires a move made by time as the keeper does, for that due instant, with the
// keeper's own request key (thing, move and due instant, K23 section 3): a second keeper, or a retry.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { MembershipRenewed } from "../blueprint/things/membership/events.ts";
import renew from "../blueprint/things/membership/verbs/renew.ts";
import get from "../blueprint/things/membership/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}`);

export default Blueprint.journey("a renewal fired twice for one due instant renews once", {
  cast: { aaron: Blueprint.anyone, keeper: Blueprint.keeper },
  starts: "member-since-january",
  steps: (s) => [
    s.step(
      "a month passes and the world's keeper renews it",
      s.clock.advance("1 month"),
      expect(fired).toEqual(["membership.renew due 2027-02-10T09:00:00.000Z"]),
      emits(MembershipRenewed, { membership: s.world.membership, period: 2n, at: "2027-02-10T09:00:00.000Z" }),
    ),
    s.step(
      "a second keeper fires the same renewal for the same due instant: the first answer, and nothing new",
      s.keeper.run(renew, { membership: s.world.membership }, { due: "2027-02-10T09:00:00.000Z" }),
      expect((a) => [a.period, a.at]).toEqual([2n, "2027-02-10T09:00:00.000Z"]),
      noEvents(),
    ),
    s.step(
      "read back, renewed once",
      s.aaron.run(get, { id: s.world.membership }),
      expect((a) => [a.period, a.renewals]).toEqual([2n, 1n]),
      noEvents(),
    ),
  ],
});
