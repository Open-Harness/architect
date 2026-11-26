// Journey-author file (M8.10, #1199). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks call 2): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`, and ` refused <name>` when the keeper's
// run was refused (CX-keeper call 7).
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { machine } from "../blueprint/things/watch/machine.ts";
import { WatchObserved, WatchSnoozed } from "../blueprint/things/watch/events.ts";
import snooze from "../blueprint/things/watch/verbs/snooze.ts";
import get from "../blueprint/things/watch/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}${f.refused === undefined ? "" : ` refused ${f.refused}`}`);

// Check 6: when a self-move writes the field again, its `after` move fires again, at the new instant (CX-keeper call 5). A
// person's snooze moves the row; each keeper observe writes `nextCheckAt` forward one, two, then four hours; parking drops it.
export default Blueprint.journey("a watch backs off and parks", {
  cast: { aaron: Blueprint.anyone },
  starts: "watch-started",
  steps: (s) => [
    s.step(
      "at half past nine nothing has fired",
      s.clock.moveTo("2027-01-10T09:30:00Z"),
      expect(fired).toEqual([]),
      noEvents(),
    ),
    s.step(
      "aaron snoozes it: the next check is ten past ten",
      s.aaron.run(snooze, { watch: s.world.watch }),
      expect((a) => a.nextCheckAt).toBe("2027-01-10T10:10:00.000Z"),
      emits(WatchSnoozed, { watch: s.world.watch, nextCheckAt: "2027-01-10T10:10:00.000Z" }),
      machine.isIn(s.world.watch, "watching"),
    ),
    s.step(
      "ten o'clock passes and nothing fires: the snooze moved the check",
      s.clock.moveTo("2027-01-10T10:05:00Z"),
      expect(fired).toEqual([]),
      noEvents(),
    ),
    s.step(
      "to the next morning in one step: checks at ten past ten, ten past twelve and ten past four, then it parks",
      s.clock.moveTo("2027-01-11T09:00:00Z"),
      expect(fired).toEqual(["watch.observe due 2027-01-10T10:10:00.000Z", "watch.observe due 2027-01-10T12:10:00.000Z", "watch.observe due 2027-01-10T16:10:00.000Z"]),
      emits(WatchObserved, { watch: s.world.watch, checks: 1n, nextCheckAt: "2027-01-10T12:10:00.000Z" }),
      machine.isIn(s.world.watch, "parked"),
    ),
    s.step(
      "two days on, past the parked check's own instant: nothing fires",
      s.clock.advance("2 days"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.watch, "parked"),
    ),
    s.step(
      "read back: three checks, parked",
      s.aaron.run(get, { id: s.world.watch }),
      expect((a) => [a.checks, a.nextCheckAt, a.state]).toEqual([3n, "2027-01-11T16:10:00.000Z", "parked"]),
      noEvents(),
    ),
  ],
});
