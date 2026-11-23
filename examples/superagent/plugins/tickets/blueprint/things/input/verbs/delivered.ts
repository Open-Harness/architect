import { Blueprint } from "orthograph";
import { Input } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Input, {
  description: "The executor took the Input.",
  payload: { input: Input.fields.id },
  answer: {  },
  move: machine.moves.delivered,
  allowed: [Blueprint.system],
});
