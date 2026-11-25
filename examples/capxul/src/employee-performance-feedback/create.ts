// Scaffolded from blueprint/things/employee-performance-feedback/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/employee-performance-feedback/create.handler.ts";
import { EmployeePerformanceFeedback } from "../../blueprint/things/employee-performance-feedback/thing.ts";
import { AppraisalCycle } from "../../blueprint/things/appraisal-cycle/thing.ts";
import { inRating, matchesOnce, r2, rateLines, ratingScoreOf, type RatingLine } from "../appraisal-math.ts";

const { FeedbackCycleCompleted, FeedbackForOneself, ReviewerNotInCompany, ReviewerHasLeft, FeedbackRatingsDontMatchCriteria, FeedbackRatingOutOfRange } = Errors.declared;

/**
 * employee-performance-feedback.create: Draft your feedback on a colleague's appraisal: what you think, and a rating for each criteria.
 *
 * Who may call, from blueprint/things/employee/roles.ts:
 *   the self of its reviewer: (employee, caller) => employee.person === caller.person
 *
 * Payload, from blueprint/things/employee-performance-feedback/verbs/create.ts:
 *   appraisal  employee-performance-feedback.appraisal
 *   reviewer   employee-performance-feedback.reviewer
 *   feedback   employee-performance-feedback.feedback
 *   ratings    GivenRatings
 *
 * Answer, from blueprint/things/employee-performance-feedback/verbs/create.ts:
 *   employeePerformanceFeedback  employee-performance-feedback.id
 *   totalScore                   employee-performance-feedback.totalScore
 *
 * Refusals:
 *   FeedbackCycleCompleted            exit 41   PF-007  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   FeedbackForOneself                exit 42   PF-002  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   ReviewerNotInCompany              exit 43   PF-003  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   ReviewerHasLeft                   exit 44   PF-004  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   FeedbackRatingsDontMatchCriteria  exit 45   PF-005  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   FeedbackRatingOutOfRange          exit 46   PF-006  yours to refuse below; from blueprint/things/employee-performance-feedback/errors.ts
 *   AppraisalNotFound                 exit 4    AP-901  the runtime's, when no appraisal has that id, carrying id; from blueprint/things/appraisal/thing.ts
 *   NotAllowed                        exit 3    AR-001  the runtime's, when the caller isn't the self of its reviewer; from blueprint/things/employee/roles.ts
 *   IdempotencyConflict               exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/employee-performance-feedback/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/employee-performance-feedback/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/employee-performance-feedback/verbs/create.ts: p95 200ms.
 *
 * The employee-performance-feedback's machine, from blueprint/things/employee-performance-feedback/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *   ▶ (creates)  create  draft      PerformanceFeedbackDrafted
 *     draft      submit  submitted  PerformanceFeedbackSubmitted
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the self of its reviewer;
 *   before it runs, it reads the appraisal and hands it in as refs.appraisal, refusing AppraisalNotFound if there is none;
 *   before it runs, it reads the reviewer and hands it in as refs.reviewer;
 *   before it runs, it mints the employee-performance-feedback's new id and hands it in as id;
 *   each step is its own span: employee-performance-feedback.create.load, employee-performance-feedback.create.insert;
 *   once it answers, it sets the employee-performance-feedback's state to draft;
 *   once it answers, it writes PerformanceFeedbackDrafted: employeePerformanceFeedback from the answer, appraisal and reviewer from the payload;
 *   the call is the span employee-performance-feedback.create, and its commit employee-performance-feedback.create.commit.
 */
const create: Handler = ({ appraisal, reviewer, feedback, ratings }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span employee-performance-feedback.create.load. The runtime read the appraisal and the
    // reviewer; the appraisal's cycle is read here.
    const { held, person, cycle } = yield* steps.load(
      Effect.gen(function* () {
        const held = refs.appraisal;
        if (!held) return yield* Effect.die(new Error(`appraisal ${appraisal} was read and then not found`));
        return { held, person: refs.reviewer, cycle: yield* records.find(AppraisalCycle, held["appraisalCycle"] as string) };
      }),
    );
    const lines = held["selfRatings"] as ReadonlyArray<RatingLine>;

    // Refusal order (errors.ts). FeedbackCycleCompleted: exit 41, PF-007. HRMS refuses only a completed cycle.
    if (cycle?.state === "completed") {
      yield* Effect.logInfo("the appraisal's cycle is completed");
      return yield* new FeedbackCycleCompleted({});
    }

    // FeedbackForOneself: exit 42, PF-002. HRMS: "Use Self Appraisal instead."
    if (held["employee"] === reviewer) {
      yield* Effect.logInfo("the reviewer is the appraised employee");
      return yield* new FeedbackForOneself({});
    }

    // ReviewerNotInCompany: exit 43, PF-003.
    if (person?.["company"] !== held["company"]) {
      yield* Effect.logInfo("the reviewer doesn't work for the appraisal's company");
      return yield* new ReviewerNotInCompany({});
    }

    // ReviewerHasLeft: exit 44, PF-004. CX-expense-leavers: a leaver starts no new feedback.
    if (person?.state !== "active") {
      yield* Effect.logInfo("the reviewer has left");
      return yield* new ReviewerHasLeft({});
    }

    // FeedbackRatingsDontMatchCriteria: exit 45, PF-005. Each of the appraisal's criteria once.
    if (!matchesOnce(ratings.map((r) => r.criteria), lines.map((l) => l.criteria))) {
      yield* Effect.logInfo("the ratings don't name each of the appraisal's criteria once");
      return yield* new FeedbackRatingsDontMatchCriteria({});
    }

    // FeedbackRatingOutOfRange: exit 46, PF-006. HRMS's Rating field holds 0 to 1.
    if (ratings.some((r) => !inRating(r.rating))) {
      yield* Effect.logInfo("a rating isn't between 0 and 1");
      return yield* new FeedbackRatingOutOfRange({});
    }

    // Step insert: database, span employee-performance-feedback.create.insert. The ratings in the appraisal's order,
    // with their weightages, and their score; the appraisal's average counts it once it is submitted.
    const rated = rateLines(lines, ratings.map((r) => ({ criteria: r.criteria, rating: r2(r.rating) })));
    const totalScore = ratingScoreOf(rated);
    yield* steps.insert(
      records.insert(EmployeePerformanceFeedback, {
        id,
        company: held["company"],
        appraisal,
        appraisalCycle: held["appraisalCycle"],
        employee: held["employee"],
        reviewer,
        feedback,
        ratings: rated,
        totalScore,
      } as never),
    );

    // The move create, to draft.
    yield* move();

    return {
      // PerformanceFeedbackDrafted needs employeePerformanceFeedback, and only the answer can give it.
      employeePerformanceFeedback: id,
      totalScore,
    };
  });

export default create;
