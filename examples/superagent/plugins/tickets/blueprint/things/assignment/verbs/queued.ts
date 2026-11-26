import { Blueprint } from "orthograph";
import { Assignment } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Assignment, {
  description: "Queue an Assignment for a ticket's executor: an accept, an Input or a resume. It names the Input that woke it.",
  payload: {
    superagent: Assignment.fields.superagent,
    ticket: Assignment.fields.ticket,
    agent: Assignment.fields.agent,
    input: Assignment.fields.input,
    why: Assignment.fields.why,
  },
  answer: {
    assignment: Assignment.fields.id,
  },
  move: machine.moves.queued,
  allowed: [Blueprint.system],
});
