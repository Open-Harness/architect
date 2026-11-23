// Scaffolded from blueprint/things/link/verbs/remove.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Profile } from "../../blueprint/things/profile/thing.ts";
import type { Handler } from "../../generated/api/src/link/remove.handler.ts";

/**
 * link.remove: Remove a link from a public page.
 *
 * Who may call, from blueprint/things/link/roles.ts:
 *   the linkOwner of the link: (link, caller) => link.owner === caller.person
 *
 * Payload, from blueprint/things/link/verbs/remove.ts:
 *   link  link.id
 *
 * Answer: nothing.
 *
 * Refusals:
 *   LinkNotListed  exit 31  LN-900  the runtime's, when the link isn't in listed, carrying state; from blueprint/things/link/machine.ts
 *   NotAllowed     exit 3   AR-001  the runtime's, when the caller isn't the linkOwner of the link; from blueprint/things/link/roles.ts
 *
 * Budget, from blueprint/things/link/verbs/remove.ts: p95 150ms.
 *
 * The link's machine, from blueprint/things/link/machine.ts (▶ marks this call):
 *     from       move    to       emits
 *     (creates)  add     listed   LinkAdded
 *   ▶ listed     remove  removed  LinkRemoved
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the linkOwner of the link;
 *   before it runs, it refuses LinkNotListed unless the link is in listed;
 *   before it runs, it hands in the link it read as subject, so this handler never reads it again;
 *   each step is its own span: link.remove.record;
 *   once it answers, it sets the link's state to removed;
 *   once it answers, it writes LinkRemoved: link from the payload;
 *   the call is the span link.remove, and its commit link.remove.commit.
 */
const remove: Handler = ({ link }, { subject, steps, move }) =>
  Effect.gen(function* () {
    if (!subject) return yield* Effect.die(new Error(`link ${link} was checked and then not found`));
    const records = yield* Records;
    // Step record: database, span link.remove.record. The page stops listing it; the others keep their order.
    yield* steps.record(
      Effect.gen(function* () {
        const profile = yield* records.find(Profile, subject.profile);
        if (!profile) return yield* Effect.die(new Error(`link ${link} is on a page that is gone`));
        yield* records.update(Profile, subject.profile, { links: (profile["links"] as ReadonlyArray<string>).filter((id) => id !== link) as never });
        // The move remove, from listed, to removed.
        yield* move();
      }),
    );

    return {};
  });

export default remove;
