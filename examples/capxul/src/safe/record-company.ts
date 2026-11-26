// Scaffolded from blueprint/things/safe/verbs/record-company.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/safe/record-company.handler.ts";

const { FounderHasNoSafe } = Errors.declared;

/**
 * safe.record-company: Record a company's Safe, owned by its founder's own Safe, at the address it will have once deployed.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/safe/verbs/record-company.ts:
 *   company  company.id
 *
 * Answer, from blueprint/things/safe/verbs/record-company.ts:
 *   safe     safe.id
 *   account  safe.account
 *
 * Refusals:
 *   FounderHasNoSafe     exit 42   SF-002  yours to refuse below, carrying company; from blueprint/things/safe/errors.ts
 *   SafeAlreadyRecorded  exit 41   SF-001  the runtime's: another safe holds this salt nonce (safe.oneSafeEach); from blueprint/things/safe/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/safe/verbs/record-company.ts
 *
 * Idempotent by request, from blueprint/things/safe/verbs/record-company.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/safe/verbs/record-company.ts: p95 150ms.
 *
 * The safe's machine, from blueprint/things/safe/machine.ts (▶ marks this call):
 *     from       move           to              emits
 *     (creates)  record         counterfactual  PersonalSafeRecorded
 *   ▶ (creates)  recordCompany  counterfactual  CompanySafeRecorded
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the safe's new id and hands it in as id;
 *   each step is its own span: safe.record-company.load, safe.record-company.insert;
 *   once it answers, it sets the safe's state to counterfactual;
 *   once it answers, it writes CompanySafeRecorded: safe and account from the answer, company from the payload;
 *   the call is the span safe.record-company, and its commit safe.record-company.commit.
 */
const recordCompany: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step load: database, span safe.record-company.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // FounderHasNoSafe: exit 42, SF-002.
    if (yield* Handlers.blank<boolean>("refuse FounderHasNoSafe when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FounderHasNoSafe was refused"));
      return yield* new FounderHasNoSafe({
        company: yield* Handlers.blank("FounderHasNoSafe.company, a company.id"),
      });
    }

    // Step insert: database, span safe.record-company.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move recordCompany, to counterfactual.
    yield* move();

    return {
      // CompanySafeRecorded needs safe, and only the answer can give it.
      safe: id,
      account: yield* Handlers.blank("account, a safe.account"),
    };
  });

export default recordCompany;
