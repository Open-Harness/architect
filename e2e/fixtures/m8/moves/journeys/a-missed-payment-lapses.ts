// Journey-author file (M8.04). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { machine } from "../blueprint/things/membership/machine.ts";
import { MembershipLapsed, PaymentMissed } from "../blueprint/things/membership/events.ts";
import miss from "../blueprint/things/membership/verbs/miss.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}`);

export default Blueprint.journey("a missed payment lapses fourteen days later", {
  cast: { aaron: Blueprint.anyone },
  starts: "member-since-january",
  steps: (s) => [
    s.step(
      "on 20 January at noon",
      s.clock.moveTo("2027-01-20T12:00:00Z"),
      expect(fired).toEqual([]),
      noEvents(),
    ),
    s.step(
      "the payment is missed",
      s.aaron.run(miss, { membership: s.world.membership }),
      expect((a) => a.overdueAt).toBe("2027-01-20T12:00:00.000Z"),
      emits(PaymentMissed, { membership: s.world.membership, overdueAt: "2027-01-20T12:00:00.000Z" }),
      machine.isIn(s.world.membership, "overdue"),
    ),
    s.step(
      "thirteen days later it is still overdue",
      s.clock.advance("13 days"),
      expect((a) => a.now).toBe("2027-02-02T12:00:00.000Z"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.membership, "overdue"),
    ),
    s.step(
      "on the fourteenth day, at noon, it lapses",
      s.clock.advance("1 day"),
      expect(fired).toEqual(["membership.lapse due 2027-02-03T12:00:00.000Z"]),
      emits(MembershipLapsed, { membership: s.world.membership, at: "2027-02-03T12:00:00.000Z" }),
      machine.isIn(s.world.membership, "lapsed"),
    ),
    s.step(
      "its renewal day passes and nothing renews: leaving active cleared that timer",
      s.clock.moveTo("2027-02-10T09:00:00Z"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.membership, "lapsed"),
    ),
  ],
});
