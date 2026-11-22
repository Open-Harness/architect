import { Blueprint, Cloud, Identity, Telemetry } from "orthograph";

// A world on the wall clock: nothing may move it (K23 section 1).
export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,
  database: Cloud.d1.local(),
  telemetry: [Telemetry.sink.local()],
  clock: Blueprint.clock.real(),
});
