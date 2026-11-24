import { AssignmentEnded, AssignmentInterrupted, AgentClosed } from "../kit/ops.ts";
import { WORLD, row } from "../tape/tapekit.ts";

const idle = () => row("AgentIdled", "op:assignment.turnEnded", { event: "evt_idle_a1" });
const ended = (n: number) => ({ rows: Array.from({ length: n }, () => row("AssignmentEnded", "op:superagent.fill")) });
export default {
  world: WORLD,
  steps: { "#10": { answer: { released: 1 } }, "#12": { answer: { rows: [idle()] } }, "#13": { answer: { redelivered: 1 } }, "#15": { answer: ended(1) } },
  plants: [
    { name: "the late idle for the first Assignment ended the second", step: "#11", with: () => ({ events: [[AssignmentEnded, { seat: 1n }]] }) },
    { name: "the redelivered idle ended the second", step: "#14", with: () => ({ events: [[AssignmentEnded, { seat: 1n }]] }) },
    { name: "the late idle ended the second, and the record shows it", step: "#15", with: () => ({ answer: ended(2) }) },
    { name: "the first Assignment never ended", step: "#15", with: () => ({ answer: ended(0) }) },
    { name: "the parked idle was not let go", step: "#10", with: () => ({ answer: { released: 0 } }) },
    { name: "the redelivery redelivered nothing", step: "#13", with: () => ({ answer: { redelivered: 0 } }) },
    { name: "the redelivery redelivered more than the one row", step: "#13", with: () => ({ answer: { redelivered: 2 } }) },
    { name: "reap did not close the first Assignment", step: "#5", with: () => ({ events: [[AssignmentEnded, { seat: 1n }]] }) },
    { name: "reap ended the first Assignment without the Agent's acknowledgement", step: "#5", with: () => ({ events: [[AssignmentInterrupted, { seat: 1n }], [AssignmentEnded, { seat: 1n }]] }) },
    { name: "reap closed it and the Agent acknowledged but the seat was not freed", step: "#5", with: () => ({ events: [[AssignmentInterrupted, { seat: 1n }], [AgentClosed, { agent: "agt_one" }]] }) },
    { name: "the second Assignment never ended on its own idle", step: "#18", with: () => ({ events: [] }) },
  ],
};
