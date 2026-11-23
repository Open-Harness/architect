import { Blueprint } from "orthograph";
import { Profile } from "./thing.ts";
import * as Events from "./events.ts";

// A creating move: the runtime mints a page's id only for a move from nothing, so `make` has a real id to answer (`prehandle.ts`, `creates()`).
export const machine = Blueprint.machine(Profile, {
  states: ["made"],
  moves: { make: { from: [], to: "made", emits: Events.ProfileMade } },
  notFrom: { exit: 62 },
});
