import { Blueprint } from "orthograph";
import { Input } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Input, {
  description: "The outbox gave up telling the executor.",
  payload: {
    input: Input.fields.id,
  },
  answer: {},
  move: machine.moves.failed,
  allowed: [Blueprint.system],
});
