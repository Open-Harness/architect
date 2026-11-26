import { Blueprint } from "orthograph";
import { Meter } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Meter, {
  states: ["running"],
  moves: {
    start: { from: [], to: "running", emits: Events.MeterStarted },
    jam: { from: ["running"], to: "running", emits: Events.MeterJams },
    free: { from: ["running"], to: "running", emits: Events.MeterFreed },
    // Every hour from `startedAt`. A refused reading still re-arms from its due (CX-keeper call 4): the cadence goes on.
    tick: { from: ["running"], to: "running", emits: Events.MeterTicked, by: Blueprint.time.every("1 hour", { from: "startedAt" }) },
  },
  notFrom: { exit: 95 },
});
