import { Blueprint } from "orthograph";
import { Assignment } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Assignment, {
  description: "A person's Input on a pending Assignment moves it up: its reason becomes a person's.",
  payload: { assignment: Assignment.fields.id },
  answer: {  },
  move: machine.moves.promoted,
  allowed: [Blueprint.system],
});
