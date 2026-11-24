import { Blueprint, Cloud, Identity, Telemetry } from "orthograph";

// Capxul's local world stands still at Tuesday 1 December 2026, nine in the morning UTC, until a journey moves it (K23
// section 1). Only interview feedback reads it, for HRMS's `validate_interview_date` (`decisions/CX-recruitment.md`).
export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals, // fixed test people, no sign-in
  database: Cloud.d1.local(), // the local runtime emulates D1: no database process
  telemetry: [Telemetry.sink.local()], // prove's Collector, a process of its own
  clock: Blueprint.clock.stepped({ starts: "2026-12-01T09:00:00Z" }),
});
