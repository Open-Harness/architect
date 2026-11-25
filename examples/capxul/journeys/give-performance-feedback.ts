// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// A feedback's total is rating × 5 × weightage ÷ 100 summed over the template's criteria (HRMS's `set_total_score`). Its
// appraisal's average feedback score is the average of the submitted feedbacks' totals, and the final score is the
// average of the total, self and feedback scores, each rounded to two places, half up. A draft counts for nothing.
// HRMS refuses feedback only against a completed cycle, so a cycle not yet started takes it, and a reviewer may give any
// number of feedbacks on one appraisal (`decisions/CX-appraisals.md`).
// Refusal order (employee-performance-feedback/errors.ts): create FeedbackCycleCompleted, FeedbackForOneself,
// ReviewerNotInCompany, ReviewerHasLeft, FeedbackRatingsDontMatchCriteria, FeedbackRatingOutOfRange; submit
// FeedbackCycleCompleted.
import { BigDecimal } from "effect";
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { PerformanceFeedbackDrafted, PerformanceFeedbackSubmitted } from "../blueprint/things/employee-performance-feedback/events.ts";
import {
  FeedbackCycleCompleted,
  FeedbackForOneself,
  FeedbackRatingOutOfRange,
  FeedbackRatingsDontMatchCriteria,
  ReviewerHasLeft,
  ReviewerNotInCompany,
} from "../blueprint/things/employee-performance-feedback/errors.ts";
import { machine as feedbacks } from "../blueprint/things/employee-performance-feedback/machine.ts";
import create from "../blueprint/things/employee-performance-feedback/verbs/create.ts";
import submit from "../blueprint/things/employee-performance-feedback/verbs/submit.ts";
import get from "../blueprint/things/employee-performance-feedback/verbs/get.ts";
import createAppraisal from "../blueprint/things/appraisal/verbs/create.ts";
import getAppraisal from "../blueprint/things/appraisal/verbs/get.ts";
import submitAppraisal from "../blueprint/things/appraisal/verbs/submit.ts";
import completeCycle from "../blueprint/things/appraisal-cycle/verbs/complete.ts";
import createCycle from "../blueprint/things/appraisal-cycle/verbs/create.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";

const d = BigDecimal.fromStringUnsafe;
const n = (x: BigDecimal.BigDecimal) => BigDecimal.format(BigDecimal.normalize(x));
type Feedback = {
  company: string; appraisal: string; appraisalCycle: string; employee: string; reviewer: string; feedback: string;
  ratings: ReadonlyArray<{ criteria: string; weightage: BigDecimal.BigDecimal; rating: BigDecimal.BigDecimal }>;
  totalScore: BigDecimal.BigDecimal; state: string;
};
/** Everything a feedback reads back with. */
const whole = (f: Feedback) => [
  f.company, f.appraisal, f.appraisalCycle, f.employee, f.reviewer, f.feedback,
  f.ratings.map((r) => [r.criteria, n(r.weightage), n(r.rating)]), n(f.totalScore), f.state,
];
type Scores = { totalScore: BigDecimal.BigDecimal; selfScore: BigDecimal.BigDecimal; avgFeedbackScore: BigDecimal.BigDecimal; finalScore: BigDecimal.BigDecimal };
/** An appraisal's total, self, average feedback and final scores. */
const scores = (a: Scores) => [n(a.totalScore), n(a.selfScore), n(a.avgFeedbackScore), n(a.finalScore)];

export default Blueprint.journey("give performance feedback", {
  // H2 2026 has started, scored from goals: Olga's and Cy's appraisals are drafts by Engineers (Problem Solving 70,
  // Excellence 30), every score 0. Cy has drafted feedback on Olga's (0.8 and 0.7), Dee on Cy's (0.5 and 0.5). H1 2027
  // is rated by hand and has started, and Cy has drafted feedback on Olga's there too (0.4 and 0.9). Q1 2027 hasn't
  // started. Bo drives for Acme Logistics.
  cast: { ada: owner, olga: Blueprint.signedIn, cy: Blueprint.signedIn, dee: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a manual cycle draft",
  steps: (s) => {
    const ps = s.world.criteria;
    const ex = s.world.otherCriteria;
    const ratings = (problem: string, excellence: string) => [{ criteria: ps, rating: d(problem) }, { criteria: ex, rating: d(excellence) }];
    const onOlga = (reviewer: string, given: ReadonlyArray<unknown>) => ({ appraisal: s.world.appraisal, reviewer, feedback: "Steady work.", ratings: given }) as never;
    return [
      // ── Reading
      s.step(
        "Cy's draft on Olga reads back: 0.8 × 5 × 70% and 0.7 × 5 × 30%, a total of 3.85",
        s.cy.run(get, { id: s.world.feedbackDraft }),
        expect(whole).toEqual([
          s.world.company, s.world.appraisal, s.world.appraisalCycle, s.world.employee, s.world.secondEmployee,
          "Olga explains her designs clearly.", [[ps, "70", "0.8"], [ex, "30", "0.7"]], "3.85", "draft",
        ]),
        noEvents(),
      ),
      s.step("Ada reads it", s.ada.run(get, { id: s.world.feedbackDraft }), expect((f) => [f.reviewer, n(f.totalScore)]).toEqual([s.world.secondEmployee, "3.85"]), noEvents()),
      s.step("Olga can't read what Cy wrote of her", s.olga.run(get, { id: s.world.feedbackDraft }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Dee", s.dee.run(get, { id: s.world.feedbackDraft }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor Bo", s.bo.run(get, { id: s.world.feedbackDraft }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "a draft counts for nothing: Olga's appraisal has no feedback score",
        s.ada.run(getAppraisal, { id: s.world.appraisal }),
        expect(scores).toEqual(["0", "0", "0", "0"]),
        noEvents(),
      ),

      // ── Who gives it
      s.step(
        "Ada can't give feedback in Cy's name",
        s.ada.run(create, onOlga(s.world.secondEmployee, ratings("1", "1"))),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["employee-performance-feedback.create.insert"] }),
      ),
      s.step("nor can Dee", s.dee.run(create, onOlga(s.world.secondEmployee, ratings("1", "1"))), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Olga can't give feedback on her own appraisal, judged before ratings that don't match",
        s.olga.run(create, onOlga(s.world.employee, [{ criteria: ps, rating: d("2") }])),
        refuses(FeedbackForOneself),
        noEvents(),
        spans({ absent: ["employee-performance-feedback.create.insert"] }),
      ),
      s.step(
        "Bo of Acme Logistics can't give feedback on Acme Trading's appraisal, judged before ratings that don't match",
        s.bo.run(create, onOlga(s.world.outsider, [{ criteria: ps, rating: d("2") }])),
        refuses(ReviewerNotInCompany),
        noEvents(),
      ),

      // ── Ratings
      s.step("ratings missing a criteria are refused, even out of range", s.dee.run(create, onOlga(s.world.newHire, [{ criteria: ps, rating: d("2") }])), refuses(FeedbackRatingsDontMatchCriteria), noEvents()),
      s.step(
        "and so are ratings naming a criteria twice",
        s.dee.run(create, onOlga(s.world.newHire, [{ criteria: ps, rating: d("0.5") }, { criteria: ps, rating: d("0.5") }])),
        refuses(FeedbackRatingsDontMatchCriteria),
        noEvents(),
      ),
      s.step(
        "and a criteria of Acme Logistics",
        s.dee.run(create, onOlga(s.world.newHire, [{ criteria: ps, rating: d("0.5") }, { criteria: s.world.outsideCriteria, rating: d("0.5") }])),
        refuses(FeedbackRatingsDontMatchCriteria),
        noEvents(),
      ),
      s.step(
        "and every criteria with one more",
        s.dee.run(create, onOlga(s.world.newHire, [...ratings("0.5", "0.5"), { criteria: s.world.outsideCriteria, rating: d("0.5") }])),
        refuses(FeedbackRatingsDontMatchCriteria),
        noEvents(),
      ),
      s.step("a rating over 1 is refused", s.dee.run(create, onOlga(s.world.newHire, ratings("1.01", "0.5"))), refuses(FeedbackRatingOutOfRange), noEvents()),
      s.step("and one below 0", s.dee.run(create, onOlga(s.world.newHire, ratings("0.5", "-0.01"))), refuses(FeedbackRatingOutOfRange), noEvents()),

      // ── Giving it
      s.step(
        "Dee rates Olga 0.2 and 1, in the other order: 0.7 and 1.5, a total of 2.2",
        s.dee.run(create, onOlga(s.world.newHire, [{ criteria: ex, rating: d("1") }, { criteria: ps, rating: d("0.2") }])),
        expect((f) => [f.employeePerformanceFeedback, n(f.totalScore)]).toEqual([s.last.employeePerformanceFeedback, "2.2"]),
        expect((f) => f.employeePerformanceFeedback).toMatch(/^epf_[0-9a-z]+$/),
        emits(PerformanceFeedbackDrafted, { employeePerformanceFeedback: s.last.employeePerformanceFeedback, appraisal: s.world.appraisal, reviewer: s.world.newHire }),
        feedbacks.isIn(s.last.employeePerformanceFeedback, "draft"),
        spans({ present: ["employee-performance-feedback.create", "employee-performance-feedback.create.load", "employee-performance-feedback.create.insert"] }),
      ),
      s.step("Cy can't submit Dee's", s.cy.run(submit, { employeePerformanceFeedback: s.last.employeePerformanceFeedback }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Ada", s.ada.run(submit, { employeePerformanceFeedback: s.last.employeePerformanceFeedback }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Dee submits it: the average is 2.2, and Olga's final score 0.73",
        s.dee.run(submit, { employeePerformanceFeedback: s.last.employeePerformanceFeedback }),
        expect((f) => [n(f.avgFeedbackScore), f.appraisal]).toEqual(["2.2", s.world.appraisal]),
        emits(PerformanceFeedbackSubmitted, { employeePerformanceFeedback: s.last.employeePerformanceFeedback, appraisal: s.world.appraisal }),
        feedbacks.isIn(s.last.employeePerformanceFeedback, "submitted"),
        spans({ present: ["employee-performance-feedback.submit", "employee-performance-feedback.submit.load", "employee-performance-feedback.submit.update"] }),
      ),
      s.step("it can't be submitted twice", s.dee.run(submit, { employeePerformanceFeedback: s.last.employeePerformanceFeedback }), refuses(feedbacks.notFrom, { state: "submitted" }), noEvents()),
      s.step(
        "it reads back submitted, on the template's criteria in the template's order",
        s.dee.run(get, { id: s.last.employeePerformanceFeedback }),
        expect(whole).toEqual([
          s.world.company, s.world.appraisal, s.world.appraisalCycle, s.world.employee, s.world.newHire,
          "Steady work.", [[ps, "70", "0.2"], [ex, "30", "1"]], "2.2", "submitted",
        ]),
        noEvents(),
      ),
      s.step("Olga's appraisal shows it", s.olga.run(getAppraisal, { id: s.world.appraisal }), expect(scores).toEqual(["0", "0", "2.2", "0.73"]), noEvents()),
      s.step("Olga can't submit Cy's draft", s.olga.run(submit, { employeePerformanceFeedback: s.world.feedbackDraft }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo", s.bo.run(submit, { employeePerformanceFeedback: s.world.feedbackDraft }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Cy submits hers: the average of 2.2 and 3.85 is 3.03 (3.025, rounded up), and the final score 1.01",
        s.cy.run(submit, { employeePerformanceFeedback: s.world.feedbackDraft }),
        expect((f) => [f.employeePerformanceFeedback, n(f.avgFeedbackScore), f.appraisal]).toEqual([s.world.feedbackDraft, "3.03", s.world.appraisal]),
        emits(PerformanceFeedbackSubmitted, { employeePerformanceFeedback: s.world.feedbackDraft, appraisal: s.world.appraisal }),
        feedbacks.isIn(s.world.feedbackDraft, "submitted"),
      ),
      s.step(
        "Cy may give Olga a second feedback, 1 and 0.5: a total of 4.25",
        s.cy.run(create, onOlga(s.world.secondEmployee, ratings("1", "0.5"))),
        expect((f) => n(f.totalScore)).toBe("4.25"),
        feedbacks.isIn(s.last.employeePerformanceFeedback, "draft"),
      ),
      s.step(
        "submitted, it averages with the other two: 10.3 ÷ 3 is 3.43, and the final score 1.14",
        s.cy.run(submit, { employeePerformanceFeedback: s.last.employeePerformanceFeedback }),
        expect((f) => n(f.avgFeedbackScore)).toBe("3.43"),
      ),
      s.step("Olga's appraisal reads it back", s.olga.run(getAppraisal, { id: s.world.appraisal }), expect(scores).toEqual(["0", "0", "3.43", "1.14"]), noEvents()),
      s.step("Cy's own appraisal is untouched by feedback on Olga's: her Development goal at 50% earns 35, a total of 1.75", s.cy.run(getAppraisal, { id: s.world.secondAppraisal }), expect(scores).toEqual(["1.75", "0", "0", "0.58"]), noEvents()),

      // ── A cycle not yet started takes feedback: HRMS refuses only a completed one
      s.step(
        "Ada sets up Q3 2027, rated by hand, and doesn't start it",
        s.ada.run(createCycle, {
          company: s.world.company,
          cycleName: "Q3 2027",
          startDate: "2027-07-01",
          endDate: "2027-09-30",
          kraEvaluationMethod: "Manual Rating",
          appraisees: [{ employee: s.world.employee, appraisalTemplate: s.world.appraisalTemplate }],
        }),
        expect((c) => c.appraisalCycle).toMatch(/^apc_[0-9a-z]+$/),
      ),
      s.step(
        "she makes Olga's appraisal in it by hand",
        s.ada.run(createAppraisal, { employee: s.world.employee, appraisalCycle: s.last.appraisalCycle, appraisalTemplate: s.world.appraisalTemplate }),
        expect((a) => a.appraisal).toMatch(/^apr_[0-9a-z]+$/),
      ),
      s.step(
        "and Cy gives feedback on it",
        s.cy.run(create, { appraisal: s.last.appraisal, reviewer: s.world.secondEmployee, feedback: "Early thoughts.", ratings: ratings("0.6", "0.6") as never }),
        expect((f) => n(f.totalScore)).toBe("3"),
        feedbacks.isIn(s.last.employeePerformanceFeedback, "draft"),
      ),
      s.step(
        "it reads back, a draft about Olga",
        s.cy.run(get, { id: s.last.employeePerformanceFeedback }),
        expect((f) => [f.employee, f.reviewer, n(f.totalScore), f.state]).toEqual([s.world.employee, s.world.secondEmployee, "3", "draft"]),
        noEvents(),
      ),

      // ── A leaver finishes what is open, and starts nothing
      s.step("Dee leaves", s.ada.run(relieve, { employee: s.world.newHire, relievingDate: "2026-11-30" }), expect((a) => a.employee).toBe(s.world.newHire)),
      s.step(
        "she may still submit her draft on Cy: 0.5 and 0.5, a total and average of 2.5",
        s.dee.run(submit, { employeePerformanceFeedback: s.world.deeDraft }),
        expect((f) => [n(f.avgFeedbackScore), f.appraisal]).toEqual(["2.5", s.world.secondAppraisal]),
        feedbacks.isIn(s.world.deeDraft, "submitted"),
      ),
      s.step("Cy's appraisal shows it", s.cy.run(getAppraisal, { id: s.world.secondAppraisal }), expect(scores).toEqual(["1.75", "0", "2.5", "1.42"]), noEvents()),
      s.step(
        "but she starts no new feedback, judged before ratings that don't match",
        s.dee.run(create, onOlga(s.world.newHire, [{ criteria: ps, rating: d("2") }])),
        refuses(ReviewerHasLeft),
        noEvents(),
        spans({ absent: ["employee-performance-feedback.create.insert"] }),
      ),

      // ── A completed cycle takes none
      s.step("Ada submits Olga's H1 2027 appraisal", s.ada.run(submitAppraisal, { appraisal: s.world.manualAppraisal }), expect((a) => a.appraisalCycle).toBe(s.world.manualCycle)),
      s.step("and Cy's", s.ada.run(submitAppraisal, { appraisal: s.world.secondManualAppraisal }), expect((a) => a.appraisalCycle).toBe(s.world.manualCycle)),
      s.step("and completes H1 2027", s.ada.run(completeCycle, { appraisalCycle: s.world.manualCycle }), expect((a) => a.appraisalCycle).toBe(s.world.manualCycle)),
      s.step(
        "Cy's draft there can't be submitted now",
        s.cy.run(submit, { employeePerformanceFeedback: s.world.manualDraft }),
        refuses(FeedbackCycleCompleted),
        noEvents(),
        feedbacks.isIn(s.world.manualDraft, "draft"),
        spans({ absent: ["employee-performance-feedback.submit.update"] }),
      ),
      s.step(
        "nor any new feedback given there, judged before ratings that don't match",
        s.cy.run(create, { appraisal: s.world.manualAppraisal, reviewer: s.world.secondEmployee, feedback: "Late.", ratings: [{ criteria: ps, rating: d("2") }] as never }),
        refuses(FeedbackCycleCompleted),
        noEvents(),
      ),
      s.step(
        "the completed cycle is judged before feedback on oneself",
        s.olga.run(create, { appraisal: s.world.manualAppraisal, reviewer: s.world.employee, feedback: "Late.", ratings: ratings("1", "1") as never }),
        refuses(FeedbackCycleCompleted),
        noEvents(),
      ),
      s.step(
        "and before a reviewer who has left",
        s.dee.run(create, { appraisal: s.world.manualAppraisal, reviewer: s.world.newHire, feedback: "Late.", ratings: ratings("1", "1") as never }),
        refuses(FeedbackCycleCompleted),
        noEvents(),
      ),
      s.step(
        "and a reviewer of Acme Logistics",
        s.bo.run(create, { appraisal: s.world.manualAppraisal, reviewer: s.world.outsider, feedback: "Late.", ratings: ratings("1", "1") as never }),
        refuses(FeedbackCycleCompleted),
        noEvents(),
      ),
      s.step("Olga's H1 2027 appraisal has no feedback score", s.olga.run(getAppraisal, { id: s.world.manualAppraisal }), expect((a) => n(a.avgFeedbackScore)).toBe("0"), noEvents()),
    ];
  },
});
