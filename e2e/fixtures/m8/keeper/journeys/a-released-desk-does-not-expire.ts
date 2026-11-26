// Journey-author file (M8.10, #1199). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks call 2): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`, and ` refused <name>` when the keeper's
// run was refused (CX-keeper call 7).
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { machine } from "../blueprint/things/desk/machine.ts";
import { DeskReleased } from "../blueprint/things/desk/events.ts";
import release from "../blueprint/things/desk/verbs/release.ts";
import get from "../blueprint/things/desk/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}${f.refused === undefined ? "" : ` refused ${f.refused}`}`);

// Check 2: a thing that leaves the state before the move fires doesn't move. Leaving `held` drops the row (CX-keeper call 3).
export default Blueprint.journey("a desk released before the hour does not expire", {
  cast: { aaron: Blueprint.anyone },
  starts: "desk-held",
  steps: (s) => [
    s.step(
      "at half past nine it is still held",
      s.clock.moveTo("2027-01-10T09:30:00Z"),
      expect(fired).toEqual([]),
      noEvents(),
    ),
    s.step(
      "aaron releases it",
      s.aaron.run(release, { desk: s.world.desk }),
      emits(DeskReleased, { desk: s.world.desk }),
      machine.isIn(s.world.desk, "free"),
    ),
    s.step(
      "two hours pass, ten o'clock among them: nothing expires",
      s.clock.advance("2 hours"),
      expect((a) => a.now).toBe("2027-01-10T11:30:00.000Z"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.desk, "free"),
    ),
    s.step(
      "read back, free",
      s.aaron.run(get, { id: s.world.desk }),
      expect((a) => a.state).toBe("free"),
      noEvents(),
    ),
  ],
});
