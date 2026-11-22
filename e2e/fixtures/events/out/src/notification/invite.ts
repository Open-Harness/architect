// Scaffolded from blueprint/things/notification/verbs/invite.ts. Yours from now on.
//
// "Sending" is one request to the sender the check runs on this machine: GET <SINK>/send?to=<address>&cause=<event id>.
// No email is sent. The check replaces SINK with its sender's address (a project that never does leaves "none", and the
// handler then only records the delivery, as the journeys need). The sender answers 200 (sent), 500 (down), or holds
// the request until the check lets it go, which is how a check kills a world in the middle of a delivery. Any answer
// but 200 is a defect (Effect.die), which the outbox retries; the delivery is recorded only after a 200, in this call's commit.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/notification/invite.handler.ts";
import { Notification } from "../../blueprint/things/notification/thing.ts";

const SINK = "__SINK__";

/** Tell someone an event happened to them: ask the sender, then keep one notification for the event. */
const invite: Handler = ({ to, cause }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    if (SINK.startsWith("http")) {
      const sent = yield* Effect.promise(() => fetch(`${SINK}/send?to=${encodeURIComponent(to)}&cause=${encodeURIComponent(cause)}`).then((r) => r.status, () => 0));
      if (sent !== 200) return yield* Effect.die(new Error(`the sender answered ${sent}`));
    }
    const notification = yield* Ids.of(Notification.fields.id);
    yield* steps.insert(records.insert(Notification, { id: notification, to, cause }));
    yield* move("delivered");
    return { notification };
  });

export default invite;
