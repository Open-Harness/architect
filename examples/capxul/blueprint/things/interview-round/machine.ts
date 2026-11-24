import { Blueprint } from "orthograph";
import { InterviewRound } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Interview Round has no lifecycle.
export const machine = Blueprint.machine(InterviewRound, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.InterviewRoundCreated },
  },
  notFrom: { exit: 40 },
});
