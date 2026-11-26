import { Blueprint, Cloud, Deploy, Identity } from "orthograph";

// A Worker on Cloudflare `workers.dev` with D1 and no domain, as Plugged In's, made and destroyed by
// `ortho env up|destroy staging --run <id> --root examples/capxul` (CX-staging, `design/decisions/CX-staging.md`).
export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  deploy: { server: Deploy.worker() },
});
