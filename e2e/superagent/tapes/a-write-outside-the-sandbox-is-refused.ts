import { WORLD } from "../tape/tapekit.ts";

const seen = (...refusals: Array<{ name: string; detail: string }>) => ({ sandboxes: [{ sandbox: "sbx_1", state: "open", root: "/tmp/sbx_1/root", refusals }] });
const OUT = { name: "OutsideSandbox", detail: "../../outside.txt is outside /tmp/sbx_1/root" };
export default {
  world: WORLD,
  steps: {
    "#4": { answer: seen(OUT) }, "#5": { answer: seen(OUT) },
    "#6": { answer: { requests: [{ n: 3 }] } }, "#7": { answer: { requests: [{ n: 1 }, { n: 2 }, { n: 3 }] } }, "#8": { answer: { unused: 0 } },
  },
  plants: [
    { name: "REVIEW: the refusal names the path but no root", step: "#5", with: () => ({ answer: seen({ name: "OutsideSandbox", detail: "../../outside.txt is outside" }) }) },
    { name: "REVIEW: the refusal names the path and a different root", step: "#5", with: () => ({ answer: seen({ name: "OutsideSandbox", detail: "../../outside.txt is outside /somewhere/else" }) }) },
    { name: "the write went through", step: "#4", with: () => ({ answer: seen() }) },
    { name: "refused, but under another name", step: "#4", with: () => ({ answer: seen({ name: "BlockedCommand", detail: OUT.detail }) }) },
    { name: "refused twice", step: "#4", with: () => ({ answer: seen(OUT, OUT) }) },
    { name: "the refusal names no path", step: "#5", with: () => ({ answer: seen({ name: "OutsideSandbox", detail: "refused" }) }) },
    { name: "the model never read the refusal", step: "#6", with: () => ({ answer: { requests: [] } }) },
    { name: "the model read the refusal twice", step: "#6", with: () => ({ answer: { requests: [{ n: 2 }, { n: 3 }] } }) },
    { name: "the write inside the folder was refused too, so the model never went on", step: "#7", with: () => ({ answer: { requests: [] } }) },
  ],
};
