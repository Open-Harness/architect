import { Blueprint, Cloud, Identity, Telemetry } from "orthograph";

// The control: the same probe in a world that declares no clock, so nothing of time's surface is needed.
export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,
  database: Cloud.d1.local(),
  telemetry: [Telemetry.sink.local()],
});
