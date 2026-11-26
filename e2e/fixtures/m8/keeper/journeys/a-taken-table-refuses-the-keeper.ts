// Journey-author file (M8.10, #1199). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks call 2): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`, and ` refused <name>` when the keeper's
// run was refused (CX-keeper call 7).
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { machine } from "../blueprint/things/booking/machine.ts";
import { BookingSeated } from "../blueprint/things/booking/events.ts";
import get from "../blueprint/things/booking/verbs/get.ts";
import seat from "../blueprint/things/booking/verbs/seat.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}${f.refused === undefined ? "" : ` refused ${f.refused}`}`);

// Check 4: a keeper move refused by a G5 rule writes nothing, keeps its state, and is not retried (CX-keeper calls 3 and 6). Its
// deciding log is judged by eval 9 on the keeper's run, which prove records as a call (CX-keeper call 7): the check reads
// `booking.seat explainability ✔` and `booking.seat coverage ✔`, and only a keeper run can refuse `TableTaken` here.
export default Blueprint.journey("the keeper is refused a taken table", {
  cast: { aaron: Blueprint.anyone, bea: Blueprint.anyone },
  starts: "table-seven-booked-twice",
  steps: (s) => [
    s.step(
      "bea cannot seat her own booking: only the keeper may",
      s.bea.run(seat, { booking: s.world.second }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.world.second, "waiting"),
    ),
    s.step(
      "at ten the keeper seats aaron's booking",
      s.clock.moveTo("2027-01-10T10:00:00Z"),
      expect(fired).toEqual(["booking.seat due 2027-01-10T10:00:00.000Z"]),
      emits(BookingSeated, { booking: s.world.first, at: "2027-01-10T10:00:00.000Z" }),
      machine.isIn(s.world.first, "seated"),
    ),
    s.step(
      "at half past ten it would seat bea's at the same table: refused TableTaken, and nothing is written",
      s.clock.moveTo("2027-01-10T10:30:00Z"),
      expect(fired).toEqual(["booking.seat due 2027-01-10T10:30:00.000Z refused TableTaken"]),
      noEvents(),
      machine.isIn(s.world.second, "waiting"),
    ),
    s.step(
      "read back bea's: waiting, never seated",
      s.bea.run(get, { id: s.world.second }),
      expect((a) => [a.table, a.waitingSince, a.seats, a.state]).toEqual(["7", "2027-01-10T09:30:00.000Z", 0n, "waiting"]),
      noEvents(),
    ),
    s.step(
      "a day passes: the refused move is not tried again",
      s.clock.advance("1 day"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.second, "waiting"),
    ),
    s.step(
      "read back aaron's: seated once",
      s.aaron.run(get, { id: s.world.first }),
      expect((a) => [a.table, a.seats, a.state]).toEqual(["7", 1n, "seated"]),
      noEvents(),
    ),
  ],
});
