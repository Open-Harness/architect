// Journey-author file (M8.10, #1199). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks call 2): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`, and ` refused <name>` when the keeper's
// run was refused (CX-keeper call 7).
import { Blueprint, expect, noEvents } from "orthograph";
import { machine } from "../blueprint/things/desk/machine.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}${f.refused === undefined ? "" : ` refused ${f.refused}`}`);

// Check 5, first half: this journey arms a keeper row due at ten and ends before it fires. Its world is its own (M8-checks call 3),
// so the row must never fire in another journey's world (CX-keeper call 8): "a fresh world fires nothing armed in another" reads that.
export default Blueprint.journey("a desk left held when the journey ends", {
  cast: { aaron: Blueprint.anyone },
  starts: "desk-held",
  steps: (s) => [
    s.step(
      "half an hour passes: the desk is still held, its expiry due at ten",
      s.clock.advance("30 minutes"),
      expect((a) => a.now).toBe("2027-01-10T09:30:00.000Z"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.desk, "held"),
    ),
  ],
});
