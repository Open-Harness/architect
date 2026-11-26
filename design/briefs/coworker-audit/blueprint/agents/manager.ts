import { Blueprint } from "orthograph";

/** A manager's kind: one durable conversation per manager, for good. Its tools are this blueprint's operations. */
export default Blueprint.agent({
  model: "set per workspace", // GAP workspace-models: a model is an environment setting today, not a workspace's own connection
  // GAP agent-tools: tools from operations are decided (K40 fix 3, M4.07) and not built.
  // The manager never waits inside a tool call: asking is `ask.raise`, and the answer wakes it as an event (K46 call 2).
});
