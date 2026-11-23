// Scaffolded from blueprint/things/session/verbs/show.ts. Yours from now on.
import { Effect } from "effect";
import { acting } from "orthograph";
import type { Handler } from "../../generated/api/src/session/show.handler.ts";

/** Who is signed in, and how: the principal the runtime resolved from the bearer token. An agent is signed in for its person, and says `agent`. */
const show: Handler = (_payload, { principal }) => {
  const who = acting(principal);
  return who?.email !== undefined
    ? Effect.succeed({ person: who.person as never, email: who.email, via: who.via })
    : Effect.die(new Error("reached without a signed-in person"));
};

export default show;
