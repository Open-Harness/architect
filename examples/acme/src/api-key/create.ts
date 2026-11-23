// Scaffolded from blueprint/things/api-key/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Auth, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/api-key/create.handler.ts";
import { ApiKey } from "../../blueprint/things/api-key/thing.ts";

/** Create an API key in an organisation, on its owner's behalf. The key itself is answered once and never kept. */
const create: Handler = ({ organization, name }, { principal, steps }) =>
  Effect.gen(function* () {
    // A key is made in person: the declaration says `.via(Via.session, Via.device)`, so neither an agent nor a key reaches here.
    if (principal.kind !== "person") return yield* Effect.die(new Error("reached without a signed-in person"));
    const auth = yield* Auth;
    const records = yield* Records;
    const issued = yield* steps.issue(auth.createApiKey({ person: principal.person, name }));
    const apiKey = issued.apiKey as never;
    yield* steps.insert(records.insert(ApiKey, { id: apiKey, organization, name, createdBy: principal.person as never }));
    return { apiKey, key: issued.key };
  });

export default create;
