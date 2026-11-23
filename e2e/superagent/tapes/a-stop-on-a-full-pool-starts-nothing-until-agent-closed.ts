import { AgentClosed } from "../kit/ops.ts";
import { AssignmentEnded, AssignmentStarted } from "../kit/ops.ts";
import { WORLD, row } from "../tape/tapekit.ts";

const rows = (name: string, to: string, n: number) => ({ rows: Array.from({ length: n }, () => row(name, to)) });
const waiting = (n: number) => ({ items: Array.from({ length: n }, () => ({ why: "launch" })), next: null });
export default {
  world: WORLD,
  steps: {
    "#8": { answer: waiting(1) }, "#9": { answer: { started: 0n } },
    "#10": { answer: rows("AssignmentStarted", "op:agent.tell", 1) }, "#11": { answer: rows("AssignmentQueued", "op:superagent.fill", 1) },
    "#15": { answer: rows("AssignmentQueued", "op:superagent.fill", 3) }, "#16": { answer: rows("AssignmentStarted", "op:agent.tell", 2) },
  },
  plants: [
    { name: "REVIEW: the freed seat went to the reserve (255), not the pool seat", step: "#13", with: () => ({ events: [[AgentClosed, { agent: "agt_one" }], [AssignmentEnded, { seat: 1n }], [AssignmentStarted, { agent: "agt_two", seat: 255n }]] }) },
    { name: "REVIEW: the Agent that closed is the second ticket's, not the stopped one's", step: "#13", with: () => ({ events: [[AgentClosed, { agent: "agt_two" }], [AssignmentEnded, { seat: 1n }], [AssignmentStarted, { agent: "agt_two", seat: 1n }]] }) },
    { name: "the second ticket started when the stop began: the seat was refilled before the acknowledgement", step: "#8", with: () => ({ answer: waiting(0) }) },
    { name: "a fill by hand started the second ticket into a seat still held", step: "#9", with: () => ({ answer: { started: 1n } }) },
    { name: "two were seated before the close landed", step: "#10", with: () => ({ answer: rows("AssignmentStarted", "op:agent.tell", 2) }) },
    { name: "fill looped while it had nothing to start", step: "#11", with: () => ({ answer: rows("AssignmentQueued", "op:superagent.fill", 6) }) },
    { name: "the seat was freed without the Agent's acknowledgement", step: "#13", with: () => ({ events: [[AssignmentEnded, { seat: 1n }], [AssignmentStarted, { agent: "agt_two", seat: 1n }]] }) },
    { name: "the freed seat was not refilled", step: "#13", with: () => ({ events: [[AssignmentEnded, { seat: 1n }]] }) },
    { name: "the freed seat went to the stopped ticket's executor", step: "#13", with: () => ({ events: [[AssignmentEnded, { seat: 1n }], [AssignmentStarted, { agent: "agt_one", seat: 1n }]] }) },
    { name: "fill looped after the seat was refilled", step: "#15", with: () => ({ answer: rows("AssignmentQueued", "op:superagent.fill", 9) }) },
    { name: "the second ticket was seated twice", step: "#16", with: () => ({ answer: rows("AssignmentStarted", "op:agent.tell", 3) }) },
  ],
};
