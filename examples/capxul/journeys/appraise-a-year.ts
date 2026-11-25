// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. Only that one answer carries
// forward, so the KRAs and criteria come from the starting worlds, made there by `kra.create` and
// `employee-feedback-criteria.create` (`decisions/CX-appraisals.md`, framework gaps).
// One appraisal from end to end, scored from goals: a template, a cycle, its start, goals and their progress, feedback, a
// self rating, submitting, completing and reading back. Under Automated Based on Goal Progress a KRA's score is the
// average progress of its top-level goals, a group goal's progress is its children's average, a line earns score ×
// weightage ÷ 100, rounded, and the total is those rounded lines summed ÷ 20 (HRMS's `calculate_total_score`). Ratings
// give rating × 5 × weightage ÷ 100, summed then rounded; the final score is the average of the total, self and feedback
// scores. Each stored score has two places, rounded half up.
import { BigDecimal } from "effect";
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AppraisalsNotSubmitted } from "../blueprint/things/appraisal-cycle/errors.ts";
import { GoalCycleCompleted } from "../blueprint/things/goal/errors.ts";
import { AppraisalCycleStarted, AppraisalCycleCompleted as CycleCompletedEvent } from "../blueprint/things/appraisal-cycle/events.ts";
import { machine as cycles } from "../blueprint/things/appraisal-cycle/machine.ts";
import { machine as appraisals } from "../blueprint/things/appraisal/machine.ts";
import { machine as goals } from "../blueprint/things/goal/machine.ts";
import getKra from "../blueprint/things/kra/verbs/get.ts";
import createTemplate from "../blueprint/things/appraisal-template/verbs/create.ts";
import createCycle from "../blueprint/things/appraisal-cycle/verbs/create.ts";
import startCycle from "../blueprint/things/appraisal-cycle/verbs/start.ts";
import completeCycle from "../blueprint/things/appraisal-cycle/verbs/complete.ts";
import getCycle from "../blueprint/things/appraisal-cycle/verbs/get.ts";
import createGoal from "../blueprint/things/goal/verbs/create.ts";
import updateProgress from "../blueprint/things/goal/verbs/update-progress.ts";
import listGoals from "../blueprint/things/goal/verbs/list.ts";
import getAppraisal from "../blueprint/things/appraisal/verbs/get.ts";
import selfRate from "../blueprint/things/appraisal/verbs/self-rate.ts";
import submitAppraisal from "../blueprint/things/appraisal/verbs/submit.ts";
import listAppraisals from "../blueprint/things/appraisal/verbs/list.ts";
import createFeedback from "../blueprint/things/employee-performance-feedback/verbs/create.ts";
import submitFeedback from "../blueprint/things/employee-performance-feedback/verbs/submit.ts";

const d = BigDecimal.fromStringUnsafe;
const n = (x: BigDecimal.BigDecimal) => BigDecimal.format(BigDecimal.normalize(x));
type Scored = {
  employee: string; state: string;
  kras: ReadonlyArray<{ kra: string; weightage: BigDecimal.BigDecimal; score: BigDecimal.BigDecimal; earned: BigDecimal.BigDecimal }>;
  selfRatings: ReadonlyArray<{ criteria: string; weightage: BigDecimal.BigDecimal; rating: BigDecimal.BigDecimal }>;
  totalScore: BigDecimal.BigDecimal; selfScore: BigDecimal.BigDecimal; avgFeedbackScore: BigDecimal.BigDecimal; finalScore: BigDecimal.BigDecimal;
};
/** An appraisal's KRA lines, self ratings, four scores and state. */
const scored = (a: Scored) => [
  a.kras.map((k) => [k.kra, n(k.weightage), n(k.score), n(k.earned)]),
  a.selfRatings.map((r) => [r.criteria, n(r.weightage), n(r.rating)]),
  [n(a.totalScore), n(a.selfScore), n(a.avgFeedbackScore), n(a.finalScore)], a.state,
];
type GoalItem = { id: string; appraisalCycle: string; goalName: string; kra: string; progress: BigDecimal.BigDecimal; isGroup: boolean; parentGoal?: string; state: string };

export default Blueprint.journey("appraise a year", {
  // Ada runs Acme Trading, whose KRAs are Quality and Development and whose feedback criteria are Problem Solving and
  // Excellence. Olga and Cy work there; Bo drives for Acme Logistics.
  cast: { ada: owner, olga: Blueprint.signedIn, cy: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a second feedback criteria",
  steps: (s) => {
    const q = s.world.kra;
    const dev = s.world.otherKra;
    const ps = s.world.criteria;
    const ex = s.world.otherCriteria;
    return [
      // ── Setting up
      s.step("Quality is Acme Trading's KRA", s.ada.run(getKra, { id: q }), expect((k) => [k.company, k.title]).toEqual([s.world.company, "Quality"]), noEvents()),
      s.step(
        "Ada makes the Platform template: Quality 60 and Development 40, rated on Problem Solving and Excellence, 50 each",
        s.ada.run(createTemplate, {
          company: s.world.company,
          title: "Platform team",
          kras: [{ kra: q, weightage: d("60") }, { kra: dev, weightage: d("40") }],
          criteria: [{ criteria: ps, weightage: d("50") }, { criteria: ex, weightage: d("50") }],
        } as never),
        expect((t) => t.appraisalTemplate).toMatch(/^apt_[0-9a-z]+$/),
      ),
      s.step(
        "and FY 2027, scored from goals, appraising Olga and Cy by it",
        s.ada.run(createCycle, {
          company: s.world.company,
          cycleName: "FY 2027",
          startDate: "2027-01-01",
          endDate: "2027-12-31",
          kraEvaluationMethod: "Automated Based on Goal Progress",
          appraisees: [
            { employee: s.world.employee, appraisalTemplate: s.last.appraisalTemplate },
            { employee: s.world.secondEmployee, appraisalTemplate: s.last.appraisalTemplate },
          ],
        }),
        expect((c) => c.appraisalCycle).toMatch(/^apc_[0-9a-z]+$/),
        cycles.isIn(s.last.appraisalCycle, "notStarted"),
      ),
      s.step("Bo can't start it", s.bo.run(startCycle, { appraisalCycle: s.last.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada starts it: an appraisal each for Olga and Cy",
        s.ada.run(startCycle, { appraisalCycle: s.last.appraisalCycle }),
        expect((c) => c.appraisals.length).toBe(2),
        emits(AppraisalCycleStarted, { appraisalCycle: s.last.appraisalCycle }),
        cycles.isIn(s.last.appraisalCycle, "inProgress"),
        appraisals.isIn(s.last.appraisals[0], "draft"),
        appraisals.isIn(s.last.appraisals[1], "draft"),
      ),

      // ── Goals and progress
      s.step(
        "Olga sets herself a group goal under Quality, Ship v2",
        s.olga.run(createGoal, { employee: s.world.employee, appraisalCycle: s.last.appraisalCycle, kra: q, goalName: "Ship v2", progress: d("0"), isGroup: true } as never),
        expect((g) => g.goal).toMatch(/^gol_[0-9a-z]+$/),
        goals.isIn(s.last.goal, "pending"),
      ),
      s.step(
        "and under it the API, done: Ship v2 follows it to 100",
        s.olga.run(createGoal, { employee: s.world.employee, appraisalCycle: s.last.appraisalCycle, kra: q, goalName: "API", progress: d("100"), isGroup: false, parentGoal: s.last.goal } as never),
        goals.isIn(s.last.goal, "completed"),
      ),
      s.step(
        "Olga's goals: Ship v2 has followed the API to 100",
        s.olga.run(listGoals, { appraisalCycle: s.last.appraisalCycle, employee: s.world.employee }),
        expect((p) => p.items.map((g: GoalItem) => [g.goalName, n(g.progress), g.state])).toEqual([["Ship v2", "100", "completed"], ["API", "100", "completed"]]),
        noEvents(),
      ),
      s.step(
        "she adds the UI under Ship v2, half done",
        s.olga.run(createGoal, { employee: s.world.employee, appraisalCycle: s.last.items[0].appraisalCycle, kra: q, goalName: "UI", progress: d("50"), isGroup: false, parentGoal: s.last.items[0].id } as never),
        goals.isIn(s.last.goal, "inProgress"),
      ),
      s.step(
        "she moves the UI to 70",
        s.olga.run(updateProgress, { goal: s.last.goal, progress: d("70") } as never),
        expect((g) => n(g.progress)).toBe("70"),
      ),
      s.step(
        "Ship v2 is at 85, the average of 100 and 70, so Quality scores 85 and earns 51: a total of 2.55",
        s.olga.run(getAppraisal, { id: s.last.appraisal }),
        expect(scored).toEqual([[[q, "60", "85", "51"], [dev, "40", "0", "0"]], [[ps, "50", "0"], [ex, "50", "0"]], ["2.55", "0", "0", "0.85"], "draft"]),
        noEvents(),
      ),
      s.step(
        "Olga sets a Development goal at 40: it earns 16, and the total is 3.35",
        s.olga.run(createGoal, { employee: s.world.employee, appraisalCycle: s.last.appraisalCycle, kra: dev, goalName: "Refactoring", progress: d("40"), isGroup: false } as never),
        goals.isIn(s.last.goal, "inProgress"),
      ),

      // ── Feedback and rating
      s.step(
        "Cy gives feedback on Olga's appraisal, 0.9 and 0.6: a total of 3.75",
        s.cy.run(createFeedback, { appraisal: s.last.appraisal, reviewer: s.world.secondEmployee, feedback: "Ship v2 landed well.", ratings: [{ criteria: ps, rating: d("0.9") }, { criteria: ex, rating: d("0.6") }] } as never),
        expect((f) => n(f.totalScore)).toBe("3.75"),
      ),
      s.step("and submits it", s.cy.run(submitFeedback, { employeePerformanceFeedback: s.last.employeePerformanceFeedback }), expect((f) => n(f.avgFeedbackScore)).toBe("3.75")),
      s.step(
        "Olga rates herself 1 and 0.8: a self score of 4.5, and a final score of 3.87",
        s.olga.run(selfRate, { appraisal: s.last.appraisal, ratings: [{ criteria: ps, rating: d("1") }, { criteria: ex, rating: d("0.8") }] } as never),
        expect((a) => [n(a.selfScore), n(a.finalScore)]).toEqual(["4.5", "3.87"]),
      ),

      s.step("Olga's appraisal, to reach the cycle", s.olga.run(getAppraisal, { id: s.last.appraisal }), expect((a) => n(a.finalScore)).toBe("3.87"), noEvents()),
      s.step("her goals", s.olga.run(listGoals, { appraisalCycle: s.last.appraisalCycle, employee: s.world.employee }), expect((p) => p.items[3].goalName).toBe("Refactoring"), noEvents()),
      s.step(
        "she sets Refactoring to 40 again: the feedback and self scores stand",
        s.olga.run(updateProgress, { goal: s.last.items[3].id, progress: d("40") } as never),
        expect((g) => n(g.progress)).toBe("40"),
      ),

      // ── Submitting and completing
      s.step(
        "Ada submits Olga's appraisal",
        s.ada.run(submitAppraisal, { appraisal: s.last.appraisal }),
        expect((a) => n(a.finalScore)).toBe("3.87"),
        appraisals.isIn(s.last.appraisal, "submitted"),
      ),
      s.step("Cy's is still a draft, so FY 2027 can't be completed", s.ada.run(completeCycle, { appraisalCycle: s.last.appraisalCycle }), refuses(AppraisalsNotSubmitted), noEvents()),
      s.step(
        "the cycle's appraisals: Olga's submitted, Cy's a draft",
        s.ada.run(listAppraisals, { appraisalCycle: s.last.appraisalCycle }),
        expect((p) => p.items.map((i: Scored) => [i.employee, i.state])).toEqual([[s.world.employee, "submitted"], [s.world.secondEmployee, "draft"]]),
        noEvents(),
      ),
      s.step("Ada submits Cy's", s.ada.run(submitAppraisal, { appraisal: s.last.items[1].id }), expect((a) => n(a.finalScore)).toBe("0")),
      s.step(
        "and completes FY 2027",
        s.ada.run(completeCycle, { appraisalCycle: s.last.appraisalCycle }),
        emits(CycleCompletedEvent, { appraisalCycle: s.last.appraisalCycle }),
        cycles.isIn(s.last.appraisalCycle, "completed"),
      ),

      // ── Reading back
      s.step(
        "Olga's appraisal reads back submitted, every score as it stood",
        s.ada.run(listAppraisals, { appraisalCycle: s.last.appraisalCycle }),
        expect((p) => scored(p.items[0])).toEqual([
          [[q, "60", "85", "51"], [dev, "40", "40", "16"]], [[ps, "50", "1"], [ex, "50", "0.8"]], ["3.35", "4.5", "3.75", "3.87"], "submitted",
        ]),
        noEvents(),
      ),
      s.step(
        "her goals read back in the order she set them, the API and the UI under Ship v2",
        s.olga.run(listGoals, { appraisalCycle: s.last.items[0].appraisalCycle, employee: s.world.employee }),
        expect((p) => p.items.map((g: GoalItem) => [g.goalName, g.kra, n(g.progress), g.isGroup, g.parentGoal === undefined ? null : p.items.findIndex((x: GoalItem) => x.id === g.parentGoal), g.state])).toEqual([
          ["Ship v2", q, "85", true, null, "inProgress"], ["API", q, "100", false, 0, "completed"], ["UI", q, "70", false, 0, "inProgress"], ["Refactoring", dev, "40", false, null, "inProgress"],
        ]),
        noEvents(),
      ),
      s.step("and no longer move", s.olga.run(updateProgress, { goal: s.last.items[2].id, progress: d("100") } as never), refuses(GoalCycleCompleted), noEvents()),
      s.step(
        "FY 2027 reads back completed",
        s.ada.run(getCycle, { id: s.last.items[0].appraisalCycle }),
        expect((c) => [c.cycleName, c.kraEvaluationMethod, c.appraisees.length, c.state]).toEqual(["FY 2027", "Automated Based on Goal Progress", 2, "completed"]),
        noEvents(),
      ),
    ];
  },
});
