import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { machine } from "../machine.ts";

// No `errors:`: HandleTaken and HandleAlreadyOwned belong to the rules, and the runtime refuses them (G5 section 3).
export default Blueprint.operation(Handle, {
  description: "Claim a name, unless someone holds it or you already hold one.",
  payload: { name: Handle.fields.name, owner: Handle.fields.owner },
  answer: { handle: Handle.fields.id },
  move: machine.moves.claim,
  allowed: [Blueprint.anyone],
  steps: { save: Blueprint.step.database() },
});
