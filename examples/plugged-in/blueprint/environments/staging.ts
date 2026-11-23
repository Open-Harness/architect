import { Blueprint, Cloud, Deploy, Identity } from "orthograph";

// A Worker on Cloudflare `workers.dev` with D1 and no domain, made and destroyed by `ortho env up|destroy staging --run <id>` (M7.03, M7.04).
export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  deploy: { server: Deploy.worker() },
});
