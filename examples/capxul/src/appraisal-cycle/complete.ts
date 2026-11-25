// Scaffolded from blueprint/things/appraisal-cycle/verbs/complete.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/appraisal-cycle/complete.handler.ts";

const { AppraisalsNotSubmitted } = Errors.declared;

/**
 * appraisal-cycle.complete: Mark a cycle completed once every appraisal in it is submitted.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its appraisalCycle.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/appraisal-cycle/verbs/complete.ts:
 *   appraisalCycle  appraisal-cycle.id
 *
 * Answer, from blueprint/things/appraisal-cycle/verbs/complete.ts:
 *   appraisalCycle  appraisal-cycle.id
 *
 * Refusals:
 *   AppraisalsNotSubmitted       exit 47   CY-007  yours to refuse below, carrying drafts; from blueprint/things/appraisal-cycle/errors.ts
 *   CycleNameTaken               exit 48   CY-008  the runtime's: another appraisal cycle holds this company and cycle name (appraisal-cycle.oneNamePerCompany); from blueprint/things/appraisal-cycle/invariants.ts
 *   AppraisalCycleNotNotStarted  exit 40   CY-900  the runtime's, when the appraisal-cycle isn't in inProgress, carrying state; from blueprint/things/appraisal-cycle/machine.ts
 *   NotAllowed                   exit 3    AR-001  the runtime's, when the caller isn't the owner of its appraisalCycle.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict          exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal-cycle/verbs/complete.ts
 *
 * Idempotent by request, from blueprint/things/appraisal-cycle/verbs/complete.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal-cycle/verbs/complete.ts: p95 300ms.
 *
 * The appraisal-cycle's machine, from blueprint/things/appraisal-cycle/machine.ts (▶ marks this call):
 *     from        move      to          emits
 *     (creates)   create    notStarted  AppraisalCycleCreated
 *     notStarted  start     inProgress  AppraisalCycleStarted
 *   ▶ inProgress  complete  completed   AppraisalCycleCompleted
 *     completed   reopen    inProgress  AppraisalCycleReopened
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its appraisalCycle.company;
 *   before it runs, it refuses AppraisalCycleNotNotStarted unless the appraisal-cycle is in inProgress;
 *   before it runs, it hands in the appraisal-cycle it read as subject, so this handler never reads it again;
 *   each step is its own span: appraisal-cycle.complete.load, appraisal-cycle.complete.update;
 *   once it answers, it sets the appraisal-cycle's state to completed;
 *   once it answers, it writes AppraisalCycleCompleted: appraisalCycle from the answer;
 *   the call is the span appraisal-cycle.complete, and its commit appraisal-cycle.complete.commit.
 */
const complete: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span appraisal-cycle.complete.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // AppraisalsNotSubmitted: exit 47, CY-007.
    if (yield* Handlers.blank<boolean>("refuse AppraisalsNotSubmitted when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why AppraisalsNotSubmitted was refused"));
      return yield* new AppraisalsNotSubmitted({
        drafts: yield* Handlers.blank("AppraisalsNotSubmitted.drafts, a RecordCount"),
      });
    }

    // Step update: database, span appraisal-cycle.complete.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move complete, from inProgress, to completed.
    yield* move();

    return {
      appraisalCycle: yield* Handlers.blank("appraisalCycle, an appraisal-cycle.id"),
    };
  });

export default complete;
