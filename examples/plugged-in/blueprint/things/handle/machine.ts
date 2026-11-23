import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import { HandleClaimed, HandleReleased } from "./events.ts";

export const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: {
    claim: { from: [], to: "claimed", emits: HandleClaimed },
    release: { from: ["claimed"], to: "released", emits: HandleReleased },
  },
  notFrom: { exit: 11 },
});
