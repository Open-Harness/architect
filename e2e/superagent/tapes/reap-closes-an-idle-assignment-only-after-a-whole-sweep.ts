import { AssignmentInterrupted, AssignmentEnded, AgentClosed } from "../kit/ops.ts";
import { WORLD, row } from "../tape/tapekit.ts";

export default {
  world: WORLD,
  steps: { "#5": { answer: { reaped: 0n } }, "#7": { answer: { rows: [] } } },
  plants: [
    { name: "reap closed it the first time it saw it idle: no grace", step: "#5", with: () => ({ answer: { reaped: 1n }, events: [[AssignmentInterrupted, { seat: 1n }]] }) },
    { name: "reap reported nothing but closed it anyway", step: "#5", with: () => ({ answer: { reaped: 0n }, events: [[AssignmentInterrupted, { seat: 1n }]] }) },
    { name: "a sweep closed it inside the first twenty-nine seconds", step: "#6", with: () => ({ events: [[AssignmentInterrupted, { seat: 1n }]] }) },
    { name: "the Assignment is closing before a whole sweep", step: "#7", with: () => ({ answer: { rows: [row("AssignmentInterrupted", "op:agent.close")] } }) },
    { name: "reap never closed it", step: "#8", with: () => ({ events: [] }) },
    { name: "reap ended it without the Agent's acknowledgement", step: "#8", with: () => ({ events: [[AssignmentInterrupted, { seat: 1n }], [AssignmentEnded, { seat: 1n }]] }) },
    { name: "the Agent acknowledged but the seat stayed held", step: "#8", with: () => ({ events: [[AssignmentInterrupted, { seat: 1n }], [AgentClosed, { agent: "agt_one" }]] }) },
    { name: "another Agent acknowledged", step: "#8", with: () => ({ events: [[AssignmentInterrupted, { seat: 1n }], [AgentClosed, { agent: "agt_other" }], [AssignmentEnded, { seat: 1n }]] }) },
  ],
};
