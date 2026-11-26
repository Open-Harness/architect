import { Blueprint } from "orthograph";
import { Agent } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Agent, {
  description: "Make an agent of one kind, about one thing: any operation allowed to create one makes it.",
  payload: {
    kind: Agent.fields.kind,
    about: Agent.fields.about,
  },
  answer: {
    agent: Agent.fields.id,
  },
  move: machine.moves.open,
  allowed: [Blueprint.system],
});
