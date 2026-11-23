import { AssignmentPromoted, AssignmentStarted } from "../kit/ops.ts";
import { WORLD, row } from "../tape/tapekit.ts";

const line = (...whys: Array<string>) => ({ items: whys.map((why) => ({ why })), next: null });
export default {
  world: WORLD,
  steps: {
    "#23": { answer: { rows: [row("AssignmentEnded", "op:superagent.fill"), row("AssignmentEnded", "op:superagent.fill")] } },
    "#2": { answer: { agent: "agt_a" } }, "#5": { answer: { agent: "agt_x" } }, "#7": { answer: { agent: "agt_l" } }, "#9": { answer: { agent: "agt_m" } },
    "#12": { answer: line("launch", "launch", "launch") },
    "#17": { answer: line("person", "launch") }, "#20": { answer: line("person", "launch") }, "#24": { answer: line("launch") },
  },
  plants: [
    { name: "the person went to the pool, which was full, instead of the reserve", step: "#14", with: () => ({ events: [[AssignmentPromoted, {}], [AssignmentStarted, { seat: 1n, why: "person" }]] }) },
    { name: "the person was not promoted: a second Assignment was queued instead", step: "#14", with: () => ({ events: [[AssignmentStarted, { seat: 255n, why: "person" }]] }) },
    { name: "the person was left waiting with the reserve free", step: "#14", with: () => ({ events: [[AssignmentPromoted, {}]] }) },
    { name: "the second person's message was not promoted", step: "#16", with: () => ({ events: [] }) },
    { name: "a person behind the launch", step: "#17", with: () => ({ answer: line("launch", "person") }) },
    { name: "the person's place was lost", step: "#17", with: () => ({ answer: line("launch") }) },
    { name: "a restart lost the queue", step: "#20", with: () => ({ answer: line() }) },
    { name: "a restart reordered the queue", step: "#20", with: () => ({ answer: line("launch", "person") }) },
    { name: "three waited at first, so a ticket was seated early", step: "#12", with: () => ({ answer: line("launch", "launch") }) },
    { name: "the older launch was seated in the reserve, which is a person's alone", step: "#24", with: () => ({ answer: line() }) },
    { name: "the launch got the freed pool seat before the person", step: "#22", with: () => ({ events: [[AssignmentStarted, { seat: 1n, why: "launch" }]] }) },
    { name: "the person was never seated when the seat freed", step: "#22", with: () => ({ events: [] }) },
    { name: "only one seat was freed", step: "#23", with: () => ({ answer: { rows: [row("AssignmentEnded", "op:superagent.fill")] } }) },
  ],
};
