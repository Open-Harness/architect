import { Blueprint } from "orthograph";
import { Assignment } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Assignment, {
  description: "End a pending Assignment that was never seated or told.",
  payload: { assignment: Assignment.fields.id },
  answer: {  },
  move: machine.moves.cancelled,
  allowed: [Blueprint.system],
});
