import { AssignmentQueued, AssignmentPromoted, AssignmentStarted, AssignmentInterrupted, AssignmentEnded } from "../kit/ops.ts";
import { WORLD, row, told } from "../tape/tapekit.ts";

const queued = (n: number) => ({ rows: Array.from({ length: n }, () => row("AssignmentQueued", "op:superagent.fill")) });
const texts = ["@agent fix b", "CI failed: login.test", "please look at the CI failure"];
const inputs = (t: ReadonlyArray<string>) => ({ inputs: t.map((x, i) => (i === 0 ? told(x, "submitted", "asg_1") : i === 1 ? told(x, "submitted", "asg_2") : told(x, "steered", "asg_2"))) });
export default {
  world: WORLD,
  steps: { "#5": { answer: { agent: "agt_a" } }, "#12": { answer: queued(3) }, "#13": { answer: inputs(texts) }, "#14": { answer: { rows: [] } } },
  plants: [
    { name: "the CI result's Assignment was queued for the launch's reason", step: "#9", with: () => ({ events: [[AssignmentQueued, { why: "launch" }]] }) },
    { name: "the CI result queued nothing", step: "#9", with: () => ({ events: [] }) },
    { name: "the person's message was not promoted", step: "#11", with: () => ({ events: [[AssignmentStarted, { seat: 255n, why: "person" }]] }) },
    { name: "the person's message queued a second Assignment instead", step: "#11", with: () => ({ events: [[AssignmentQueued, { why: "person" }], [AssignmentStarted, { seat: 255n, why: "person" }]] }) },
    { name: "the promoted Assignment waited for the pool: no reserve", step: "#11", with: () => ({ events: [[AssignmentPromoted, {}]] }) },
    { name: "the promoted Assignment took the pool's seat, which is held", step: "#11", with: () => ({ events: [[AssignmentPromoted, {}], [AssignmentStarted, { seat: 1n, why: "person" }]] }) },
    { name: "the person's message made a fourth Assignment", step: "#12", with: () => ({ answer: queued(4) }) },
    { name: "the CI result made none", step: "#12", with: () => ({ answer: queued(2) }) },
    { name: "the executor was told the person before the CI result", step: "#13", with: () => ({ answer: inputs([texts[0]!, texts[2]!, texts[1]!]) }) },
    { name: "the person's message was lost", step: "#13", with: () => ({ answer: inputs(texts.slice(0, 2)) }) },
    { name: "the CI result was lost", step: "#13", with: () => ({ answer: inputs([texts[0]!, texts[2]!]) }) },
    { name: "the person's message was told twice", step: "#13", with: () => ({ answer: inputs([...texts, texts[2]!]) }) },
    { name: "REVIEW: the CI result and the person were told under b's first, finished Assignment", step: "#13", with: () => ({ answer: { inputs: texts.map((x) => told(x, "submitted", "asg_1")) } }) },
    { name: "REVIEW: no opening tell: the CI result and the person were both steered into the new Assignment", step: "#13", with: () => ({ answer: { inputs: [told(texts[0]!), told(texts[1]!, "steered", "asg_3"), told(texts[2]!, "steered", "asg_3")] } }) },
    { name: "the CI result and the person were both steered, with no opening tell", step: "#13", with: () => ({ answer: { inputs: [told(texts[0]!, "submitted", "asg_1"), told(texts[1]!, "steered", "asg_1"), told(texts[2]!, "steered", "asg_1")] } }) },
    { name: "the three were all told under the first, finished Assignment", step: "#13", with: () => ({ answer: { inputs: texts.map((x) => told(x, "submitted", "asg_1")) } }) },
    { name: "ticket a was pre-empted to seat the person", step: "#14", with: () => ({ answer: { rows: [row("AssignmentInterrupted", "op:agent.close")] } }) },
  ],
};
