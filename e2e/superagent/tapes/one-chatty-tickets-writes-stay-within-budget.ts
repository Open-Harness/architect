import { WORLD, row } from "../tape/tapekit.ts";

const N = 8;
const many = (name: string, to: string, n = N, distinct = n) => Array.from({ length: n }, (_, i) => row(name, to, { subject: `sub_${i % distinct}` }));
const answers = (ids: ReadonlyArray<string>) => ({ answers: ids.map((input) => ({ input })) });
const ids = Array.from({ length: N }, (_, i) => `inp_${i}`);
export default {
  world: WORLD,
  steps: {
    "#4": { answer: answers(ids) },
    "#6": { answer: { rows: many("InputStored", "op:input.route") } },
    "#7": { answer: { rows: many("InputRouted", "op:agent.tell") } },
    "#8": { answer: { seq: 90, conflicts: 11 } },
  },
  plants: [
    { name: "REVIEW: one write was refused (a 409 surfaced), seven stored", step: "#4", with: () => ({ answer: { answers: [...ids.slice(0, 7).map((input) => ({ input })), { status: 409, body: {} }] } }) },
    { name: "REVIEW: every steer's tell failed after its retries; routed rows exist but nothing was told", step: "#7", with: () => ({ answer: { rows: Array.from({ length: N }, (_, i) => row("InputRouted", "op:agent.tell", { subject: `sub_${i}`, state: "failed", attempts: 5 })) } }) },
    { name: "one write was lost: seven answers", step: "#4", with: () => ({ answer: answers(ids.slice(0, 7)) }) },
    { name: "two writes got one input: a lost bump", step: "#4", with: () => ({ answer: answers([...ids.slice(0, 7), "inp_0"]) }) },
    { name: "a write was stored twice by a retried commit", step: "#6", with: () => ({ answer: { rows: many("InputStored", "op:input.route", N + 1) } }) },
    { name: "a write was lost", step: "#6", with: () => ({ answer: { rows: many("InputStored", "op:input.route", N - 1) } }) },
    { name: "a write was routed twice", step: "#7", with: () => ({ answer: { rows: many("InputRouted", "op:agent.tell", N + 1, N) } }) },
    { name: "two routes went to one subject: one write's tell was lost", step: "#7", with: () => ({ answer: { rows: many("InputRouted", "op:agent.tell", N, N - 1) } }) },
    { name: "more lost races than eight writers can lose", step: "#8", with: () => ({ answer: { seq: 90, conflicts: 29 } }) },
    { name: "seven answers and a refusal: eight answers, but a write was lost", step: "#4", with: () => ({ answer: { answers: [...ids.slice(0, 7).map((input) => ({ input })), { status: 409, body: "conflict" }] } }) },
    { name: "eight tells, none delivered", step: "#7", with: () => ({ answer: { rows: Array.from({ length: N }, (_, i) => row("InputRouted", "op:agent.tell", { subject: `sub_${i}`, state: "failed" })) } }) },
  ],
};
