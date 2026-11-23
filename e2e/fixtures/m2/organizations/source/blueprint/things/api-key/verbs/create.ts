import { Blueprint } from "orthograph";
import { ApiKey } from "../thing.js";
import { owner } from "../../organization/roles.js";
import { Secret } from "../../../values/secret.js";

export default Blueprint.operation(ApiKey, {
  description: "Create an API key in an organisation. The key itself is shown once.",
  payload: { organization: ApiKey.fields.organization, name: ApiKey.fields.name },
  // The key is handed to its caller once, in this answer, and nowhere else.
  answer: { apiKey: ApiKey.fields.id, key: Blueprint.issued(Secret) },
  allowed: [owner.of("organization")],
  steps: { issue: Blueprint.step.database(), insert: Blueprint.step.database() },
  budget: { p95: "250 millis" },
});
