import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { handleOwner } from "../roles.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Handle, {
  description: "Free your name and take its public page offline. Anyone may claim the name afterwards.",
  payload: { handle: Handle.fields.id },
  answer: {},
  move: machine.moves.release,
  errors: [],
  allowed: [handleOwner],
  steps: { record: Blueprint.step.database() },
  needsApproval: true,
  budget: { p95: "150 millis" },
});
