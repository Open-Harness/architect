import { Blueprint } from "orthograph";
import { Assignment } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Assignment, {
  description: "Close a running Assignment: a stop, a retire or a reap. It keeps its seat until the Agent says it closed.",
  payload: {
    assignment: Assignment.fields.id,
  },
  answer: {},
  move: machine.moves.interrupted,
  allowed: [Blueprint.system],
});
