import { Blueprint } from "orthograph";
import { Manager } from "./thing.ts";
import * as Events from "./events.ts";

// Today a manager has no states at all: it is made and lives until the workspace goes. The agreed screens add pause and retire.
export const machine = Blueprint.machine(Manager, {
  states: ["working", "paused", "retired"],
  moves: {
    create: { from: [], to: "working", emits: Events.ManagerCreated },
    pause: { from: ["working"], to: "paused", emits: Events.ManagerPaused }, // a person, the manager above, or a spent budget
    resume: { from: ["paused"], to: "working", emits: Events.ManagerResumed },
    retire: { from: ["working", "paused"], to: "retired", emits: Events.ManagerRetired },
  },
});
