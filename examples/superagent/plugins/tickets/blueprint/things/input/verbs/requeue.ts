import { Blueprint } from "orthograph";
import { Input } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Input, {
  description: "Put a refused or failed Input back to waiting, after a short wait that grows with each refusal.",
  payload: { input: Input.fields.id },
  answer: {  },
  move: machine.moves.requeued,
  allowed: [Blueprint.system],
});
