import { Blueprint } from "orthograph";
import { Thread } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Thread, {
  description: "Say a thread closed: a merged pull request, a closed issue.",
  payload: { thread: Thread.fields.id },
  answer: {  },
  move: machine.moves.closed,
  allowed: [Blueprint.system],
});
