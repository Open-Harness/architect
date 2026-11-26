import { Blueprint } from "orthograph";
import { PersonalSafe } from "./thing.ts";
import * as Events from "./events.ts";

// S1 opens and claims; nothing goes to a chain. S3 adds `deploying` and `deployed` (deploy on first spend), with the
// send, observe, recover, rotate and correct moves (CX-safe, the person's Safe's machine).
export const machine = Blueprint.machine(PersonalSafe, {
  states: ["unclaimed", "claimed"],
  moves: {
    open: { from: [], to: "unclaimed", emits: Events.PersonalSafeOpened },
    claim: { from: ["unclaimed"], to: "claimed", emits: Events.PersonalSafeClaimed },
  },
  notFrom: { exit: 40 },
});
