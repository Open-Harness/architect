// Scaffolded from blueprint/things/invitation/verbs/accept.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/invitation/accept.handler.ts";
import { Invitation } from "../../blueprint/things/invitation/thing.ts";
import { Membership } from "../../blueprint/things/membership/thing.ts";

/** Accept an invitation: the invitee becomes a member of its organisation. */
const accept: Handler = ({ invitation }, { principal, steps, move }) =>
  Effect.gen(function* () {
    // Consent is a person's own act: the declaration says `.notVia(Via.agent)`, so an agent never reaches here, and a guard that means "a person" says so.
    if (principal.kind !== "person") return yield* Effect.die(new Error("reached without a signed-in person"));
    const records = yield* Records;
    // Only the invitee may accept, so the runtime has found the invitation before this runs.
    const found = yield* records.find(Invitation, invitation);
    if (!found) return yield* Effect.die(new Error(`invitation ${invitation} was checked and then not found`));
    const organization = found["organization"] as never;
    const membership = yield* Ids.of(Membership.fields.id);
    yield* steps.join(records.insert(Membership, { id: membership, organization, person: principal.person as never, role: "member" }));
    yield* move("accepted");
    return { organization, membership };
  });

export default accept;
