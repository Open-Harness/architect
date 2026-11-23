import { Blueprint, Via } from "orthograph";
import { ApiKey } from "../thing.ts";
import { owner } from "../../organization/roles.ts";
import { Secret } from "../../../values/identity.ts";

export default Blueprint.operation(ApiKey, {
  description: "Create an API key in an organisation. The key itself is shown once.",
  payload: { organization: ApiKey.fields.organization, name: ApiKey.fields.name },
  // The key is handed to its caller once, in this answer, and nowhere else.
  answer: { apiKey: ApiKey.fields.id, key: Blueprint.issued(Secret) },
  // A key is made in person, never by a key or by an agent: a credential cannot mint its own kin (M2.03, `.via` narrows the entry).
  allowed: [owner.of("organization").via(Via.session, Via.device)],
  steps: { issue: Blueprint.step.database(), insert: Blueprint.step.database() },
  budget: { p95: "250 millis" },
});
