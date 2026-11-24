import { WORLD } from "../tape/tapekit.ts";

const exec = (command: Array<string>, exit: number) => ({ command, exit, lent: [] as Array<string> });
const seen = (refusals: Array<{ name: string; detail: string }>, execs = [exec(["echo", "fine"], 0), exec(["echo", "sudo"], 0), exec(["sudo", "ls"], 126)]) => ({ sandboxes: [{ sandbox: "sbx_1", state: "open", refusals, execs }] });
const BLOCK = { name: "BlockedCommand", detail: "BlockedCommand: sudo" };
export default {
  world: WORLD,
  steps: {
    "#1": { answer: { settings: "set_1", revision: 1n } },
    "#5": { answer: seen([BLOCK]) }, "#6": { answer: seen([BLOCK]) },
    "#7": { answer: { requests: [{ n: 4 }] } }, "#8": { answer: { unused: 0 } },
  },
  plants: [
    { name: "the block was not saved", step: "#1", with: () => ({ answer: { settings: "set_1", revision: 2n } }) },
    { name: "refused under the wrong name", step: "#5", with: () => ({ answer: seen([{ name: "OutsideSandbox", detail: "sudo" }]) }) },
    { name: "the refusal does not name the command", step: "#5", with: () => ({ answer: seen([{ name: "BlockedCommand", detail: "refused" }]) }) },
    { name: "the blocked command ran", step: "#5", with: () => ({ answer: seen([]) }) },
    { name: "the blocked command is counted as having run", step: "#6", with: () => ({ answer: seen([BLOCK], [exec(["echo", "fine"], 0), exec(["sudo", "ls"], 0)]) }) },
    { name: "the ordinary command was blocked too", step: "#6", with: () => ({ answer: seen([BLOCK], [exec(["sudo", "ls"], 126)]) }) },
    { name: "the model never read the name", step: "#7", with: () => ({ answer: { requests: [] } }) },
    { name: "the shim for the blocked name exited 1, not the 126 the bridge's shim gives", step: "#6", with: () => ({ answer: seen([BLOCK], [exec(["echo", "fine"], 0), exec(["sudo", "ls"], 1)]) }) },
    { name: "a command that merely names sudo was blocked", step: "#6", with: () => ({ answer: seen([BLOCK], [exec(["echo", "fine"], 0), exec(["sudo", "ls"], 126)]) }) },
  ],
};
