// Scaffolded from blueprint/things/safe/verbs/record.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/safe/record.handler.ts";

/**
 * safe.record: Record your own Safe, at the address it will have once deployed. Nothing is sent to the chain.
 *
 * Who may call, from blueprint/things/safe/verbs/record.ts:
 *   anyone signed in
 *
 * Payload: none.
 *
 * Answer, from blueprint/things/safe/verbs/record.ts:
 *   safe     safe.id
 *   account  safe.account
 *
 * Refusals:
 *   SafeAlreadyRecorded  exit 41   SF-001  the runtime's: another safe holds this salt nonce (safe.oneSafeEach); from blueprint/things/safe/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't anyone signed in; from blueprint/things/safe/verbs/record.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/safe/verbs/record.ts
 *
 * Idempotent by request, from blueprint/things/safe/verbs/record.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/safe/verbs/record.ts: p95 150ms.
 *
 * The safe's machine, from blueprint/things/safe/machine.ts (▶ marks this call):
 *     from       move           to              emits
 *   ▶ (creates)  record         counterfactual  PersonalSafeRecorded
 *     (creates)  recordCompany  counterfactual  CompanySafeRecorded
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is signed in;
 *   before it runs, it mints the safe's new id and hands it in as id;
 *   each step is its own span: safe.record.insert;
 *   once it answers, it sets the safe's state to counterfactual;
 *   once it answers, it writes PersonalSafeRecorded: safe and account from the answer, person from the safe as the call left it;
 *   the call is the span safe.record, and its commit safe.record.commit.
 */
const record: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step insert: database, span safe.record.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move record, to counterfactual.
    yield* move();

    return {
      // PersonalSafeRecorded needs safe, and only the answer can give it.
      safe: id,
      account: yield* Handlers.blank("account, a safe.account"),
    };
  });

export default record;
