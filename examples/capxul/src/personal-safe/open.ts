// Scaffolded from blueprint/things/personal-safe/verbs/open.ts. Yours from now on.
import { keccak_256 } from "@noble/hashes/sha3.js";
import { Effect } from "effect";
import { acting } from "orthograph";
import { Records } from "@orthograph/language-effect";
import { PersonalSafe } from "../../blueprint/things/personal-safe/thing.ts";
import { SafeSettings } from "../../blueprint/values/safe.ts";
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
/**
 * The CREATE2 salt's nonce, `uint256(keccak256("<namespace>:<person>"))` (CX-safe-machines §3). It names only the
 * person's id, never an email, since it is public once the Safe is deployed.
 */
const saltNonceOf = (namespace: string, person: string): bigint =>
  BigInt(`0x${Array.from(keccak_256(new TextEncoder().encode(`${namespace}:${person}`)), (b) => b.toString(16).padStart(2, "0")).join("")}`);

const open: Handler = (_payload, { principal, steps, move, id }) =>
  Effect.gen(function* () {
    // The Safe is the caller's own, signed in in person or through an agent acting for them.
    const who = acting(principal);
    if (!who) return yield* Effect.die(new Error("reached without a signed-in person"));
    const records = yield* Records;
    // Opened with no signer, first owner or account: those come with the claim (S1b).
    const saltNonce = saltNonceOf(SafeSettings.local.namespace, who.person);

    // Step insert: database, span personal-safe.open.insert.
    yield* steps.insert(records.insert(PersonalSafe, { id, person: who.person as never, saltNonce }));

    // The move open, to unclaimed.
    yield* move();

    return {
      // PersonalSafeOpened needs safe, and only the answer can give it.
      safe: id,
    };
  });

export default open;
