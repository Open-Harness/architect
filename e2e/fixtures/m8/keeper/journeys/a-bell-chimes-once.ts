// Journey-author file (M8.10, #1199). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks call 2): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`, and ` refused <name>` when the keeper's
// run was refused (CX-keeper call 7).
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { machine } from "../blueprint/things/bell/machine.ts";
import { BellChimed } from "../blueprint/things/bell/events.ts";
import get from "../blueprint/things/bell/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}${f.refused === undefined ? "" : ` refused ${f.refused}`}`);

// A due that fired is never armed again (CX-keeper call 3): `chime` stays in `ringing` and leaves `setAt` alone, so working its due
// out again after its own commit gives ten o'clock, which has fired. A keeper without that rule chimes again and again.
export default Blueprint.journey("a bell set for an hour chimes once", {
  cast: { aaron: Blueprint.anyone },
  starts: "bell-set",
  steps: (s) => [
    s.step(
      "three hours pass: it chimed at ten, once",
      s.clock.advance("3 hours"),
      expect((a) => a.now).toBe("2027-01-10T12:00:00.000Z"),
      expect(fired).toEqual(["bell.chime due 2027-01-10T10:00:00.000Z"]),
      emits(BellChimed, { bell: s.world.bell, chimes: 1n }),
      machine.isIn(s.world.bell, "ringing"),
    ),
    s.step(
      "read back, one chime",
      s.aaron.run(get, { id: s.world.bell }),
      expect((a) => [a.setAt, a.chimes, a.state]).toEqual(["2027-01-10T09:00:00.000Z", 1n, "ringing"]),
      noEvents(),
    ),
  ],
});
