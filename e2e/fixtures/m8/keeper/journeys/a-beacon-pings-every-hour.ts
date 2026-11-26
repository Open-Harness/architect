// Journey-author file (M8.10, #1199). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The world starts at 2027-01-10T09:00:00.000Z, stepped. A clock step answers `{ now, fired }` (M8-checks call 2): `fired` lists every
// move made by time that ran on the way, in the order it ran, as `<thing>.<move> due <instant>`, and ` refused <name>` when the keeper's
// run was refused (CX-keeper call 7).
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { machine } from "../blueprint/things/beacon/machine.ts";
import { BeaconDoused, BeaconPinged } from "../blueprint/things/beacon/events.ts";
import douse from "../blueprint/things/beacon/verbs/douse.ts";
import get from "../blueprint/things/beacon/verbs/get.ts";

const fired = (a: { readonly fired: ReadonlyArray<{ readonly thing: string; readonly move: string; readonly due: string; readonly refused?: string }> }) =>
  a.fired.map((f) => `${f.thing}.${f.move} due ${f.due}${f.refused === undefined ? "" : ` refused ${f.refused}`}`);

// Check 3: `every` re-arms after each firing, from the due it fired (CX-keeper call 4); leaving the state drops the row.
export default Blueprint.journey("a beacon pings every hour until it is doused", {
  cast: { aaron: Blueprint.anyone },
  starts: "beacon-lit",
  steps: (s) => [
    s.step(
      "three hours pass in one step: it pings at ten, eleven and twelve, in order",
      s.clock.advance("3 hours"),
      expect((a) => a.now).toBe("2027-01-10T12:00:00.000Z"),
      expect(fired).toEqual(["beacon.ping due 2027-01-10T10:00:00.000Z", "beacon.ping due 2027-01-10T11:00:00.000Z", "beacon.ping due 2027-01-10T12:00:00.000Z"]),
      emits(BeaconPinged, { beacon: s.world.beacon, pings: 1n, at: "2027-01-10T10:00:00.000Z" }),
      machine.isIn(s.world.beacon, "lit"),
    ),
    s.step(
      "read back, three pings",
      s.aaron.run(get, { id: s.world.beacon }),
      expect((a) => [a.pings, a.state]).toEqual([3n, "lit"]),
      noEvents(),
    ),
    s.step(
      "half an hour on, aaron douses it",
      s.clock.advance("30 minutes"),
      expect(fired).toEqual([]),
      noEvents(),
    ),
    s.step(
      "aaron douses the beacon",
      s.aaron.run(douse, { beacon: s.world.beacon }),
      emits(BeaconDoused, { beacon: s.world.beacon }),
      machine.isIn(s.world.beacon, "dark"),
    ),
    s.step(
      "two more hours: no ping after it was doused",
      s.clock.advance("2 hours"),
      expect((a) => a.now).toBe("2027-01-10T14:30:00.000Z"),
      expect(fired).toEqual([]),
      noEvents(),
      machine.isIn(s.world.beacon, "dark"),
    ),
    s.step(
      "read back, still three",
      s.aaron.run(get, { id: s.world.beacon }),
      expect((a) => [a.pings, a.state]).toEqual([3n, "dark"]),
      noEvents(),
    ),
  ],
});
