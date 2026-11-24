import { Blueprint } from "orthograph";
import { Superagent } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Superagent, {
  states: ["observing", "live", "paused", "retired"],
  moves: {
    create: { from: [], to: "observing", emits: Events.SuperagentCreated },
    goLive: { from: ["observing"], to: "live", emits: Events.SuperagentWentLive },
    pause: { from: ["observing", "live"], to: "paused", emits: Events.SuperagentPaused },
    resume: { from: ["paused"], to: ["observing", "live"], emits: Events.SuperagentResumed },
    retire: { from: ["observing", "live", "paused"], to: "retired", emits: Events.SuperagentRetired },
  },
  notFrom: { exit: 60 },
});
