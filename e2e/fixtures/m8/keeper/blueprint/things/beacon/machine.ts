import { Blueprint } from "orthograph";
import { Beacon } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Beacon, {
  states: ["lit", "dark"],
  moves: {
    light: { from: [], to: "lit", emits: Events.BeaconLit },
    // Every hour from the moment it was lit: each firing re-arms the next (CX-keeper call 4); dousing drops the row.
    ping: { from: ["lit"], to: "lit", emits: Events.BeaconPinged, by: Blueprint.time.every("1 hour", { from: "litAt" }) },
    // A person's self-move: it keeps the `every` row as it is (CX-keeper call 4), so the next ping stays on the hour.
    tend: { from: ["lit"], to: "lit", emits: Events.BeaconTended },
    douse: { from: ["lit"], to: "dark", emits: Events.BeaconDoused },
  },
  notFrom: { exit: 91 },
});
