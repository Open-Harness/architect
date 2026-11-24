import { InputStored } from "../kit/ops.ts";
import { WORLD, row, told, step } from "../tape/tapekit.ts";

const tell = (o = {}) => row("AssignmentStarted", "op:agent.tell", { state: "delivered", outcome: "StaleAssignment", attempts: 0, ...o });
export default {
  world: WORLD,
  steps: {
    "#8": { answer: { rows: [tell()] } }, "#9": { answer: { inputs: [] } }, "#10": { answer: { steps: [] } },
    "#11": { answer: { requests: [] } }, "#12": { answer: { rows: [] } },
  },
  plants: [
    { name: "REVIEW: the refusal was never requeued (no InputStored after the late tell), the Input is lost", step: "#7", with: () => ({ events: [] }) },
    { name: "REVIEW: the row carries another error's name", step: "#8", with: () => ({ answer: { rows: [tell({ outcome: "SandboxGone" })] } }) },
    { name: "REVIEW: the stale refusal was requeued, and a second row (agent.tell retried once) is attempts 1", step: "#8", with: () => ({ answer: { rows: [tell({ attempts: 1 })] } }) },
    { name: "the late tell was accepted", step: "#8", with: () => ({ answer: { rows: [tell({ outcome: null })] } }) },
    { name: "the late tell was refused as a plain refusal, to be dropped", step: "#8", with: () => ({ answer: { rows: [tell({ state: "refused" })] } }) },
    { name: "the late tell was retried by the outbox", step: "#8", with: () => ({ answer: { rows: [tell({ attempts: 2 })] } }) },
    { name: "the late tell was never attempted", step: "#8", with: () => ({ answer: { rows: [tell({ state: "pending", outcome: null, attempts: 0 })] } }) },
    { name: "the stopped executor was told its input", step: "#9", with: () => ({ answer: { inputs: [told("hi")] } }) },
    { name: "the stopped executor took a model step", step: "#10", with: () => ({ answer: { steps: [step(1, "x")] } }) },
    { name: "the model was asked", step: "#11", with: () => ({ answer: { requests: [{ n: 1 }] } }) },
    { name: "the refused tell's Input was requeued into a new Assignment for a stopped ticket", step: "#12", with: () => ({ answer: { rows: [row("AssignmentQueued", "op:superagent.fill")] } }) },
    { name: "the stop did not reach the Agent", step: "#5", with: () => ({ events: [] }) },
    { name: "the refused Input was dropped, not requeued", step: "#7", with: () => ({ events: [] }) },
  ],
};
