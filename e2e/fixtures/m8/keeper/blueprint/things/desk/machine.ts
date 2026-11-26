import { Blueprint } from "orthograph";
import { Desk } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Desk, {
  states: ["held", "free", "expired"],
  moves: {
    hold: { from: [], to: "held", emits: Events.DeskHeld },
    release: { from: ["held"], to: "free", emits: Events.DeskReleased },
    // An hour after it was held, unless it was released first: leaving `held` drops the keeper's row (CX-keeper call 3).
    expire: { from: ["held"], to: "expired", emits: Events.DeskExpired, by: Blueprint.time.after("heldAt", "1 hour") },
  },
  notFrom: { exit: 90 },
});
