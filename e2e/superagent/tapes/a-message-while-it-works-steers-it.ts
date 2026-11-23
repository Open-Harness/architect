import { WORLD, row, told, step, ASK } from "../tape/tapekit.ts";

const started = () => row("AssignmentStarted", "op:agent.tell");
export default {
  world: WORLD,
  steps: {
    "#4": { answer: { held: [{ n: 1 }] } },
    "#7": { answer: { released: 1 } },
    "#9": { answer: { inputs: [told(ASK), told("also the edge case", "steered")] } },
    "#10": { answer: { steps: [step(1, "echo"), step(2, "Added both.")] } },
    "#11": { answer: { requests: [{ n: 2 }] } },
    "#12": { answer: { rows: [started()] } },
    "#13": { answer: { unused: 0 } },
  },
  plants: [
    { name: "the message was submitted as a new turn, not steered", step: "#9", with: () => ({ answer: { inputs: [told(ASK), told("also the edge case", "submitted", "asg_2")] } }) },
    { name: "the message never reached the executor", step: "#9", with: () => ({ answer: { inputs: [told(ASK)] } }) },
    { name: "a second round was committed twice", step: "#10", with: () => ({ answer: { steps: [step(1, "echo"), step(2, "Added both."), step(2, "Added both.")] } }) },
    { name: "the model was told the words in its first request too", step: "#11", with: () => ({ answer: { requests: [{ n: 1 }, { n: 2 }] } }) },
    { name: "the steer cost a second seating", step: "#12", with: () => ({ answer: { rows: [started(), started()] } }) },
    { name: "a scripted turn was left unused", step: "#13", with: () => ({ answer: { unused: 1 } }) },
    { name: "REVIEW: the steer carries no Assignment id, so the Agent cannot fence it", step: "#9", with: () => ({ answer: { inputs: [told(ASK), told("also the edge case", "steered", null)] } }) },
    { name: "REVIEW: the steer names some other Assignment than the one running", step: "#9", with: () => ({ answer: { inputs: [told(ASK), told("also the edge case", "steered", "asg_other")] } }) },
  ],
};
