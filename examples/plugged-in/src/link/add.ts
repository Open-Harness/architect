// Scaffolded from blueprint/things/link/verbs/add.ts. Yours from now on.
import { Effect } from "effect";
import { acting } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/link/add.handler.ts";
import { oneNamePerPerson } from "../../blueprint/things/handle/invariants.ts";
import { Link } from "../../blueprint/things/link/thing.ts";
import { Profile } from "../../blueprint/things/profile/thing.ts";
import { onePagePerHandle } from "../../blueprint/things/profile/invariants.ts";

const { LinkNeedsHandle } = Errors.declared;

/**
 * link.add: Append a link to your own public page. You need a claimed name first.
 *
 * Who may call, from blueprint/things/link/verbs/add.ts:
 *   anyone signed in
 *
 * Payload, from blueprint/things/link/verbs/add.ts:
 *   title  link.title
 *   url    link.url
 *
 * Answer, from blueprint/things/link/verbs/add.ts:
 *   link  link.id
 *
 * Refusals:
 *   LinkNeedsHandle  exit 30  LN-001  yours to refuse below; from blueprint/things/link/errors.ts
 *   NotAllowed       exit 3   AR-001  the runtime's, when the caller isn't anyone signed in; from blueprint/things/link/verbs/add.ts
 *
 * Idempotent by request, from blueprint/things/link/verbs/add.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/link/verbs/add.ts: p95 150ms.
 *
 * The link's machine, from blueprint/things/link/machine.ts (▶ marks this call):
 *     from       move    to       emits
 *   ▶ (creates)  add     listed   LinkAdded
 *     listed     remove  removed  LinkRemoved
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is signed in;
 *   before it runs, it mints the link's new id and hands it in as id;
 *   each step is its own span: link.add.load, link.add.record;
 *   once it answers, it sets the link's state to listed;
 *   once it answers, it writes LinkAdded: link from the answer;
 *   the call is the span link.add, and its commit link.add.commit.
 */
const add: Handler = ({ title, url }, { principal, steps, move, id }) =>
  Effect.gen(function* () {
    // `signedIn` admits a person and an agent acting for one (M2-auth, fork 2): the page is the person's either way.
    const who = acting(principal);
    if (!who) return yield* Effect.die(new Error("reached without a signed-in person"));
    const records = yield* Records;
    // Step load: database, span link.add.load.
    const page = yield* steps.load(records.findBy(oneNamePerPerson, who.person as never));

    // LinkNeedsHandle: exit 30, LN-001. The caller holds no claimed name.
    if (!page) {
      yield* Effect.logInfo("the caller holds no claimed handle");
      return yield* new LinkNeedsHandle({});
    }

    // The page is the profile the claim made with the handle; the link goes last in its order.
    const profile = yield* steps.load(records.findBy(onePagePerHandle, page["id"] as never));
    if (!profile) return yield* Effect.die(new Error(`handle ${String(page["id"])} holds a name but has no profile`));

    // Step record: database, span link.add.record.
    yield* steps.record(
      Effect.gen(function* () {
        yield* records.insert(Link, { id, profile: profile["id"] as never, owner: who.person as never, title, url });
        yield* records.update(Profile, profile["id"] as never, { links: [...(profile["links"] as ReadonlyArray<string>), id] as never });
      }),
    );

    // The move add, to listed.
    yield* move();

    return {
      // LinkAdded needs link, and only the answer can give it.
      link: id,
    };
  });

export default add;
