// Scaffolded from blueprint/things/personal-safe/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/personal-safe/claim.handler.ts";

const { SignerNotProven } = Errors.declared;

/**
 * personal-safe.claim: Claim your Safe with the key you sign with, proving you hold it. This works out its address; nothing is sent to the chain.
 *
 * Who may call, from blueprint/things/personal-safe/roles.ts:
 *   the holder of the personal-safe: (safe, caller) => safe.person === caller.person
 *
 * Payload, from blueprint/things/personal-safe/verbs/claim.ts:
 *   safe    personal-safe.id
 *   signer  EvmAddress
 *   proof   PersonalSignature
 *
 * Answer, from blueprint/things/personal-safe/verbs/claim.ts:
 *   safe     personal-safe.id
 *   account  account
 *
 * Refusals:
 *   SignerNotProven           exit 42   SF-002  yours to refuse below, carrying signer; from blueprint/things/personal-safe/errors.ts
 *   SafeAlreadyOpen           exit 41   SF-001  the runtime's: another personal safe holds this person (personal-safe.oneSafePerPerson); from blueprint/things/personal-safe/invariants.ts
 *   PersonalSafeNotUnclaimed  exit 40   SF-900  the runtime's, when the personal-safe isn't in unclaimed, carrying state; from blueprint/things/personal-safe/machine.ts
 *   NotAllowed                exit 3    AR-001  the runtime's, when the caller isn't the holder of the personal-safe; from blueprint/things/personal-safe/roles.ts
 *   IdempotencyConflict       exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/personal-safe/verbs/claim.ts
 *
 * Idempotent by request, from blueprint/things/personal-safe/verbs/claim.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/personal-safe/verbs/claim.ts: p95 150ms.
 *
 * The personal-safe's machine, from blueprint/things/personal-safe/machine.ts (▶ marks this call):
 *     from       move   to         emits
 *     (creates)  open   unclaimed  PersonalSafeOpened
 *   ▶ unclaimed  claim  claimed    PersonalSafeClaimed
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the holder of the personal-safe;
 *   before it runs, it refuses PersonalSafeNotUnclaimed unless the personal-safe is in unclaimed;
 *   before it runs, it hands in the personal-safe it read as subject, so this handler never reads it again;
 *   each step is its own span: personal-safe.claim.update;
 *   once it answers, it sets the personal-safe's state to claimed;
 *   once it answers, it writes PersonalSafeClaimed: safe and account from the answer, person from the personal-safe as the call left it, signer from the payload;
 *   the call is the span personal-safe.claim, and its commit personal-safe.claim.commit.
 */
const claim: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // SignerNotProven: exit 42, SF-002.
    if (yield* Handlers.blank<boolean>("refuse SignerNotProven when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why SignerNotProven was refused"));
      return yield* new SignerNotProven({
        signer: yield* Handlers.blank("SignerNotProven.signer, an EvmAddress"),
      });
    }

    // Step update: database, span personal-safe.claim.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move claim, from unclaimed, to claimed.
    yield* move();

    return {
      safe: yield* Handlers.blank("safe, a personal-safe.id"),
      account: yield* Handlers.blank("account, an account"),
    };
  });

export default claim;
