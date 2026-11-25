// Scaffolded from blueprint/things/kra/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/kra/create.handler.ts";

/**
 * kra.create: Add a key result area to a company.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/kra/verbs/create.ts:
 *   company  kra.company
 *   title    kra.title
 *
 * Answer, from blueprint/things/kra/verbs/create.ts:
 *   kra  kra.id
 *
 * Refusals:
 *   KraTitleTaken        exit 41   KR-001  the runtime's: another kra holds this company and title (kra.oneTitlePerCompany); from blueprint/things/kra/invariants.ts
 *   NotAllowed           exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/kra/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/kra/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/kra/verbs/create.ts: p95 150ms.
 *
 * The kra's machine, from blueprint/things/kra/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  KraCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the kra's new id and hands it in as id;
 *   each step is its own span: kra.create.insert;
 *   once it answers, it sets the kra's state to active;
 *   once it answers, it writes KraCreated: kra from the answer, company from the payload;
 *   the call is the span kra.create, and its commit kra.create.commit.
 */
const create: Handler = (_payload, { steps, move, id }) =>
  Effect.gen(function* () {
    // Step insert: database, span kra.create.insert.
    yield* steps.insert(Handlers.blank("insert: the work this step does"));

    // The move create, to active.
    yield* move();

    return {
      // KraCreated needs kra, and only the answer can give it.
      kra: id,
    };
  });

export default create;
