import { Blueprint, Cloud, Identity, Telemetry } from "orthograph";

// The probe's local world stands still at 10 January 2027, nine in the morning UTC, until something moves it (K23).
export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,
  database: Cloud.d1.local(),
  telemetry: [Telemetry.sink.local()],
  clock: Blueprint.clock.stepped({ starts: "2027-01-10T09:00:00Z" }),
});
