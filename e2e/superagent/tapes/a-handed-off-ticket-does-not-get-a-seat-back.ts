import { AgentClosed, AssignmentEnded, AssignmentInterrupted } from "../kit/ops.ts";
import { AssignmentStarted } from "../kit/ops.ts";
import { WORLD, row, told, ASK_SLACK } from "../tape/tapekit.ts";

export default {
  world: WORLD,
  steps: {
    "#11": { answer: { rows: [row("AssignmentEnded", "op:superagent.fill")] } }, "#12": { answer: { rows: [] } },
    "#7": { answer: { inputs: [told(ASK_SLACK), told("thanks, one nit", "steered")] } },
    "#8": { answer: { rows: [] } },
  },
  plants: [
    { name: "the handoff did not free the seat", step: "#4", with: () => ({ events: [] }) },
    { name: "the handoff freed the wrong seat", step: "#4", with: (d: object) => ({ ...d, events: [[AssignmentStarted, { seat: 1n }]] }) },
    { name: "the nit waited for a new seat instead of reaching the Agent that still held the Assignment", step: "#6", with: () => ({ events: [] }) },
    { name: "the nit was submitted as a new turn, not steered", step: "#7", with: () => ({ answer: { inputs: [told(ASK_SLACK), told("thanks, one nit", "submitted", "asg_2")] } }) },
    { name: "the nit never reached the Agent", step: "#7", with: () => ({ answer: { inputs: [told(ASK_SLACK)] } }) },
    { name: "a seat was queued for the handed-off ticket", step: "#8", with: () => ({ answer: { rows: [row("AssignmentQueued", "op:superagent.fill")] } }) },
    { name: "the stop did not close the handed-off Assignment on the Agent", step: "#10", with: () => ({ events: [] }) },
    { name: "the Agent was steered words that are not the nit", step: "#7", with: () => ({ answer: { inputs: [told(ASK_SLACK), told("a different message", "steered")] } }) },
    { name: "the steer carried another Assignment's id", step: "#7", with: () => ({ answer: { inputs: [told(ASK_SLACK), told("thanks, one nit", "steered", "asg_9")] } }) },
    { name: "the steer carried another Assignment's id", step: "#7", with: () => ({ answer: { inputs: [told(ASK_SLACK), told("thanks, one nit", "steered", "asg_other")] } }) },
    { name: "the steer carried no Assignment id", step: "#7", with: () => ({ answer: { inputs: [told(ASK_SLACK), told("thanks, one nit", "steered", null)] } }) },
    { name: "the Agent was steered other words", step: "#7", with: () => ({ answer: { inputs: [told(ASK_SLACK), told("something else", "steered")] } }) },
    { name: "the stop freed the seat a second time", step: "#11", with: () => ({ answer: { rows: [row("AssignmentEnded", "op:superagent.fill"), row("AssignmentEnded", "op:superagent.fill")] } }) },
    { name: "the stop moved the ended Assignment to closing again", step: "#12", with: () => ({ answer: { rows: [row("AssignmentInterrupted", "op:agent.close")] } }) },
  ],
};
