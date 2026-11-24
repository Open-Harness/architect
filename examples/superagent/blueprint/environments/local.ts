import { Blueprint, Cloud, Identity, Telemetry } from "orthograph";

export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals, // fixed test people, no sign-in
  clock: Blueprint.clock.stepped({ starts: "2026-12-01T09:00:00.000Z" }), // stepped: a journey moves time by its steps, and a wait of 5 s or 2 weeks costs nothing
  database: Cloud.d1.local(), // the local runtime emulates D1: no database process
  telemetry: [Telemetry.sink.local()], // prove's Collector, a process of its own
});
