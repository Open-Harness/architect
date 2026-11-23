import { Blueprint } from "orthograph";
import { Beacon } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Beacon, {
  states: ["lit"],
  moves: { light: { from: [], to: "lit", emits: Events.BeaconLit } },
  notFrom: { exit: 50 },
});
