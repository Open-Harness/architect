import { Blueprint } from "orthograph";
import { Input } from "../thing.ts";
import { machine } from "../machine.ts";
import { InputStored } from "../events.ts";
import { AssignmentStarted, AssignmentEnded } from "../../assignment/events.ts";
import { Agent } from "@orthograph/agents/blueprint/things/agent/thing.ts";

export default Blueprint.operation(Input, {
  description: "Send a waiting Input to its running executor, or queue the Assignment that will start one.",
  payload: {
    ticket: Input.fields.ticket,
  },
  answer: {
    input: Input.fields.id,
    agent: Agent.fields.id,
    assignment: Blueprint.id("asg"),
  },
  move: machine.moves.routed,
  allowed: [Blueprint.system],
  on: [Blueprint.on(InputStored, (e) => ({ ticket: e.ticket })), Blueprint.on(AssignmentStarted, (e) => ({ ticket: e.ticket })), Blueprint.on(AssignmentEnded, (e) => ({ ticket: e.ticket }))],
});
