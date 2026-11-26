// Journey-author file (M8.10, #1199). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks call 2): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`, and ` refused <name>` when the keeper's
// run was refused (CX-keeper call 7).
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { MeterFreed, MeterJams, MeterTicked } from "../blueprint/things/meter/events.ts";
import jam from "../blueprint/things/meter/verbs/jam.ts";
import free from "../blueprint/things/meter/verbs/free.ts";
import get from "../blueprint/things/meter/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}${f.refused === undefined ? "" : ` refused ${f.refused}`}`);

// A refused `every` firing still re-arms from its due (CX-keeper call 4): the ten o'clock reading is refused, and the eleven
// o'clock one runs, though no committed move came between them.
export default Blueprint.journey("a jammed meter is read again the next hour", {
  cast: { aaron: Blueprint.anyone },
  starts: "meter-started",
  steps: (s) => [
    s.step(
      "aaron jams the meter at nine",
      s.aaron.run(jam, { meter: s.world.meter }),
      emits(MeterJams, { meter: s.world.meter }),
    ),
    s.step(
      "at half past ten: the ten o'clock reading was refused, and nothing was written",
      s.clock.moveTo("2027-01-10T10:30:00Z"),
      expect(fired).toEqual(["meter.tick due 2027-01-10T10:00:00.000Z refused MeterJammed"]),
      noEvents(),
    ),
    s.step(
      "aaron frees it",
      s.aaron.run(free, { meter: s.world.meter }),
      emits(MeterFreed, { meter: s.world.meter }),
    ),
    s.step(
      "at eleven it is read again, on the hour",
      s.clock.moveTo("2027-01-10T11:00:00Z"),
      expect(fired).toEqual(["meter.tick due 2027-01-10T11:00:00.000Z"]),
      emits(MeterTicked, { meter: s.world.meter, ticks: 1n, at: "2027-01-10T11:00:00.000Z" }),
    ),
    s.step(
      "read back: one reading",
      s.aaron.run(get, { id: s.world.meter }),
      expect((a) => [a.jammed, a.ticks, a.state]).toEqual([0n, 1n, "running"]),
      noEvents(),
    ),
  ],
});
