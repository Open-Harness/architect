// Scaffolded from blueprint/things/personal-safe/verbs/open.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/personal-safe/open.handler.ts";

/**
 * personal-safe.open: Open your own Safe. It has no address until you claim it with the key you sign with.
 *
 * Who may call, from blueprint/things/personal-safe/verbs/open.ts:
 *   anyone signed in
 *
 * Payload: none.
 *
 * Answer, from blueprint/things/personal-safe/verbs/open.ts:
 *   safe  personal-safe.id
 *
 * Refusals:
 *   SafeAlreadyOpen      exit 41   SF-001  the runtime's: another personal safe holds this person (personal-safe.oneSafePerPerson); from blueprint/things/personal-safe/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't anyone signed in; from blueprint/things/personal-safe/verbs/open.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/personal-safe/verbs/open.ts
 *
 * Idempotent by request, from blueprint/things/personal-safe/verbs/open.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/personal-safe/verbs/open.ts: p95 150ms.
 *
 * The personal-safe's machine, from blueprint/things/personal-safe/machine.ts (▶ marks this call):
 *     from       move  to         emits
 *   ▶ (creates)  open  unclaimed  PersonalSafeOpened
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is signed in;
 *   before it runs, it mints the personal-safe's new id and hands it in as id;
 *   each step is its own span: personal-safe.open.insert;
 *   once it answers, it sets the personal-safe's state to unclaimed;
 *   once it answers, it writes PersonalSafeOpened: safe from the answer, person from the personal-safe as the call left it;
 *   the call is the span personal-safe.open, and its commit personal-safe.open.commit.
 */
const open: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step insert: database, span personal-safe.open.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move open, to unclaimed.
    yield* move();

    return {
      // PersonalSafeOpened needs safe, and only the answer can give it.
      safe: id,
    };
  });

export default open;
