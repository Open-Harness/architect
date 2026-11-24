import { WORLD, step } from "../tape/tapekit.ts";

const update = { branch: "fix-login", from: "0000", to: "1111" };
const pr = (head: string, number = 2) => ({ number, head, state: "open" });
export default {
  world: WORLD,
  steps: {
    "#12": { answer: { requests: [{ n: 1 }, { n: 2 }] } },
    "#5": { answer: { held: [{ n: 1 }] } }, "#6": { answer: { pid: 4242 } },
    "#10": { answer: { updates: [update] } }, "#11": { answer: { pulls: [pr("fix-login")] } },
    "#13": { answer: { steps: [step(1, "push"), step(2, "pr"), step(3, "Opened.")] } }, "#14": { answer: { unused: 0 } },
  },
  plants: [
    { name: "the push ran again: two updates of the branch", step: "#10", with: () => ({ answer: { updates: [update, { ...update, from: "1111", to: "2222" }] } }) },
    { name: "no update of the branch at all", step: "#10", with: () => ({ answer: { updates: [] } }) },
    { name: "the pull request was opened again: two pull requests", step: "#11", with: () => ({ answer: { pulls: [pr("fix-login"), pr("fix-login", 3)] } }) },
    { name: "a pull request on another branch", step: "#11", with: () => ({ answer: { pulls: [pr("other")] } }) },
    { name: "no pull request", step: "#11", with: () => ({ answer: { pulls: [] } }) },
    { name: "a model round was committed twice", step: "#13", with: () => ({ answer: { steps: [step(1, "push"), step(2, "pr"), step(2, "pr"), step(3, "Opened.")] } }) },
    { name: "nothing was held when the runner was killed", step: "#5", with: () => ({ answer: { held: [] } }) },
    { name: "a scripted turn was never used", step: "#14", with: () => ({ answer: { unused: 1 } }) },
    { name: "the one pull request is closed", step: "#11", with: () => ({ answer: { pulls: [{ number: 2, head: "fix-login", state: "closed" }] } }) },
    { name: "the call was never run again: GitHub took it once", step: "#12", with: () => ({ answer: { requests: [{ n: 1 }] } }) },
    { name: "the call was run three times", step: "#12", with: () => ({ answer: { requests: [{ n: 1 }, { n: 2 }, { n: 3 }] } }) },
  ],
};
