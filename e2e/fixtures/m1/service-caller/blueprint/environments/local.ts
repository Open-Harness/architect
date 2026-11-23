import { Blueprint, Cloud, Telemetry } from "orthograph";

export default Blueprint.environment({
  runs: "on this machine",
  // `issues` absent: every way in, and a world mints each for a journey (M2-auth, "Smaller calls" 4).
  database: Cloud.d1.local(), // the local runtime emulates D1: no database process
  telemetry: [Telemetry.sink.local()], // prove's Collector, a process of its own
});
