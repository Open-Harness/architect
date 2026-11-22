import { Blueprint } from "orthograph";
import { Probe } from "../thing.ts";

export default Blueprint.operation(Probe, {
  description: "Stay busy, as counted work, until the gate at origin answers.",
  payload: { origin: Blueprint.text({ max: 200 }) },
  answer: { done: Blueprint.text({ max: 20 }) },
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { wait: Blueprint.step.wait() },
  budget: { p95: "150 millis" },
});
