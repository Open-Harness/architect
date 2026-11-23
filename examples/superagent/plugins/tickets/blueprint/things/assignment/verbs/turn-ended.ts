import { Blueprint } from "orthograph";
import { Assignment } from "../thing.ts";
import { machine } from "../machine.ts";
import { AgentIdled, AgentClosed } from "@orthograph/agents/blueprint/things/agent/events.ts";

export default Blueprint.operation(Assignment, {
  description: "The Agent idled on this Assignment or closed it: it ends, and its seat is free.",
  payload: { assignment: Assignment.fields.id },
  answer: {  },
  move: machine.moves.turnEnded,
  allowed: [Blueprint.system],
  on: [Blueprint.on(AgentIdled, (e) => ({ assignment: e.assignment })), Blueprint.on(AgentClosed, (e) => ({ assignment: e.assignment }))],
});
