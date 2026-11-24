import { AssignmentQueued, AssignmentStarted, InputStored } from "../kit/ops.ts";
import { WORLD, row, told, step, ASK } from "../tape/tapekit.ts";

const routed = (o = {}) => row("InputRouted", "op:agent.tell", o);
const parked = () => routed({ state: "pending", attempts: 0, hold: "test:1" });
const stale = (o = {}) => routed({ state: "delivered", outcome: "StaleAssignment", attempts: 0, ...o });
const both = (how: "submitted" | "steered", a2 = "asg_2") => [told(ASK), told("one more thing", how, a2)];
export default {
  world: WORLD,
  steps: {
    "#16": { answer: { rows: [row("AssignmentQueued", "op:superagent.fill"), row("AssignmentQueued", "op:superagent.fill")] } },
    "#4": { answer: { hold: "test:1", held: 0 } }, "#7": { answer: { rows: [parked()] } }, "#12": { answer: { rows: [stale()] } },
    "#13": { answer: { inputs: both("submitted") } }, "#14": { answer: { steps: [step(1, "First."), step(1, "Second.")] } }, "#15": { answer: { unused: 0 } },
  },
  plants: [
    { name: "the steer was not parked: it was tried at once", step: "#7", with: () => ({ answer: { rows: [routed()] } }) },
    { name: "the parked steer was tried while parked", step: "#7", with: () => ({ answer: { rows: [routed({ state: "pending", attempts: 1, hold: "test:1" })] } }) },
    { name: "the Agent took the stale steer into its finished turn: the row has no refusal", step: "#12", with: () => ({ answer: { rows: [routed()] } }) },
    { name: "the refusal was left to the outbox's retries", step: "#12", with: () => ({ answer: { rows: [stale({ state: "failed", attempts: 3 })] } }) },
    { name: "the refusal counted as an attempt", step: "#12", with: () => ({ answer: { rows: [stale({ attempts: 1 })] } }) },
    { name: "the refusal was not recorded at all", step: "#12", with: () => ({ answer: { rows: [] } }) },
    { name: "the steer reached the Agent with no seat, and was steered", step: "#13", with: () => ({ answer: { inputs: both("steered", "asg_1") } }) },
    { name: "the message was told under the old Assignment", step: "#13", with: () => ({ answer: { inputs: both("submitted", "asg_1") } }) },
    { name: "the message was never told", step: "#13", with: () => ({ answer: { inputs: [told(ASK)] } }) },
    { name: "the message was told twice", step: "#13", with: () => ({ answer: { inputs: [...both("submitted"), told("one more thing", "submitted", "asg_3")] } }) },
    { name: "the Input was not requeued", step: "#11", with: () => ({ events: [[AssignmentQueued, { why: "person" }], [AssignmentStarted, { seat: 1n }]] }) },
    { name: "no new Assignment was queued", step: "#11", with: () => ({ events: [[InputStored, {}]] }) },
    { name: "the new Assignment was not seated", step: "#11", with: () => ({ events: [[InputStored, {}], [AssignmentQueued, { why: "person" }]] }) },
    { name: "the second turn was a continuation of the first, not a new turn", step: "#14", with: () => ({ answer: { steps: [step(1, "First."), step(2, "Second.")] } }) },
    { name: "the refusal queued two new Assignments", step: "#16", with: () => ({ answer: { rows: [row("AssignmentQueued", "op:superagent.fill"), row("AssignmentQueued", "op:superagent.fill"), row("AssignmentQueued", "op:superagent.fill")] } }) },
  ],
};
