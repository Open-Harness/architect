import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { machine } from "../machine.ts";
import { HandleTaken } from "../errors.ts";

export default Blueprint.operation(Handle, {
  description: "Claim a name, unless someone holds it.",
  payload: { name: Handle.fields.name },
  answer: { handle: Handle.fields.id },
  move: machine.moves.claim,
  errors: [HandleTaken],
  allowed: [Blueprint.anyone],
  steps: { look: Blueprint.step.database(), save: Blueprint.step.database() },
});
