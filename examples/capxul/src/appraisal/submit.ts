// Scaffolded from blueprint/things/appraisal/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/appraisal/submit.handler.ts";

/**
 * appraisal.submit: Submit an appraisal.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its appraisal.company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/appraisal/verbs/submit.ts:
 *   appraisal  appraisal.id
 *
 * Answer, from blueprint/things/appraisal/verbs/submit.ts:
 *   appraisal       appraisal.id
 *   finalScore      appraisal.finalScore
 *   appraisalCycle  appraisal.appraisalCycle
 *
 * Refusals:
 *   AppraisalAlreadyExists  exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   AppraisalNotDraft       exit 40   AP-900  the runtime's, when the appraisal isn't in draft, carrying state; from blueprint/things/appraisal/machine.ts
 *   NotAllowed              exit 3    AR-001  the runtime's, when the caller isn't the owner of its appraisal.company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict     exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal/verbs/submit.ts
 *
 * Idempotent by request, from blueprint/things/appraisal/verbs/submit.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal/verbs/submit.ts: p95 150ms.
 *
 * The appraisal's machine, from blueprint/things/appraisal/machine.ts (▶ marks this call):
 *     from       move      to         emits
 *     (creates)  create    draft      AppraisalCreated
 *     draft      rate      draft      AppraisalRated
 *     draft      selfRate  draft      AppraisalSelfRated
 *   ▶ draft      submit    submitted  AppraisalSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its appraisal.company;
 *   before it runs, it refuses AppraisalNotDraft unless the appraisal is in draft;
 *   before it runs, it hands in the appraisal it read as subject, so this handler never reads it again;
 *   each step is its own span: appraisal.submit.load, appraisal.submit.update;
 *   once it answers, it sets the appraisal's state to submitted;
 *   once it answers, it writes AppraisalSubmitted: appraisal from the answer;
 *   the call is the span appraisal.submit, and its commit appraisal.submit.commit.
 */
const submit: Handler = ({ appraisal }, { steps, move, subject }) =>
  Effect.gen(function* () {
    // Step load: database, span appraisal.submit.load. The runtime read the appraisal and hands it in; every move
    // before kept its scores current, so submitting changes nothing but its state.
    const held = yield* steps.load(Effect.succeed(subject));
    if (!held) return yield* Effect.die(new Error(`appraisal ${appraisal} was read and then not found`));

    // Step update: database, span appraisal.submit.update. The move is the whole change.
    yield* steps.update(Effect.void);

    // The move submit, from draft, to submitted.
    yield* move();

    return { appraisal, finalScore: held["finalScore"] as never, appraisalCycle: held["appraisalCycle"] as never };
  });

export default submit;
