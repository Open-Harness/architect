import { Blueprint, Cloud, Identity, Telemetry } from "orthograph";

// acme's local world on a stepped clock (m2 check 10): it stands at 10 January 2027, nine in the morning UTC, until a step moves it.
export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,
  database: Cloud.d1.local(),
  telemetry: [Telemetry.sink.local()],
  clock: Blueprint.clock.stepped({ starts: "2027-01-10T09:00:00Z" }),
});
