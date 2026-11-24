import { WORLD, row } from "../tape/tapekit.ts";

const reply = (n: number, text: string, key: string | null = "trg_1") => ({ n, ts: `1700000000.00010${n}`, text, key });
const queued = (o = {}) => row("ReplyQueued", "op:outgoing-message.send", o);
export default {
  world: WORLD,
  steps: {
    "#5": { answer: { requests: [{ n: 1 }] } }, "#12": { answer: { requests: [{ n: 1 }, { n: 2 }] } },
    "#6": { answer: { replies: [] } }, "#7": { answer: { rows: [queued()] } },
    "#10": { answer: { replies: [reply(1, "On it.")] } }, "#11": { answer: { rows: [queued()] } },
  },
  plants: [
    { name: "the failed post reached the thread", step: "#6", with: () => ({ answer: { replies: [reply(1, "On it.")] } }) },
    { name: "the outbox was told the send failed and kept the row pending", step: "#7", with: () => ({ answer: { rows: [queued({ state: "pending", attempts: 1 })] } }) },
    { name: "no row was written", step: "#7", with: () => ({ answer: { rows: [] } }) },
    { name: "never retried after the restart", step: "#10", with: () => ({ answer: { replies: [] } }) },
    { name: "retried, and the first attempt arrived too: twice", step: "#10", with: () => ({ answer: { replies: [reply(1, "On it."), reply(2, "On it.")] } }) },
    { name: "retried without its natural key", step: "#10", with: () => ({ answer: { replies: [reply(1, "On it.", null)] } }) },
    { name: "retried with other words", step: "#10", with: () => ({ answer: { replies: [reply(1, "On it!")] } }) },
    { name: "the retry wrote a second row", step: "#11", with: () => ({ answer: { rows: [queued(), queued()] } }) },
    { name: "no post was tried before the restart", step: "#5", with: () => ({ answer: { requests: [] } }) },
    { name: "two posts before the restart", step: "#5", with: () => ({ answer: { requests: [{ n: 1 }, { n: 2 }] } }) },
    { name: "the retry was never posted", step: "#12", with: () => ({ answer: { requests: [{ n: 1 }] } }) },
    { name: "the retry was posted twice", step: "#12", with: () => ({ answer: { requests: [{ n: 1 }, { n: 2 }, { n: 3 }] } }) },
  ],
};
