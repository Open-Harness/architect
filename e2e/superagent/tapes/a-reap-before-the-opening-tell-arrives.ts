import { AssignmentEnded, AssignmentInterrupted, AgentClosed, AssignmentQueued, AssignmentStarted, InputStored } from "../kit/ops.ts";
import { WORLD, row, told, step, SLACK_ASK } from "../tape/tapekit.ts";

const tell = (o = {}) => row("AssignmentStarted", "op:agent.tell", o);
const stale = () => tell({ state: "delivered", outcome: "StaleAssignment", attempts: 0 });
const ok = () => tell({ state: "delivered", outcome: null, attempts: 0 });
export default {
  world: WORLD,
  steps: {
    "#14": { answer: { rows: [row("AssignmentInterrupted", "op:agent.close", { seq: 1 }), row("AgentClosed", "op:assignment.turnEnded", { seq: 2 }), row("AssignmentEnded", "op:superagent.fill", { seq: 3 })] } },
    "#6": { answer: { requests: [] } }, "#9": { answer: { rows: [stale(), ok()] } }, "#10": { answer: { inputs: [told(SLACK_ASK)] } },
    "#11": { answer: { steps: [step(1, "Fixed.")] } }, "#12": { answer: { requests: [{ n: 1 }] } }, "#13": { answer: { unused: 0 } },
  },
  plants: [
    { name: "reap ended the Assignment itself, with no close and no acknowledgement", step: "#5", with: () => ({ events: [[AssignmentEnded, { seat: 1n }]] }) },
    { name: "reap closed it but the Agent never acknowledged, yet the seat was freed", step: "#5", with: (d: object) => ({ ...d, events: [[AssignmentEnded, { seat: 1n }]] }) },
    { name: "the stale executor used the freed seat: the model was asked", step: "#6", with: () => ({ answer: { requests: [{ n: 1 }] } }) },
    { name: "the late tell was accepted", step: "#9", with: () => ({ answer: { rows: [ok(), ok()] } }) },
    { name: "the late tell was never refused: one row, delivered", step: "#9", with: () => ({ answer: { rows: [ok()] } }) },
    { name: "the late tell was retried by the outbox", step: "#9", with: () => ({ answer: { rows: [tell({ state: "delivered", outcome: "StaleAssignment", attempts: 2 }), ok()] } }) },
    { name: "the executor was told twice", step: "#10", with: () => ({ answer: { inputs: [told(SLACK_ASK), told(SLACK_ASK, "submitted", "asg_2")] } }) },
    { name: "the executor took a round twice", step: "#11", with: () => ({ answer: { steps: [step(1, "Fixed."), step(1, "Fixed.")] } }) },
    { name: "the model was asked twice", step: "#12", with: () => ({ answer: { requests: [{ n: 1 }, { n: 2 }] } }) },
    { name: "the Input was not requeued", step: "#8", with: () => ({ events: [[AssignmentQueued, { why: "launch" }], [AssignmentStarted, { agent: "agt_one", seat: 1n }]] }) },
    { name: "no new Assignment took the freed seat", step: "#8", with: () => ({ events: [[InputStored, {}], [AssignmentQueued, { why: "launch" }]] }) },
    { name: "REVIEW: the second opening tell carries no Assignment", step: "#10", with: () => ({ answer: { inputs: [told(SLACK_ASK, "submitted", null)] } }) },
    { name: "the seat was freed before the Agent acknowledged", step: "#14", with: () => ({ answer: { rows: [row("AssignmentInterrupted", "op:agent.close", { seq: 1 }), row("AssignmentEnded", "op:superagent.fill", { seq: 2 }), row("AgentClosed", "op:assignment.turnEnded", { seq: 3 })] } }) },
    { name: "the Agent never acknowledged", step: "#14", with: () => ({ answer: { rows: [row("AssignmentInterrupted", "op:agent.close", { seq: 1 }), row("AssignmentEnded", "op:superagent.fill", { seq: 2 })] } }) },
    { name: "the opening tell was told under no Assignment", step: "#10", with: () => ({ answer: { inputs: [told(SLACK_ASK, "submitted", null)] } }) },
  ],
};
