// Journey-author file (M8.04). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { MembershipRenewed } from "../blueprint/things/membership/events.ts";
import get from "../blueprint/things/membership/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}`);

// Joined on the 31st: February has no 31st, so it renews on the 28th; March goes back to the 31st; April has 30 days.
export default Blueprint.journey("renewals keep the day they started", {
  cast: { aaron: Blueprint.anyone },
  starts: "member-since-the-31st",
  steps: (s) => [
    s.step(
      "it started on 31 January at nine",
      s.aaron.run(get, { id: s.world.membership }),
      expect((a) => [a.startedAt, a.period, a.renewals]).toEqual(["2027-01-31T09:00:00.000Z", 1n, 0n]),
      noEvents(),
    ),
    s.step(
      "February has no 31st: it renews on the 28th",
      s.clock.moveTo("2027-02-28T09:00:00Z"),
      expect((a) => a.now).toBe("2027-02-28T09:00:00.000Z"),
      expect(fired).toEqual(["membership.renew due 2027-02-28T09:00:00.000Z"]),
      emits(MembershipRenewed, { membership: s.world.membership, period: 2n, at: "2027-02-28T09:00:00.000Z" }),
    ),
    s.step(
      "the date does not drift to the 28th: nothing on 30 March",
      s.clock.moveTo("2027-03-30T09:00:00Z"),
      expect(fired).toEqual([]),
      noEvents(),
    ),
    s.step(
      "back to the 31st in March, then the 30th in April, in order, in one move",
      s.clock.moveTo("2027-04-30T09:00:00Z"),
      expect((a) => a.now).toBe("2027-04-30T09:00:00.000Z"),
      expect(fired).toEqual(["membership.renew due 2027-03-31T09:00:00.000Z", "membership.renew due 2027-04-30T09:00:00.000Z"]),
      // `emits` judges the first event of its name: March's. April's is pinned by `fired` and the read that follows.
      emits(MembershipRenewed, { membership: s.world.membership, period: 3n, at: "2027-03-31T09:00:00.000Z" }),
    ),
    s.step(
      "read back, three renewals",
      s.aaron.run(get, { id: s.world.membership }),
      expect((a) => [a.period, a.renewals, a.state]).toEqual([4n, 3n, "active"]),
      noEvents(),
    ),
    s.step(
      "to March 2028 in one move: the 30th in each short month, and 29 February in a leap year",
      s.clock.moveTo("2028-03-01T00:00:00Z"),
      expect(fired).toEqual([
        "membership.renew due 2027-05-31T09:00:00.000Z", "membership.renew due 2027-06-30T09:00:00.000Z",
        "membership.renew due 2027-07-31T09:00:00.000Z", "membership.renew due 2027-08-31T09:00:00.000Z",
        "membership.renew due 2027-09-30T09:00:00.000Z", "membership.renew due 2027-10-31T09:00:00.000Z",
        "membership.renew due 2027-11-30T09:00:00.000Z", "membership.renew due 2027-12-31T09:00:00.000Z",
        "membership.renew due 2028-01-31T09:00:00.000Z", "membership.renew due 2028-02-29T09:00:00.000Z",
      ]),
      emits(MembershipRenewed, { membership: s.world.membership, period: 5n, at: "2027-05-31T09:00:00.000Z" }),
    ),
    s.step(
      "read back, thirteen renewals",
      s.aaron.run(get, { id: s.world.membership }),
      expect((a) => [a.period, a.renewals, a.state]).toEqual([14n, 13n, "active"]),
      noEvents(),
    ),
  ],
});
