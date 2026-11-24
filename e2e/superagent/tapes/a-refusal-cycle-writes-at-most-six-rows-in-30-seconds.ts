import { AssignmentStarted } from "../kit/ops.ts";
import { WORLD, row, told, SLACK_ASK } from "../tape/tapekit.ts";

const stale = () => row("InputRouted", "op:agent.tell", { state: "delivered", outcome: "StaleAssignment", attempts: 0 });
const stored = () => row("InputStored", "op:input.route");
// the person's own InputStored, then two refusals each followed by its requeue: five rows
const cycle = [stored(), stale(), stored(), stale(), stored()];
const hot = Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? stored() : stale()));
export default {
  world: WORLD,
  steps: {
    "#7": { answer: { rows: cycle } }, "#8": { answer: { rows: cycle } }, "#9": { answer: { rows: [stale(), stale()] } },
    "#12": { answer: { inputs: [told(SLACK_ASK), told("one more thing", "submitted", "asg_2")] } },
  },
  plants: [
    { name: "a hot cycle: a row every pass for thirty seconds", step: "#8", with: () => ({ answer: { rows: hot } }) },
    { name: "the cycle never ran, so the bound would pass for want of it", step: "#7", with: () => ({ answer: { rows: [stored()] } }) },
    { name: "a refused row was left to the outbox's retries", step: "#9", with: () => ({ answer: { rows: [stale(), row("InputRouted", "op:agent.tell", { state: "failed", outcome: "StaleAssignment", attempts: 3 })] } }) },
    { name: "a refusal counted as an attempt", step: "#9", with: () => ({ answer: { rows: [stale(), row("InputRouted", "op:agent.tell", { state: "delivered", outcome: "StaleAssignment", attempts: 1 })] } }) },
    { name: "the person's message was steered after the cycle ended", step: "#12", with: () => ({ answer: { inputs: [told(SLACK_ASK), told("one more thing", "steered", "asg_2")] } }) },
    { name: "the person's message was told twice", step: "#12", with: () => ({ answer: { inputs: [told(SLACK_ASK), told("one more thing", "submitted", "asg_2"), told("one more thing", "submitted", "asg_2")] } }) },
    { name: "no new Assignment was seated when the cycle ended", step: "#11", with: () => ({ events: [] }) },
    { name: "the new Assignment went to another executor", step: "#11", with: () => ({ events: [[AssignmentStarted, { agent: "agt_new", seat: 1n }]] }) },
    { name: "REVIEW: no InputRouted row at all: the every() over none is true", step: "#9", with: () => ({ answer: { rows: [] } }) },
    { name: "REVIEW: three InputStored rows and no route or refusal: the cycle never ran", step: "#7", with: () => ({ answer: { rows: [stored(), stored(), stored()] } }) },
    { name: "REVIEW: the person's message was told under no Assignment", step: "#12", with: () => ({ answer: { inputs: [told(SLACK_ASK), told("one more thing", "submitted", null)] } }) },
  ],
};
