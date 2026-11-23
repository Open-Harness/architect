import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Handle, {
  description: "Let a name go, so someone may claim it again.",
  payload: { handle: Handle.fields.id },
  answer: {},
  move: machine.moves.release,
  allowed: [Blueprint.anyone],
  steps: { update: Blueprint.step.database() },
});
