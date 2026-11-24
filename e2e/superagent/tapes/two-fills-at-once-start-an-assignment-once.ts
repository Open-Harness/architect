import { WORLD, row, told, ASK } from "../tape/tapekit.ts";

const started = (n: number) => ({ rows: Array.from({ length: n }, () => row("AssignmentStarted", "op:agent.tell")) });
const fills = (a: number, b: number) => ({ answers: [{ started: BigInt(a) }, { started: BigInt(b) }] });
export default {
  world: WORLD,
  steps: { "#5": { answer: fills(1, 0) }, "#7": { answer: started(1) }, "#11": { answer: started(1) }, "#12": { answer: { inputs: [told(ASK)] } } },
  plants: [
    { name: "both fills started the Assignment", step: "#5", with: () => ({ answer: fills(1, 1) }) },
    { name: "neither fill started it", step: "#5", with: () => ({ answer: fills(0, 0) }) },
    { name: "the loser of the race was refused instead of finding it started", step: "#5", with: () => ({ answer: { answers: [{ started: 1n }, { status: 409, body: "SeatTaken" }] } }) },
    { name: "the Assignment was seated twice", step: "#7", with: () => ({ answer: started(2) }) },
    { name: "it was never seated", step: "#7", with: () => ({ answer: started(0) }) },
    { name: "a later sweep started it again", step: "#11", with: () => ({ answer: started(2) }) },
    { name: "the executor was told twice", step: "#12", with: () => ({ answer: { inputs: [told(ASK), told(ASK, "submitted", "asg_2")] } }) },
  ],
};
