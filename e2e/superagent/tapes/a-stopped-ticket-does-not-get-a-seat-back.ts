import { InputStored, AssignmentInterrupted, AssignmentEnded } from "../kit/ops.ts";
import { WORLD, row } from "../tape/tapekit.ts";

const waiting = (n: number) => ({ items: Array.from({ length: n }, () => ({ why: "person" })), next: null });
export default {
  world: WORLD,
  steps: { "#8": { answer: { rows: [] } }, "#9": { answer: waiting(0) }, "#10": { answer: { rows: [row("AssignmentStarted", "op:agent.tell")] } } },
  plants: [
    { name: "REVIEW: the person's message was stored on another ticket, not the stopped one", step: "#6", with: () => ({ events: [[InputStored, { superagent: "sag_1", ticket: "tkt_other" }]] }) },
    { name: "the stop did not close the Assignment", step: "#4", with: () => ({ events: [] }) },
    { name: "the seat was never freed", step: "#5", with: () => ({ events: [] }) },
    { name: "the message queued a seat for the stopped ticket", step: "#8", with: () => ({ answer: { rows: [row("AssignmentQueued", "op:superagent.fill")] } }) },
    { name: "an Assignment is waiting for the stopped ticket", step: "#9", with: () => ({ answer: waiting(1) }) },
    { name: "the stopped ticket was seated a second time", step: "#10", with: () => ({ answer: { rows: [row("AssignmentStarted", "op:agent.tell"), row("AssignmentStarted", "op:agent.tell")] } }) },
    { name: "the ticket was never seated at all", step: "#10", with: () => ({ answer: { rows: [] } }) },
  ],
};
