import { Blueprint } from "orthograph";
import { OutgoingMessage } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(OutgoingMessage, {
  description: "Queue a failed reply again, once its wait has passed.",
  payload: { message: OutgoingMessage.fields.id },
  answer: {  },
  move: machine.moves.requeued,
  allowed: [Blueprint.system],
});
