import { Blueprint, Chain, Cloud, Identity, Telemetry } from "orthograph";

export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals, // see journeys/README.md, question 8: a cast member holds a wallet, so this may change
  database: Cloud.d1.local(), // the local runtime emulates D1: no database process
  stores: { budgets: Chain.evm.network("anvil") }, // a plain local Anvil process; the world makes its own funded keys
  telemetry: [Telemetry.sink.local()], // prove's Collector, a process of its own
});
