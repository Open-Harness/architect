import { Blueprint, Cloud, Identity, Telemetry } from "orthograph";

export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals, // fixed test people, no sign-in
  database: Cloud.d1.local(), // the local runtime emulates D1: no database process
  telemetry: [Telemetry.sink.local()], // prove's Collector, a process of its own
});
