import { Blueprint } from "orthograph";
import { Agent } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Agent, {
  description: "Stop an agent's turn for one Assignment and say so: the seat that held it is then free.",
  payload: { agent: Agent.fields.id, assignment: Blueprint.id("asg") },
  answer: {  },
  move: machine.moves.close,
  allowed: [Blueprint.system],
});
