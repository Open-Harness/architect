// Scaffolded from blueprint/things/appraisal/verbs/self-rate.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/appraisal/self-rate.handler.ts";

const { SelfRatingsDontMatchCriteria, SelfRatingOutOfRange } = Errors.declared;

/**
 * appraisal.self-rate: Rate yourself against each of your appraisal's criteria, from 0 to 1.
 *
 * Who may call, from blueprint/things/employee/roles.ts:
 *   the self of its appraisal.employee: (employee, caller) => employee.person === caller.person
 *
 * Payload, from blueprint/things/appraisal/verbs/self-rate.ts:
 *   appraisal  appraisal.id
 *   ratings    GivenRatings
 *
 * Answer, from blueprint/things/appraisal/verbs/self-rate.ts:
 *   appraisal   appraisal.id
 *   selfScore   appraisal.selfScore
 *   finalScore  appraisal.finalScore
 *
 * Refusals:
 *   SelfRatingsDontMatchCriteria  exit 49   AP-009  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   SelfRatingOutOfRange          exit 50   AP-010  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   AppraisalAlreadyExists        exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   AppraisalNotDraft             exit 40   AP-900  the runtime's, when the appraisal isn't in draft, carrying state; from blueprint/things/appraisal/machine.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the self of its appraisal.employee; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal/verbs/self-rate.ts
 *
 * Idempotent by request, from blueprint/things/appraisal/verbs/self-rate.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal/verbs/self-rate.ts: p95 200ms.
 *
 * The appraisal's machine, from blueprint/things/appraisal/machine.ts (▶ marks this call):
 *     from       move      to         emits
 *     (creates)  create    draft      AppraisalCreated
 *     draft      rate      draft      AppraisalRated
 *   ▶ draft      selfRate  draft      AppraisalSelfRated
 *     draft      submit    submitted  AppraisalSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its appraisal.employee;
 *   before it runs, it refuses AppraisalNotDraft unless the appraisal is in draft;
 *   before it runs, it hands in the appraisal it read as subject, so this handler never reads it again;
 *   each step is its own span: appraisal.self-rate.load, appraisal.self-rate.update;
 *   once it answers, it sets the appraisal's state to draft;
 *   once it answers, it writes AppraisalSelfRated: appraisal from the answer;
 *   the call is the span appraisal.self-rate, and its commit appraisal.self-rate.commit.
 */
const selfRate: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span appraisal.self-rate.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // SelfRatingsDontMatchCriteria: exit 49, AP-009.
    if (yield* Handlers.blank<boolean>("refuse SelfRatingsDontMatchCriteria when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why SelfRatingsDontMatchCriteria was refused"));
      return yield* new SelfRatingsDontMatchCriteria({});
    }

    // SelfRatingOutOfRange: exit 50, AP-010.
    if (yield* Handlers.blank<boolean>("refuse SelfRatingOutOfRange when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why SelfRatingOutOfRange was refused"));
      return yield* new SelfRatingOutOfRange({});
    }

    // Step update: database, span appraisal.self-rate.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move selfRate, from draft, to draft.
    yield* move();

    return {
      appraisal: yield* Handlers.blank("appraisal, an appraisal.id"),
      selfScore: yield* Handlers.blank("selfScore, an appraisal.selfScore"),
      finalScore: yield* Handlers.blank("finalScore, an appraisal.finalScore"),
    };
  });

export default selfRate;
