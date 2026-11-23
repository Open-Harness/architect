import { Blueprint } from "orthograph";
import { Agent } from "../thing.ts";
import { machine } from "../machine.ts";
import { StaleAssignment } from "../errors.ts";

export default Blueprint.operation(Agent, {
  description: "Give an agent one input, steering it when it is busy. Only an outbox hop calls it, with the delivering event's id as the request id.",
  payload: { agent: Agent.fields.id, requestId: Blueprint.text({ max: 120 }), input: Blueprint.text({ max: 65536 }), assignment: Blueprint.optional(Blueprint.id("asg")), opens: Blueprint.bool() },
  answer: {  },
  move: machine.moves.tell,
  errors: [StaleAssignment],
  allowed: [Blueprint.system],
});
