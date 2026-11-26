import { Blueprint } from "orthograph";
import { Bell } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Bell, {
  states: ["ringing"],
  moves: {
    set: { from: [], to: "ringing", emits: Events.BellSet },
    // A self-move made by time that leaves its own field alone: the due it fired is never armed again (CX-keeper call 3).
    chime: { from: ["ringing"], to: "ringing", emits: Events.BellChimed, by: Blueprint.time.after("setAt", "1 hour") },
  },
  notFrom: { exit: 94 },
});
