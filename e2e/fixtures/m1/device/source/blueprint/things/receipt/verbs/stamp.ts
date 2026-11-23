import { Blueprint } from "orthograph";
import { Receipt } from "../thing.js";

// `runs: "client"`: the generated client runs this operation in the caller's own process, by the entry for its host
// (`stamp.node.js`, `stamp.browser.js`, `stamp.world.js`). Its two steps are spans, `receipt.stamp.prepare` and
// `receipt.stamp.seal`, as a server operation's steps are.
export default Blueprint.operation(Receipt, {
  description: "Stamp the text on this device, and say which host did it.",
  payload: { text: Blueprint.text({ max: 64 }) },
  answer: { stamp: Blueprint.text({ max: 128 }), host: Blueprint.text({ max: 16 }) },
  steps: { prepare: Blueprint.step.wait(), seal: Blueprint.step.wait() },
  allowed: [Blueprint.anyone],
  runs: "client",
});
