import { Blueprint } from "orthograph";

/** A worker's kind: one conversation per run. It gets the task, its done-when, its thread and the mission. */
export default Blueprint.agent({
  model: "set per saved agent",
  // AARON: first-principles 19 to 23 say a worker is "the same agent in a role", and screens.md keeps a saved Agent
  // with versions. Which it is decides whether there is an AgentKind thing with `versions:`. Board decision 6.
});
