import { Blueprint } from "orthograph";
import { Thread } from "./thing.ts";
import * as Events from "./events.ts";

// One state (GOAL17-stage-one, call 5): whether a thread waits, or is being evaluated, is read from its triggers and its evals, never stored twice.
export const machine = Blueprint.machine(Thread, {
  states: ["idle"],
  moves: {
    bind: { from: [], to: "idle", emits: Events.ThreadSubscribed },
    closed: { from: ["idle"], to: "idle", emits: Events.ThreadClosed },
    unsubscribe: { from: ["idle"], to: "idle", emits: Events.ThreadUnsubscribed },
  },
  notFrom: { exit: 84 },
});
