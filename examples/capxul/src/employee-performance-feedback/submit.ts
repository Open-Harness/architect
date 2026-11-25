// Scaffolded from blueprint/things/employee-performance-feedback/verbs/submit.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee-performance-feedback/submit.handler.ts";

const { FeedbackCycleCompleted } = Errors.declared;

/**
 * employee-performance-feedback.submit: Submit your feedback, counting it in the appraisal's average.
 *
 * Who may call, from blueprint/things/employee/roles.ts:
 *   the self of its employeePerformanceFeedback.reviewer: (employee, caller) => employee.person === caller.person
 *
 * Payload, from blueprint/things/employee-performance-feedback/verbs/submit.ts:
 *   employeePerformanceFeedback  employee-performance-feedback.id
 *
 * Answer, from blueprint/things/employee-performance-feedback/verbs/submit.ts:
 *   employeePerformanceFeedback  employee-performance-feedback.id
 *   avgFeedbackScore             appraisal.avgFeedbackScore
 *
 * Refusals:
 *   FeedbackCycleCompleted               exit 41   PF-007  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   AppraisalAlreadyExists               exit 51   AP-005  the runtime's: another appraisal holds this employee and appraisal cycle (appraisal.oneAppraisalPerCycle); from blueprint/things/appraisal/invariants.ts
 *   EmployeePerformanceFeedbackNotDraft  exit 40   PF-900  the runtime's, when the employee-performance-feedback isn't in draft, carrying state; from blueprint/things/employee-performance-feedback/machine.ts
 *   NotAllowed                           exit 3    AR-001  the runtime's, when the caller isn't the self of its employeePerformanceFeedback.reviewer; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict                  exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-performance-feedback/verbs/submit.ts
 *
 * Idempotent by request, from blueprint/things/employee-performance-feedback/verbs/submit.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-performance-feedback/verbs/submit.ts: p95 300ms.
 *
 * The employee-performance-feedback's machine, from blueprint/things/employee-performance-feedback/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *     (creates)  create  draft      PerformanceFeedbackDrafted
 *   ▶ draft      submit  submitted  PerformanceFeedbackSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its employeePerformanceFeedback.reviewer;
 *   before it runs, it refuses EmployeePerformanceFeedbackNotDraft unless the employee-performance-feedback is in draft;
 *   before it runs, it hands in the employee-performance-feedback it read as subject, so this handler never reads it again;
 *   each step is its own span: employee-performance-feedback.submit.load, employee-performance-feedback.submit.update;
 *   once it answers, it sets the employee-performance-feedback's state to submitted;
 *   once it answers, it writes PerformanceFeedbackSubmitted: employeePerformanceFeedback from the answer, appraisal and totalScore from the employee-performance-feedback as the call left it;
 *   the call is the span employee-performance-feedback.submit, and its commit employee-performance-feedback.submit.commit.
 */
const submit: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    // Step load: database, span employee-performance-feedback.submit.load.
    yield* steps.load(Handlers.blank("load: the work this step does"));

    // FeedbackCycleCompleted: exit 41, PF-007.
    if (yield* Handlers.blank<boolean>("refuse FeedbackCycleCompleted when?")) {
      yield* Effect.logInfo(yield* Handlers.blank("why FeedbackCycleCompleted was refused"));
      return yield* new FeedbackCycleCompleted({});
    }

    // Step update: database, in the store employee-performance-feedback, appraisal, span employee-performance-feedback.submit.update.
    yield* steps.update(Handlers.blank("update: the work this step does"));

    // The move submit, from draft, to submitted.
    yield* move();

    return {
      employeePerformanceFeedback: yield* Handlers.blank("employeePerformanceFeedback, an employee-performance-feedback.id"),
      avgFeedbackScore: yield* Handlers.blank("avgFeedbackScore, an appraisal.avgFeedbackScore"),
    };
  });

export default submit;
