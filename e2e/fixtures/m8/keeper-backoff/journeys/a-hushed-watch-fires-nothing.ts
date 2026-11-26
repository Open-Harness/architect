// Journey-author file (M8.10, #1199). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks call 2): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`, and ` refused <name>` when the keeper's
// run was refused (CX-keeper call 7).
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { machine } from "../blueprint/things/watch/machine.ts";
import { WatchHushed } from "../blueprint/things/watch/events.ts";
import hush from "../blueprint/things/watch/verbs/hush.ts";
import get from "../blueprint/things/watch/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}${f.refused === undefined ? "" : ` refused ${f.refused}`}`);

// Check 7: a move that clears the field drops the row, so nothing fires (CX-keeper calls 3 and 5). The watch stays in `watching`,
// a `from` state of `observe`, so only the empty field can stop the ten o'clock check.
export default Blueprint.journey("a hushed watch fires nothing", {
  cast: { aaron: Blueprint.anyone },
  starts: "watch-started",
  steps: (s) => [
    s.step(
      "at nine aaron hushes it",
      s.aaron.run(hush, { watch: s.world.watch }),
      emits(WatchHushed, { watch: s.world.watch }),
      machine.isIn(s.world.watch, "watching"),
    ),
    s.step(
      "read back: watching, with no next check",
      s.aaron.run(get, { id: s.world.watch }),
      expect((a) => [a.nextCheckAt ?? "none", a.checks, a.state]).toEqual(["none", 0n, "watching"]),
      noEvents(),
    ),
    s.step(
      "a day passes, ten o'clock among it: nothing fires, and it is still watching",
      s.clock.advance("1 day"),
      expect((a) => a.now).toBe("2027-01-11T09:00:00.000Z"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.watch, "watching"),
    ),
  ],
});
