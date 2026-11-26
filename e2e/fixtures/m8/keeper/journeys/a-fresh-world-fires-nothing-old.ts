// Journey-author file (M8.10, #1199). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks call 2): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`, and ` refused <name>` when the keeper's
// run was refused (CX-keeper call 7).
import { Blueprint, expect, noEvents } from "orthograph";
import hold from "../blueprint/things/desk/verbs/hold.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}${f.refused === undefined ? "" : ` refused ${f.refused}`}`);

// Check 5, second half: a world of its own from the environment's start. Rows armed in other journeys' worlds (the desk "a desk
// left held" holds, due at ten) never fire here: the first step crosses ten and fires nothing; the last fires only its own.
export default Blueprint.journey("a fresh world fires nothing armed in another", {
  cast: { aaron: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "its clock starts at nine; two hours pass and nothing fires",
      s.clock.advance("2 hours"),
      expect((a) => a.now).toBe("2027-01-10T11:00:00.000Z"),
      expect(fired).toEqual([]),
      noEvents(),
    ),
    s.step(
      "aaron holds a desk at eleven",
      s.aaron.run(hold, { name: "Corner" }),
      expect((a) => a.heldAt).toBe("2027-01-10T11:00:00.000Z"),
    ),
    s.step(
      "an hour later exactly one desk expires: the one held here, at noon",
      s.clock.advance("1 hour"),
      expect((a) => a.now).toBe("2027-01-10T12:00:00.000Z"),
      expect(fired).toEqual(["desk.expire due 2027-01-10T12:00:00.000Z"]),
    ),
  ],
});
