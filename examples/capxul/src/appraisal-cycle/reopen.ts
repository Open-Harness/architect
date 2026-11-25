// Scaffolded from blueprint/things/appraisal-cycle/verbs/reopen.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/appraisal-cycle/reopen.handler.ts";

/**
 * appraisal-cycle.reopen: Put a completed cycle back in progress.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its appraisalCycle.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/appraisal-cycle/verbs/reopen.ts:
 *   appraisalCycle  appraisal-cycle.id
 *
 * Answer, from blueprint/things/appraisal-cycle/verbs/reopen.ts:
 *   appraisalCycle  appraisal-cycle.id
 *
 * Refusals:
 *   CycleNameTaken               exit 48   CY-008  the runtime's: another appraisal cycle holds this company and cycle name (appraisal-cycle.oneNamePerCompany); from blueprint/things/appraisal-cycle/invariants.ts
 *   AppraisalCycleNotNotStarted  exit 40   CY-900  the runtime's, when the appraisal-cycle isn't in completed, carrying state; from blueprint/things/appraisal-cycle/machine.ts
 *   NotAllowed                   exit 3    AR-001  the runtime's, when the caller isn't the owner of its appraisalCycle.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict          exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal-cycle/verbs/reopen.ts
 *
 * Idempotent by request, from blueprint/things/appraisal-cycle/verbs/reopen.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal-cycle/verbs/reopen.ts: p95 150ms.
 *
 * The appraisal-cycle's machine, from blueprint/things/appraisal-cycle/machine.ts (▶ marks this call):
 *     from        move      to          emits
 *     (creates)   create    notStarted  AppraisalCycleCreated
 *     notStarted  start     inProgress  AppraisalCycleStarted
 *     inProgress  complete  completed   AppraisalCycleCompleted
 *   ▶ completed   reopen    inProgress  AppraisalCycleReopened
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its appraisalCycle.company;
 *   before it runs, it refuses AppraisalCycleNotNotStarted unless the appraisal-cycle is in completed;
 *   before it runs, it hands in the appraisal-cycle it read as subject, so this handler never reads it again;
 *   each step is its own span: appraisal-cycle.reopen.update;
 *   once it answers, it sets the appraisal-cycle's state to inProgress;
 *   once it answers, it writes AppraisalCycleReopened: appraisalCycle from the answer;
 *   the call is the span appraisal-cycle.reopen, and its commit appraisal-cycle.reopen.commit.
 */
const reopen: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step update: database, span appraisal-cycle.reopen.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move reopen, from completed, to inProgress.
    yield* move();

    return {
      appraisalCycle: yield* Handlers.blank("appraisalCycle, an appraisal-cycle.id"),
    };
  });

export default reopen;
