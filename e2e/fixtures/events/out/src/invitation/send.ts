// Scaffolded from blueprint/things/invitation/verbs/send.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/invitation/send.handler.ts";
import { Invitation } from "../../blueprint/things/invitation/thing.ts";
import { InvitationBlocked } from "../../blueprint/things/invitation/errors.ts";

/** Send an invitation. An address at blocked.example is refused before anything is written, so nothing is announced. */
const send: Handler = ({ email }, { steps, move }) =>
  Effect.gen(function* () {
    if (email.endsWith("@blocked.example")) return yield* new InvitationBlocked({});
    const records = yield* Records;
    const invitation = yield* Ids.of(Invitation.fields.id);
    yield* steps.insert(records.insert(Invitation, { id: invitation, email }));
    yield* move("sent");
    return { invitation };
  });

export default send;
