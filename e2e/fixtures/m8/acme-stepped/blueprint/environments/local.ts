import { Blueprint, Cloud, Identity, Telemetry } from "orthograph";

// acme's local world on a stepped clock: sessions are made by Better Auth inside the world, at the world's time.
export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,
  database: Cloud.d1.local(),
  telemetry: [Telemetry.sink.local()],
  clock: Blueprint.clock.stepped({ starts: "2027-01-10T09:00:00Z" }),
});
