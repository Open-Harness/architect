// Journey-author file (M8.04). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { machine } from "../blueprint/things/membership/machine.ts";
import { MembershipRenewed, PaymentMade } from "../blueprint/things/membership/events.ts";
import miss from "../blueprint/things/membership/verbs/miss.ts";
import pay from "../blueprint/things/membership/verbs/pay.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}`);

export default Blueprint.journey("paying in time clears the lapse", {
  cast: { aaron: Blueprint.anyone },
  starts: "member-since-january",
  steps: (s) => [
    s.step("on 20 January at noon", s.clock.moveTo("2027-01-20T12:00:00Z"), expect(fired).toEqual([]), noEvents()),
    s.step("the payment is missed", s.aaron.run(miss, { membership: s.world.membership }), machine.isIn(s.world.membership, "overdue")),
    s.step("a week later", s.clock.advance("7 days"), expect(fired).toEqual([]), noEvents()),
    s.step(
      "the payment is made",
      s.aaron.run(pay, { membership: s.world.membership }),
      emits(PaymentMade, { membership: s.world.membership }),
      machine.isIn(s.world.membership, "active"),
    ),
    s.step(
      "3 February passes, when it would have lapsed: nothing happens",
      s.clock.moveTo("2027-02-09T09:00:00Z"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.membership, "active"),
    ),
    s.step(
      "active again, it renews on its day, 10 February",
      s.clock.advance("1 day"),
      expect(fired).toEqual(["membership.renew due 2027-02-10T09:00:00.000Z"]),
      emits(MembershipRenewed, { membership: s.world.membership, period: 2n, at: "2027-02-10T09:00:00.000Z" }),
    ),
  ],
});
