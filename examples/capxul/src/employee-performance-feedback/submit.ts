// Scaffolded from blueprint/things/employee-performance-feedback/verbs/submit.ts. Yours from now on.
import { BigDecimal, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee-performance-feedback/submit.handler.ts";
import { Appraisal } from "../../blueprint/things/appraisal/thing.ts";
import { AppraisalCycle } from "../../blueprint/things/appraisal-cycle/thing.ts";
import { EmployeePerformanceFeedback } from "../../blueprint/things/employee-performance-feedback/thing.ts";
import { avg, finalOf } from "../appraisal-math.ts";

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
 *   appraisal                    appraisal.id
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
 *   once it answers, it writes PerformanceFeedbackSubmitted: employeePerformanceFeedback and appraisal from the answer;
 *   the call is the span employee-performance-feedback.submit, and its commit employee-performance-feedback.submit.commit.
 */
const submit: Handler = ({ employeePerformanceFeedback }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span employee-performance-feedback.submit.load. The runtime read the feedback; its
    // appraisal, the appraisal's cycle and the appraisal's feedback already submitted are read here.
    if (!subject) return yield* Effect.die(new Error(`feedback ${employeePerformanceFeedback} was read and then not found`));
    const appraisal = subject["appraisal"] as string;
    const { held, cycle, submitted } = yield* steps.load(
      Effect.all({
        held: records.find(Appraisal, appraisal),
        cycle: records.find(AppraisalCycle, subject["appraisalCycle"] as string),
        submitted: records.list({ thing: EmployeePerformanceFeedback, where: { appraisal }, state: "submitted", order: "oldest", limit: Number.MAX_SAFE_INTEGER, after: undefined }),
      }),
    );
    if (!held) return yield* Effect.die(new Error(`appraisal ${appraisal} was read and then not found`));

    // FeedbackCycleCompleted: exit 41, PF-007. A leaver may still submit one already drafted.
    if (cycle?.state === "completed") {
      yield* Effect.logInfo("the appraisal's cycle is completed");
      return yield* new FeedbackCycleCompleted({});
    }

    // Step update: database, in the store employee-performance-feedback, appraisal, span
    // employee-performance-feedback.submit.update. The average covers submitted feedback only, this one with them
    // (it is still a draft until this call answers); the final score follows.
    const scores = [...submitted.items.map((f) => f["totalScore"] as BigDecimal.BigDecimal), subject["totalScore"] as BigDecimal.BigDecimal];
    const avgFeedbackScore = avg(scores);
    const finalScore = finalOf(held["totalScore"] as BigDecimal.BigDecimal, held["selfScore"] as BigDecimal.BigDecimal, avgFeedbackScore);
    yield* steps.update(records.update(Appraisal, appraisal, { avgFeedbackScore, finalScore } as never));

    // The move submit, from draft, to submitted.
    yield* move();

    return { employeePerformanceFeedback, avgFeedbackScore, appraisal: appraisal as never };
  });

export default submit;
