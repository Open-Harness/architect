import { AssignmentStarted, EvalExpired, SuperagentResumed } from "../kit/ops.ts";
import { WORLD, row } from "../tape/tapekit.ts";

const heldRow = (name: string, to: string, o = {}) => row(name, to, { state: "pending", attempts: 0, hold: "sag_1", ...o });
const HELD = [heldRow("AssignmentQueued", "op:superagent.fill"), heldRow("TicketCreated", "op:outgoing-message.reply")];
export default {
  world: WORLD,
  steps: {
    "#3": { answer: { trigger: "trg_eve", outcome: "stored" } }, "#4": { answer: { eval: "evl_1" } },
    "#6": { answer: { held: [{ n: 1 }] } }, "#10": { answer: { agent: "agt_new" } },
    "#13": { answer: { rows: HELD } }, "#14": { answer: { rows: [] } }, "#17": { answer: { rows: [row("AssignmentQueued", "op:superagent.fill"), row("TicketCreated", "op:outgoing-message.reply")] } },
  },
  plants: [
    { name: "the eval expired during the pause", step: "#12", with: () => ({ events: [[EvalExpired, {}]] }) },
    { name: "a launch was seated during the pause", step: "#12", with: () => ({ events: [[AssignmentStarted, { seat: 1n }]] }) },
    { name: "the held rows were lost", step: "#13", with: () => ({ answer: { rows: [] } }) },
    { name: "a held row was tried during the pause", step: "#13", with: () => ({ answer: { rows: [heldRow("AssignmentQueued", "op:superagent.fill", { attempts: 1 }), HELD[1]] } }) },
    { name: "a held row was not held", step: "#13", with: () => ({ answer: { rows: [heldRow("AssignmentQueued", "op:superagent.fill", { hold: null }), HELD[1]] } }) },
    { name: "the acknowledgement was not held: replies went out during the pause", step: "#13", with: () => ({ answer: { rows: [HELD[0]] } }) },
    { name: "the launch was seated during the pause", step: "#14", with: () => ({ answer: { rows: [row("AssignmentStarted", "op:agent.tell")] } }) },
    { name: "the resume's length is the wrong length", step: "#15", with: () => ({ events: [[SuperagentResumed, { to: "live", length: 240000n }]] }) },
    { name: "the resume put the superagent back in the wrong state", step: "#15", with: () => ({ events: [[SuperagentResumed, { to: "observing", length: 300000n }]] }) },
    { name: "the held work was not released on the resume", step: "#16", with: () => ({ events: [] }) },
    { name: "a held row was left held after the resume", step: "#17", with: () => ({ answer: { rows: HELD } }) },
    { name: "the deadline did not move: the eval expired at its first deadline", step: "#18", with: () => ({ events: [[EvalExpired, {}]] }) },
    { name: "the eval never expired", step: "#19", with: () => ({ events: [] }) },
    { name: "REVIEW: on the resume the acknowledgement lost its hold but was never sent (a stuck pending row, hold null)", step: "#17", with: () => ({ answer: { rows: [row("TicketCreated", "op:outgoing-message.reply", { state: "pending", attempts: 0, hold: null })] } }) },
  ],
};
