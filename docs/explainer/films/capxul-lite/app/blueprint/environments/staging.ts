import { Blueprint, Chain, Cloud, Deploy, Identity } from "orthograph";

export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  deploy: { server: Deploy.worker() },
  stores: { treasury: Chain.evm.network("base-sepolia") },
});
