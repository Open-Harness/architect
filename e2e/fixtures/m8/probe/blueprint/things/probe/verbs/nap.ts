import { Blueprint } from "orthograph";
import { Millis, Probe } from "../thing.ts";

export default Blueprint.operation(Probe, {
  description: "Sleep through Timers for a number of seconds, then say when the sleep began and when it woke.",
  payload: { seconds: Millis },
  answer: { began: Millis, woke: Millis },
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { sleep: Blueprint.step.wait() },
  budget: { p95: "150 millis" },
});
