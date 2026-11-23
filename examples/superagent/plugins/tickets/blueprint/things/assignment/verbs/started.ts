import { Blueprint } from "orthograph";
import { Assignment } from "../thing.ts";
import { machine } from "../machine.ts";
import { NoSeat } from "../errors.ts";

export default Blueprint.operation(Assignment, {
  description: "Give a waiting Assignment a seat, if one is free for it.",
  payload: { assignment: Assignment.fields.id, seat: Assignment.fields.seat },
  answer: { text: Blueprint.text({ max: 65536 }) },
  move: machine.moves.started,
  errors: [NoSeat],
  allowed: [Blueprint.system],
});
