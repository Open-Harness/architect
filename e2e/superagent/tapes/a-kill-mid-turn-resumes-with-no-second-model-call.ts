import { AssignmentQueued, AssignmentStarted } from "../kit/ops.ts";

import { WORLD, row, told, step, ASK } from "../tape/tapekit.ts";

export default {
  world: WORLD,
  steps: {
    "#13": { answer: { rows: [row("AssignmentStarted", "op:agent.tell")] } },
    "#4": { answer: { held: [{ n: 2 }] } }, "#5": { answer: { pid: 4242 } },
    "#9": { answer: { steps: [step(1, "echo"), step(2, "Done.")] } },
    "#10": { answer: { requests: [{ n: 1 }, { n: 2 }, { n: 3 }] } },
    "#11": { answer: { inputs: [told(ASK)] } }, "#12": { answer: { unused: 0 } },
  },
  plants: [
    { name: "the cut reply was committed, and the resume asked for it again", step: "#9", with: () => ({ answer: { steps: [step(1, "echo"), step(2, "Done."), step(2, "Done.")] } }) },
    { name: "the resume ran the first round again", step: "#9", with: () => ({ answer: { steps: [step(1, "echo"), step(1, "echo"), step(2, "Done.")] } }) },
    { name: "the cut request is not counted: asked is read as committed", step: "#10", with: () => ({ answer: { requests: [{ n: 1 }, { n: 2 }] } }) },
    { name: "a fourth request: the resume restarted the turn", step: "#10", with: () => ({ answer: { requests: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }] } }) },
    { name: "the opening message was told again after the restart", step: "#11", with: () => ({ answer: { inputs: [told(ASK), told(ASK)] } }) },
    { name: "nothing was held to kill", step: "#4", with: () => ({ answer: { held: [] } }) },
    { name: "the runner did not die", step: "#5", with: () => ({ answer: { pid: 0 } }) },
    { name: "REVIEW: after the restart the executor was told some other message as its opening", step: "#11", with: () => ({ answer: { inputs: [told("an unrelated message")] } }) },
    { name: "REVIEW: the opening message was told under no Assignment at all", step: "#11", with: () => ({ answer: { inputs: [told(ASK, "submitted", null)] } }) },
    { name: "the restart seated a second Assignment", step: "#13", with: () => ({ answer: { rows: [row("AssignmentStarted", "op:agent.tell"), row("AssignmentStarted", "op:agent.tell")] } }) },
    { name: "the opening message was told under no Assignment", step: "#11", with: () => ({ answer: { inputs: [told(ASK, "submitted", null)] } }) },
    { name: "the opening message was another message", step: "#11", with: () => ({ answer: { inputs: [told("something else")] } }) },
  ],
};
