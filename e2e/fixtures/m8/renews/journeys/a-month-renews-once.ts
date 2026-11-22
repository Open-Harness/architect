// Journey-author file (M8.02). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped (blueprint/environments/local.ts); aaron joined then.
// `s.clock.advance(span)` answers `{ now, fired }` once the world is quiet at the target: `now` is the world's instant,
// `fired` every move made by time that ran on the way, in order, as `{ thing, move, due }` (M8-checks).
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { machine } from "../blueprint/things/membership/machine.ts";
import { MembershipRenewed } from "../blueprint/things/membership/events.ts";
import get from "../blueprint/things/membership/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}`);

export default Blueprint.journey("a month renews once", {
  cast: { aaron: Blueprint.anyone },
  starts: "member-since-january",
  steps: (s) => [
    s.step(
      "on the day it starts, nothing has renewed",
      s.aaron.run(get, { id: s.world.membership }),
      expect((a) => [a.startedAt, a.period, a.renewals, a.state]).toEqual(["2027-01-10T09:00:00.000Z", 1n, 0n, "active"]),
      noEvents(),
    ),
    s.step(
      "a month passes and it renews once, on 10 February at nine",
      s.clock.advance("1 month"),
      expect((a) => a.now).toBe("2027-02-10T09:00:00.000Z"),
      expect(fired).toEqual(["membership.renew due 2027-02-10T09:00:00.000Z"]),
      emits(MembershipRenewed, { membership: s.world.membership, period: 2n, at: "2027-02-10T09:00:00.000Z" }),
    ),
    s.step(
      "read back, it has renewed exactly once",
      s.aaron.run(get, { id: s.world.membership }),
      expect((a) => [a.startedAt, a.period, a.renewals, a.state]).toEqual(["2027-01-10T09:00:00.000Z", 2n, 1n, "active"]),
      machine.isIn(s.world.membership, "active"),
      noEvents(),
    ),
    s.step(
      "fifteen days more change nothing",
      s.clock.advance("15 days"),
      expect((a) => a.now).toBe("2027-02-25T09:00:00.000Z"),
      expect(fired).toEqual([]),
      noEvents(),
    ),
    s.step(
      "read back, still one renewal",
      s.aaron.run(get, { id: s.world.membership }),
      expect((a) => [a.period, a.renewals]).toEqual([2n, 1n]),
      noEvents(),
    ),
  ],
});
