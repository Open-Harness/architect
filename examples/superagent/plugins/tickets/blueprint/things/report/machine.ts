import { Blueprint } from "orthograph";
import { Report } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Report, {
  states: ["progress", "waiting", "ready", "blocked", "failed", "dropped"],
  moves: {
    made: { from: [], to: ["progress", "waiting", "ready", "blocked", "failed", "dropped"], emits: Events.ReportMade },
  },
  notFrom: { exit: 99 },
});
