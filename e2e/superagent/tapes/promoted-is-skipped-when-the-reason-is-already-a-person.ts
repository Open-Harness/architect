import { AssignmentPromoted } from "../kit/ops.ts";
import { WORLD, row } from "../tape/tapekit.ts";

const promoted = (n: number) => ({ rows: Array.from({ length: n }, () => row("AssignmentPromoted", "op:superagent.fill")) });
const line = (...whys: Array<string>) => ({ items: whys.map((why) => ({ why })), next: null });
const agent = (n: string) => ({ answer: { agent: `agt_${n}` } });
export default {
  world: WORLD,
  steps: { "#2": agent("a"), "#5": agent("m"), "#9": agent("d"), "#11": agent("b"), "#17": { answer: promoted(2) }, "#20": { answer: promoted(2) }, "#21": { answer: line("person", "launch") } },
  plants: [
    { name: "a second person's message promoted b again", step: "#17", with: () => ({ answer: promoted(3) }) },
    { name: "a person's message promoted nothing", step: "#17", with: () => ({ answer: promoted(1) }) },
    { name: "a CI result promoted the launch", step: "#20", with: () => ({ answer: promoted(3) }) },
    { name: "the CI result turned the launch into a person's", step: "#21", with: () => ({ answer: line("person", "person") }) },
    { name: "the person's place was lost", step: "#21", with: () => ({ answer: line("launch", "launch") }) },
    { name: "a person behind the launch", step: "#21", with: () => ({ answer: line("launch", "person") }) },
    { name: "d was lost", step: "#21", with: () => ({ answer: line("person") }) },
    { name: "the reserve did not take the person's ticket", step: "#8", with: () => ({ events: [] }) },
    { name: "the person's message on b was not promoted", step: "#14", with: () => ({ events: [] }) },
    { name: "the second message was not stored", step: "#15", with: () => ({ events: [] }) },
  ],
};
