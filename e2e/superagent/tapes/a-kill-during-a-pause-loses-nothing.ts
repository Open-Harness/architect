import { WORLD, row } from "../tape/tapekit.ts";

const heldRow = (name: string, to: string, o = {}) => row(name, to, { state: "pending", attempts: 0, hold: "sag_1", ...o });
const HELD = [heldRow("AssignmentQueued", "op:superagent.fill"), heldRow("TicketCreated", "op:outgoing-message.reply")];
const trig = (n: number) => ({ rows: Array.from({ length: n }, () => row("TriggerReceived", "op:input.store")) });
export default {
  world: WORLD,
  steps: {
    "#12": { answer: { replies: [{ n: 1, ts: "1700000000.000101", text: "On it.", key: "k" }] } },
    "#2": { answer: { rows: HELD } }, "#6": { answer: { rows: HELD } }, "#7": { answer: trig(1) },
    "#10": { answer: { rows: [row("TicketCreated", "op:outgoing-message.reply")] } }, "#11": { answer: trig(1) },
  },
  plants: [
    { name: "the kill lost the held rows", step: "#6", with: () => ({ answer: { rows: [] } }) },
    { name: "the kill made the held rows tried", step: "#6", with: () => ({ answer: { rows: [heldRow("AssignmentQueued", "op:superagent.fill", { attempts: 1 }), HELD[1]] } }) },
    { name: "one row came back unheld after the restart", step: "#6", with: () => ({ answer: { rows: [HELD[0], heldRow("TicketCreated", "op:outgoing-message.reply", { hold: null })] } }) },
    { name: "a third row appeared", step: "#6", with: () => ({ answer: { rows: [...HELD, heldRow("EvalStarted", "op:eval.delivered")] } }) },
    { name: "the trigger was recorded twice across the restart", step: "#7", with: () => ({ answer: trig(2) }) },
    { name: "the trigger was lost", step: "#7", with: () => ({ answer: trig(0) }) },
    { name: "the held reply was delivered twice", step: "#10", with: () => ({ answer: { rows: [row("TicketCreated", "op:outgoing-message.reply"), row("TicketCreated", "op:outgoing-message.reply")] } }) },
    { name: "the held reply was never delivered", step: "#10", with: () => ({ answer: { rows: [heldRow("TicketCreated", "op:outgoing-message.reply")] } }) },
    { name: "the resume did not seat the held launch", step: "#9", with: () => ({ events: [] }) },
    { name: "the trigger was recorded again on the resume", step: "#11", with: () => ({ answer: trig(2) }) },
    { name: "the trigger's row was refused after the restart: recorded, never stored as an Input", step: "#7", with: () => ({ answer: { rows: [row("TriggerReceived", "op:input.store", { state: "refused", attempts: 15 })] } }) },
    { name: "the held reply was sent twice (attempts 2) but one row", step: "#10", with: () => ({ answer: { rows: [row("TicketCreated", "op:outgoing-message.reply", { attempts: 2 })] } }) },
    { name: "the held acknowledgement reached the thread twice", step: "#12", with: () => ({ answer: { replies: [{ n: 1, ts: "1.1", text: "On it.", key: "k" }, { n: 2, ts: "1.2", text: "On it.", key: "k" }] } }) },
    { name: "the held acknowledgement never reached the thread", step: "#12", with: () => ({ answer: { replies: [] } }) },
  ],
};
