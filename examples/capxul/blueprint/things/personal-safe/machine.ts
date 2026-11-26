import { Blueprint } from "orthograph";
import { PersonalSafe } from "./thing.ts";
import * as Events from "./events.ts";

// S1 opens a Safe; nothing goes to a chain. S1b adds `claimed` and the claim move (once journeys can sign, J1 #1190),
// and S3 adds `deploying` and `deployed` with the send, observe, recover, rotate and correct moves (CX-safe, the
// person's Safe's machine).
export const machine = Blueprint.machine(PersonalSafe, {
  states: ["unclaimed"],
  moves: {
    open: { from: [], to: "unclaimed", emits: Events.PersonalSafeOpened },
  },
  notFrom: { exit: 40 },
});
