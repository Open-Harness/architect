import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { machine } from "../machine.ts";

// S-19 (check 31): the handler's own bug, two claimed handles under one name made by one call. No `HandleTaken` here: nothing another call did.
export default Blueprint.operation(Handle, {
  description: "Claim a name for two handles at once (a bug).",
  payload: { name: Handle.fields.name, other: Handle.fields.id },
  answer: { handle: Handle.fields.id },
  move: machine.moves.claim,
  allowed: [Blueprint.anyone],
  steps: { first: Blueprint.step.database(), second: Blueprint.step.database() },
});
