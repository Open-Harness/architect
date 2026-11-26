import { Blueprint, Chain, Cloud, Identity } from "orthograph";

export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals, // fixed test people, each with a wallet
  database: Cloud.d1.local(),
  stores: { treasury: Chain.evm.network("anvil") }, // a local chain, a process
});
