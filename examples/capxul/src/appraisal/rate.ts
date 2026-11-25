// Scaffolded from blueprint/things/appraisal/verbs/rate.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/appraisal/rate.handler.ts";

const { AppraisalCycleCompleted, NotRatedManually, ScoresDontMatchKras, KraScoreOutOfRange } = Errors.declared;

/**
 * appraisal.rate: Score each KRA of an appraisal by hand, from 0 to 5.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its appraisal.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/appraisal/verbs/rate.ts:
 *   appraisal  appraisal.id
 *   scores     GivenScores
 *
 * Answer, from blueprint/things/appraisal/verbs/rate.ts:
 *   appraisal   appraisal.id
 *   totalScore  appraisal.totalScore
 *   finalScore  appraisal.finalScore
 *
 * Refusals:
 *   AppraisalCycleCompleted  exit 43   AP-003  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   NotRatedManually         exit 46   AP-006  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   ScoresDontMatchKras      exit 47   AP-007  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   KraScoreOutOfRange       exit 48   AP-008  yours to refuse below; from blueprint/things/appraisal/errors.ts
 *   AppraisalAlreadyExists   exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   AppraisalNotDraft        exit 40   AP-900  the runtime's, when the appraisal isn't in draft, carrying state; from blueprint/things/appraisal/machine.ts
 *   NotAllowed               exit 3    AR-001  the runtime's, when the caller isn't the owner of its appraisal.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict      exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal/verbs/rate.ts
 *
 * Idempotent by request, from blueprint/things/appraisal/verbs/rate.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal/verbs/rate.ts: p95 200ms.
 *
 * The appraisal's machine, from blueprint/things/appraisal/machine.ts (▶ marks this call):
 *     from       move      to         emits
 *     (creates)  create    draft      AppraisalCreated
 *   ▶ draft      rate      draft      AppraisalRated
 *     draft      selfRate  draft      AppraisalSelfRated
 *     draft      submit    submitted  AppraisalSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its appraisal.company;
 *   before it runs, it refuses AppraisalNotDraft unless the appraisal is in draft;
 *   before it runs, it hands in the appraisal it read as subject, so this handler never reads it again;
 *   each step is its own span: appraisal.rate.load, appraisal.rate.update;
 *   once it answers, it sets the appraisal's state to draft;
 *   once it answers, it writes AppraisalRated: appraisal, totalScore and finalScore from the answer;
 *   the call is the span appraisal.rate, and its commit appraisal.rate.commit.
 */
const rate: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span appraisal.rate.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AppraisalCycleCompleted: exit 43, AP-003.
    if (yield* Handlers.blank<boolean>("refuse AppraisalCycleCompleted when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AppraisalCycleCompleted was refused"));
      return yield* new AppraisalCycleCompleted({});
    }

    // NotRatedManually: exit 46, AP-006.
    if (yield* Handlers.blank<boolean>("refuse NotRatedManually when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why NotRatedManually was refused"));
      return yield* new NotRatedManually({});
    }

    // ScoresDontMatchKras: exit 47, AP-007.
    if (yield* Handlers.blank<boolean>("refuse ScoresDontMatchKras when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why ScoresDontMatchKras was refused"));
      return yield* new ScoresDontMatchKras({});
    }

    // KraScoreOutOfRange: exit 48, AP-008.
    if (yield* Handlers.blank<boolean>("refuse KraScoreOutOfRange when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why KraScoreOutOfRange was refused"));
      return yield* new KraScoreOutOfRange({});
    }

    // Step update: database, span appraisal.rate.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move rate, from draft, to draft.
    yield* move();

    return {
      appraisal: yield* Handlers.blank("appraisal, an appraisal.id"),
      totalScore: yield* Handlers.blank("totalScore, an appraisal.totalScore"),
      finalScore: yield* Handlers.blank("finalScore, an appraisal.finalScore"),
    };
  });

export default rate;
