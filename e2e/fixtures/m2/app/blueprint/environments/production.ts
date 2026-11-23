import { Blueprint, Cloud, Deploy, Identity } from "orthograph";

export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  promotesFrom: "staging", // only a revision with a green verdict there
  deploy: {
    server: Deploy.worker({ domain: "api.acme.dev" }),
    mcp: Deploy.worker({ domain: "mcp.acme.dev" }), // a remote MCP server agents connect to
    portal: Deploy.site({ domain: "acme.dev" }),
  },
  publish: {
    sdk: Deploy.npm(),
    cli: [Deploy.npm(), Deploy.homebrew({ tap: "acme/tap" }), Deploy.binaries({ on: "github-releases" })],
  },
});
