// Scaffolded from blueprint/things/invitation/verbs/send.ts. Yours from now on.
import { Effect } from "effect";
import { acting } from "orthograph";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/invitation/send.handler.ts";
import { Invitation } from "../../blueprint/things/invitation/thing.ts";

/** Invite someone to an organisation by email. Only its owner gets this far. */
const send: Handler = ({ organization, email }, { principal, steps, move }) =>
  Effect.gen(function* () {
    // The owner's agent holds the owner's role (M2-auth, fork 2): the invitation is the person's, sent by hands that may be an agent's.
    const who = acting(principal);
    if (!who) return yield* Effect.die(new Error("reached without a signed-in person"));
    const records = yield* Records;
    const invitation = yield* Ids.of(Invitation.fields.id);
    yield* steps.insert(records.insert(Invitation, { id: invitation, organization, email, invitedBy: who.person as never }));
    yield* move("pending");
    return { invitation };
  });

export default send;
