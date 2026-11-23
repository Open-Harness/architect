import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { machine } from "../machine.ts";
import { Profile } from "../../profile/thing.ts";

// No `errors:`: HandleTaken and HandleAlreadyOwned belong to the rules in ../invariants.ts, and the runtime refuses them.
export default Blueprint.operation(Handle, {
  description: "Claim a free name and make it the address of your public page, with its profile.",
  payload: { name: Handle.fields.name },
  answer: { handle: Handle.fields.id },
  move: machine.moves.claim,
  allowed: [Blueprint.signedIn],
  steps: { record: Blueprint.step.database({ writes: [Profile] }) },
  idempotent: "request", // the same request twice claims once
  budget: { p95: "150 millis" },
});
