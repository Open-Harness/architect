import { Blueprint, Cloud, Deploy, Identity } from "orthograph";

export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  deploy: {
    server: Deploy.worker({ domain: "api.staging.acme.dev" }),
    mcp: Deploy.worker({ domain: "mcp.staging.acme.dev" }),
    portal: Deploy.site({ domain: "staging.acme.dev" }),
  },
  publish: { sdk: Deploy.npm({ tag: "next" }), cli: Deploy.npm({ tag: "next" }) },
});
