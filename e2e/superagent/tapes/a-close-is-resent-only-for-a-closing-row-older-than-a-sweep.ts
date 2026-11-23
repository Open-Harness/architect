import { AssignmentQueued, AssignmentStarted } from "../kit/ops.ts";
import { AssignmentEnded, AgentClosed } from "../kit/ops.ts";
import { WORLD, row } from "../tape/tapekit.ts";

export default {
  world: WORLD,
  steps: { "#8": { answer: { rows: [row("AssignmentEnded", "op:superagent.fill")] } }, "#9": { answer: { rows: [] } } },
  plants: [
    { name: "the close was resent for a row younger than a sweep", step: "#6", with: () => ({ events: [[AgentClosed, { agent: "agt_one" }]] }) },
    { name: "the close was never resent: a closing seat is held for good", step: "#7", with: () => ({ events: [] }) },
    { name: "the seat was freed by reap itself, without the Agent's acknowledgement", step: "#7", with: () => ({ events: [[AssignmentEnded, { seat: 1n }]] }) },
    { name: "the Agent acknowledged but the seat was not freed", step: "#7", with: () => ({ events: [[AgentClosed, { agent: "agt_one" }]] }) },
    { name: "the stop did not close the Assignment", step: "#5", with: () => ({ events: [] }) },
    { name: "the seat was freed twice", step: "#8", with: () => ({ answer: { rows: [row("AssignmentEnded", "op:superagent.fill"), row("AssignmentEnded", "op:superagent.fill")] } }) },
    { name: "the stopped ticket was given a new Assignment in the freed seat", step: "#9", with: () => ({ answer: { rows: [row("AssignmentQueued", "op:superagent.fill")] } }) },
  ],
};
