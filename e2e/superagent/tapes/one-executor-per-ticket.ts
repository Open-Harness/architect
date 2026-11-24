import { AssignmentStarted, InputStored } from "../kit/ops.ts";
import { WORLD, row, told, step, SLACK_ASK } from "../tape/tapekit.ts";

const both = [told(SLACK_ASK), told("and the signup test", "submitted", "asg_2")];
const started = () => row("AssignmentStarted", "op:agent.tell");
export default {
  world: WORLD,
  steps: {
    "#4": { answer: { inputs: [told(SLACK_ASK)] } }, "#8": { answer: { inputs: both } },
    "#9": { answer: { steps: [step(1, "Looking."), step(1, "Again.")] } }, "#10": { answer: { rows: [started(), started()] } }, "#11": { answer: { unused: 0 } },
  },
  plants: [
    { name: "the second message wakes a different executor", step: "#7", with: () => ({ events: [[AssignmentStarted, { agent: "agt_new", ticket: "tkt_one", seat: 1n }]] }) },
    { name: "the second message started another ticket's executor", step: "#7", with: () => ({ events: [[AssignmentStarted, { agent: "agt_one", ticket: "tkt_new", seat: 1n }]] }) },
    { name: "the message was stored on another ticket", step: "#6", with: () => ({ events: [[InputStored, { superagent: "sag_1", ticket: "tkt_new" }]] }) },
    { name: "the restart replays the first message to the executor", step: "#8", with: () => ({ answer: { inputs: [told(SLACK_ASK), told(SLACK_ASK), both[1]] } }) },
    { name: "the second message was steered, with no seat", step: "#8", with: () => ({ answer: { inputs: [both[0], told("and the signup test", "steered", "asg_1")] } }) },
    { name: "the second message was told under the first, ended Assignment", step: "#8", with: () => ({ answer: { inputs: [both[0], told("and the signup test", "submitted", "asg_1")] } }) },
    { name: "the second message was told under no Assignment", step: "#8", with: () => ({ answer: { inputs: [both[0], told("and the signup test", "submitted", null)] } }) },
    { name: "a model round was committed twice", step: "#9", with: () => ({ answer: { steps: [step(1, "Looking."), step(1, "Looking."), step(1, "Again.")] } }) },
    { name: "a third seating: the restart started the ticket afresh", step: "#10", with: () => ({ answer: { rows: [started(), started(), started()] } }) },
    { name: "the first message was told without its Assignment", step: "#4", with: () => ({ answer: { inputs: [told(SLACK_ASK, "submitted", null)] } }) },
  ],
};
