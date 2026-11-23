import { Blueprint } from "orthograph";

/** The main agent: one per superagent, for good. It reads what the gate lets through and decides what becomes work; it never waits. */
export default Blueprint.agent({
  model: "deepseek-v4-flash-0731", // the cheapest that judges well, set per environment
  hooks: { beforeTool: "noWait" }, // no sleep; shell 30 s; a job wait 5 s
});
