import { Blueprint } from "orthograph";
import { Millis, Probe } from "../thing.ts";

export default Blueprint.operation(Probe, {
  description: "Read the server's clock, pass that time to the database, and read back what the database holds.",
  payload: {},
  answer: { probe: Probe.fields.id, clock: Millis, stored: Millis },
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { store: Blueprint.step.database(), load: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
