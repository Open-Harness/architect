import { Blueprint, Cloud, Identity } from "orthograph";

export default Blueprint.environment({
  runs: "a fresh world for each pull request",
  lifetime: "2 hours", // created and destroyed as one unit, with an owner and an expiry
  identity: Identity.testPrincipals,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
});
