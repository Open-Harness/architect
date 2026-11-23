import { WORLD, row } from "../tape/tapekit.ts";

const q = (o = {}) => row("ReplyQueued", "op:outgoing-message.send", o);
const reply = (n: number, text: string) => ({ n, ts: `1700000000.00010${n}`, text, key: "k" });
const thread = (...texts: Array<string>) => ({ replies: texts.map((t, i) => reply(i + 1, t)) });
const done = () => [q(), q(), q()];
export default {
  world: WORLD,
  steps: {
    "#5": { answer: { held: [{ n: 1 }] } },
    "#6": { answer: { answers: [{ message: "msg_one" }, { message: "msg_two" }] } },
    "#7": { answer: { rows: [q({ state: "claimed" })] } },
    "#10": { answer: thread("On it.", "one", "two") }, "#11": { answer: { rows: done() } },
  },
  plants: [
    { name: "Slack held nothing: the head was not mid-send", step: "#5", with: () => ({ answer: { held: [] } }) },
    { name: "the two replies were given the one message", step: "#6", with: () => ({ answer: { answers: [{ message: "msg_one" }, { message: "msg_one" }] } }) },
    { name: "one of the two replies was refused", step: "#6", with: () => ({ answer: { answers: [{ message: "msg_one" }, { status: 409, body: "conflict" }] } }) },
    { name: "only one reply was made", step: "#6", with: () => ({ answer: { answers: [{ message: "msg_one" }] } }) },
    { name: "two heads: both replies have a row", step: "#7", with: () => ({ answer: { rows: [q({ state: "claimed" }), q({ state: "pending" })] } }) },
    { name: "no head: nothing is sending", step: "#7", with: () => ({ answer: { rows: [] } }) },
    { name: "a reply was lost", step: "#10", with: () => ({ answer: thread("On it.", "one") }) },
    { name: "a reply was sent twice", step: "#10", with: () => ({ answer: thread("On it.", "one", "one", "two") }) },
    { name: "the head was not sent first", step: "#10", with: () => ({ answer: thread("one", "On it.", "two") }) },
    { name: "the head was sent twice and a reply lost", step: "#10", with: () => ({ answer: thread("On it.", "On it.", "two") }) },
    { name: "a row was left pending", step: "#11", with: () => ({ answer: { rows: [q(), q(), q({ state: "pending" })] } }) },
    { name: "a row was never made for the third", step: "#11", with: () => ({ answer: { rows: [q(), q()] } }) },
    { name: "REVIEW: the acknowledgement's row was done before Slack answered, and a reply holds the head", step: "#7", with: () => ({ answer: { rows: [q({ state: "delivered" }), q({ state: "claimed" })] } }) },
    { name: "REVIEW: each reply has a row of its own, already done", step: "#7", with: () => ({ answer: { rows: [q({ state: "claimed" }), q(), q()] } }) },
  ],
};
