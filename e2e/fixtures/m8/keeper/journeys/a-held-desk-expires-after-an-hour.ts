// Journey-author file (M8.10, #1199). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks call 2): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`, and ` refused <name>` when the keeper's
// run was refused (CX-keeper call 7).
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { machine } from "../blueprint/things/desk/machine.ts";
import { DeskExpired } from "../blueprint/things/desk/events.ts";
import get from "../blueprint/things/desk/verbs/get.ts";
import expire from "../blueprint/things/desk/verbs/expire.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}${f.refused === undefined ? "" : ` refused ${f.refused}`}`);

// Check 1: a thing sits in a state with `after(1 hour)`, and it moves when the clock steps past the hour, at the hour.
export default Blueprint.journey("a held desk expires an hour after it was held", {
  cast: { aaron: Blueprint.anyone, keeper: Blueprint.keeper },
  starts: "desk-held",
  steps: (s) => [
    s.step(
      "fifty-nine minutes later it is still held",
      s.clock.advance("59 minutes"),
      expect((a) => a.now).toBe("2027-01-10T09:59:00.000Z"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.desk, "held"),
    ),
    s.step(
      "the clock steps past the hour: it expired at ten exactly",
      s.clock.advance("2 minutes"),
      expect((a) => a.now).toBe("2027-01-10T10:01:00.000Z"),
      expect(fired).toEqual(["desk.expire due 2027-01-10T10:00:00.000Z"]),
      emits(DeskExpired, { desk: s.world.desk, at: "2027-01-10T10:00:00.000Z" }),
      machine.isIn(s.world.desk, "expired"),
    ),
    s.step(
      "a day later nothing more fires",
      s.clock.advance("1 day"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.desk, "expired"),
    ),
    s.step(
      "a second keeper fires the same expiry for the same due: the first answer, and nothing new",
      s.keeper.run(expire, { desk: s.world.desk }, { due: "2027-01-10T10:00:00.000Z" }),
      expect((a) => a.at).toBe("2027-01-10T10:00:00.000Z"),
      noEvents(),
      machine.isIn(s.world.desk, "expired"),
    ),
    s.step(
      "read back, expired",
      s.aaron.run(get, { id: s.world.desk }),
      expect((a) => [a.heldAt, a.state]).toEqual(["2027-01-10T09:00:00.000Z", "expired"]),
      noEvents(),
    ),
  ],
});
