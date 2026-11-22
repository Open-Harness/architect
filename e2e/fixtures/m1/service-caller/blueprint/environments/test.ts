import { Blueprint, Cloud, Via } from "orthograph";

export default Blueprint.environment({
  runs: "a fresh world for each pull request",
  lifetime: "2 hours", // created and destroyed as one unit, with an owner and an expiry
  issues: [Via.session, Via.key, Via.device, Via.agent],
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
});
