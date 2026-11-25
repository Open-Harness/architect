// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// Under Manual Rating the owner scores each KRA from 0 to 5: a line earns score × weightage ÷ 100 and the total is their
// sum (HRMS's `calculate_total_score`). The employee rates themselves 0 to 1 against each criteria: the self score is
// rating × 5 × weightage ÷ 100, summed. The final score is the average of the total, self and feedback scores. Every
// score is rounded to two places, half up. The numbers are HRMS's own tests' (`test_appraisal.py`).
// Refusal order: create (appraisal/errors.ts) AppraisedEmployeeNotInCompany, AppraisedEmployeeHasLeft,
// AppraisalCycleCompleted, AppraisalTemplateNotInCompany, then AppraisalAlreadyExists at commit; rate NotRatedManually,
// ScoresDontMatchKras, KraScoreOutOfRange; self-rate SelfRatingsDontMatchCriteria, SelfRatingOutOfRange.
import { BigDecimal } from "effect";
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AppraisalCreated, AppraisalRated, AppraisalSelfRated, AppraisalSubmitted } from "../blueprint/things/appraisal/events.ts";
import {
  AppraisalAlreadyExists,
  AppraisalCycleCompleted,
  AppraisalTemplateNotInCompany,
  AppraisedEmployeeHasLeft,
  AppraisedEmployeeNotInCompany,
  KraScoreOutOfRange,
  NotRatedManually,
  ScoresDontMatchKras,
  SelfRatingOutOfRange,
  SelfRatingsDontMatchCriteria,
} from "../blueprint/things/appraisal/errors.ts";
import { machine as appraisals } from "../blueprint/things/appraisal/machine.ts";
import create from "../blueprint/things/appraisal/verbs/create.ts";
import rate from "../blueprint/things/appraisal/verbs/rate.ts";
import selfRate from "../blueprint/things/appraisal/verbs/self-rate.ts";
import submit from "../blueprint/things/appraisal/verbs/submit.ts";
import get from "../blueprint/things/appraisal/verbs/get.ts";
import list from "../blueprint/things/appraisal/verbs/list.ts";
import completeCycle from "../blueprint/things/appraisal-cycle/verbs/complete.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";

const d = BigDecimal.fromStringUnsafe;
const n = (x: BigDecimal.BigDecimal) => BigDecimal.format(BigDecimal.normalize(x));
type Scored = {
  kras: ReadonlyArray<{ kra: string; weightage: BigDecimal.BigDecimal; score: BigDecimal.BigDecimal; earned: BigDecimal.BigDecimal }>;
  selfRatings: ReadonlyArray<{ criteria: string; weightage: BigDecimal.BigDecimal; rating: BigDecimal.BigDecimal }>;
  totalScore: BigDecimal.BigDecimal; selfScore: BigDecimal.BigDecimal; avgFeedbackScore: BigDecimal.BigDecimal; finalScore: BigDecimal.BigDecimal; state: string;
};
/** KRA lines, self ratings, the four scores and the state. */
const scored = (a: Scored) => [
  a.kras.map((k) => [k.kra, n(k.weightage), n(k.score), n(k.earned)]),
  a.selfRatings.map((r) => [r.criteria, n(r.weightage), n(r.rating)]),
  n(a.totalScore), n(a.selfScore), n(a.avgFeedbackScore), n(a.finalScore), a.state,
];

export default Blueprint.journey("rate an appraisal", {
  // H1 2027 is rated by hand and has started: Olga's and Cy's appraisals are drafts by Engineers (Quality 30,
  // Development 70; Problem Solving 70, Excellence 30). H2 2026 scores goals' progress. Dee works at Acme Trading in
  // neither cycle; Bo drives for Acme Logistics, whose template is Drivers.
  cast: { ada: owner, olga: Blueprint.signedIn, cy: Blueprint.signedIn, dee: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a manual cycle draft",
  steps: (s) => {
    const q = s.world.kra;
    const dev = s.world.otherKra;
    const ps = s.world.criteria;
    const ex = s.world.otherCriteria;
    const scores = (quality: string, development: string) => [{ kra: q, score: d(quality) }, { kra: dev, score: d(development) }];
    const ratings = (problem: string, excellence: string) => [{ criteria: ps, rating: d(problem) }, { criteria: ex, rating: d(excellence) }];
    const fresh = [[[q, "30", "0", "0"], [dev, "70", "0", "0"]], [[ps, "70", "0"], [ex, "30", "0"]], "0", "0", "0", "0", "draft"];
    return [
      // ── Reading
      s.step(
        "Olga's H1 2027 appraisal reads back by hand, every score 0",
        s.olga.run(get, { id: s.world.manualAppraisal }),
        expect((a) => [a.company, a.employee, a.appraisalCycle, a.appraisalTemplate, a.kraEvaluationMethod, ...scored(a)]).toEqual([
          s.world.company, s.world.employee, s.world.manualCycle, s.world.appraisalTemplate, "Manual Rating", ...fresh,
        ]),
        noEvents(),
      ),
      s.step("Cy can't read Olga's", s.cy.run(get, { id: s.world.manualAppraisal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo", s.bo.run(get, { id: s.world.manualAppraisal }), refuses(Blueprint.NotAllowed), noEvents()),

      // ── Rating by hand
      s.step("Olga can't rate her own KRAs", s.olga.run(rate, { appraisal: s.world.manualAppraisal, scores: scores("5", "3") as never }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo", s.bo.run(rate, { appraisal: s.world.manualAppraisal, scores: scores("5", "3") as never }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "an appraisal scored from goals isn't rated by hand, even with a score out of range",
        s.ada.run(rate, { appraisal: s.world.appraisal, scores: scores("6", "3") as never }),
        refuses(NotRatedManually),
        noEvents(),
        spans({ absent: ["appraisal.rate.update"] }),
      ),
      s.step(
        "scores missing a KRA are refused, even out of range",
        s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: [{ kra: q, score: d("6") }] as never }),
        refuses(ScoresDontMatchKras),
        noEvents(),
      ),
      s.step(
        "and so are scores naming a KRA twice",
        s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: [{ kra: q, score: d("5") }, { kra: q, score: d("3") }] as never }),
        refuses(ScoresDontMatchKras),
        noEvents(),
      ),
      s.step(
        "and a KRA the appraisal doesn't have",
        s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: [{ kra: q, score: d("5") }, { kra: s.world.outsideKra, score: d("3") }] as never }),
        refuses(ScoresDontMatchKras),
        noEvents(),
      ),
      s.step(
        "and a score for each KRA with one more",
        s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: [...scores("5", "3"), { kra: s.world.outsideKra, score: d("1") }] as never }),
        refuses(ScoresDontMatchKras),
        noEvents(),
      ),
      s.step("a score over 5 is refused", s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: scores("5.01", "3") as never }), refuses(KraScoreOutOfRange), noEvents()),
      s.step("and one below 0", s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: scores("5", "-0.01") as never }), refuses(KraScoreOutOfRange), noEvents()),
      s.step(
        "Ada scores Quality 5 and Development 3: a total of 3.6",
        s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: scores("5", "3") as never }),
        expect((a) => [a.appraisal, n(a.totalScore), n(a.finalScore)]).toEqual([s.world.manualAppraisal, "3.6", "1.2"]),
        emits(AppraisalRated, { appraisal: s.world.manualAppraisal }),
        appraisals.isIn(s.world.manualAppraisal, "draft"),
        spans({ present: ["appraisal.rate", "appraisal.rate.load", "appraisal.rate.update"] }),
      ),
      s.step(
        "Quality earns 1.5 and Development 2.1, and the final score is 1.2",
        s.ada.run(get, { id: s.world.manualAppraisal }),
        expect(scored).toEqual([[[q, "30", "5", "1.5"], [dev, "70", "3", "2.1"]], [[ps, "70", "0"], [ex, "30", "0"]], "3.6", "0", "0", "1.2", "draft"]),
        noEvents(),
      ),
      s.step(
        "scores given in the other order land on their own KRAs",
        s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: [{ kra: dev, score: d("0") }, { kra: q, score: d("5") }] as never }),
        expect((a) => [n(a.totalScore), n(a.finalScore)]).toEqual(["1.5", "0.5"]),
      ),
      s.step(
        "a rating replaces the one before: 4.25 earns 1.275, rounded up to 1.28, and 3.15 earns 2.205, rounded up to 2.21",
        s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: scores("4.25", "3.15") as never }),
        expect((a) => [n(a.totalScore), n(a.finalScore)]).toEqual(["3.49", "1.16"]),
      ),
      s.step(
        "it reads back with those lines",
        s.ada.run(get, { id: s.world.manualAppraisal }),
        expect((a) => scored(a).slice(0, 1)).toEqual([[[q, "30", "4.25", "1.28"], [dev, "70", "3.15", "2.21"]]]),
        noEvents(),
      ),
      s.step(
        "5 and 3 again",
        s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: scores("5", "3") as never }),
        expect((a) => n(a.totalScore)).toBe("3.6"),
      ),

      // ── Rating oneself
      s.step("Ada can't rate Olga for her", s.ada.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: ratings("0.8", "0.7") as never }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Cy", s.cy.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: ratings("0.8", "0.7") as never }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "ratings missing a criteria are refused, even out of range",
        s.olga.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: [{ criteria: ps, rating: d("2") }] as never }),
        refuses(SelfRatingsDontMatchCriteria),
        noEvents(),
        spans({ absent: ["appraisal.self-rate.update"] }),
      ),
      s.step(
        "and so are ratings naming a criteria twice",
        s.olga.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: [{ criteria: ps, rating: d("0.8") }, { criteria: ps, rating: d("0.7") }] as never }),
        refuses(SelfRatingsDontMatchCriteria),
        noEvents(),
      ),
      s.step(
        "and a criteria of Acme Logistics",
        s.olga.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: [{ criteria: ps, rating: d("0.8") }, { criteria: s.world.outsideCriteria, rating: d("0.7") }] as never }),
        refuses(SelfRatingsDontMatchCriteria),
        noEvents(),
      ),
      s.step("a rating over 1 is refused", s.olga.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: ratings("1.01", "0.7") as never }), refuses(SelfRatingOutOfRange), noEvents()),
      s.step("and one below 0", s.olga.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: ratings("0.8", "-0.01") as never }), refuses(SelfRatingOutOfRange), noEvents()),
      s.step(
        "Olga rates herself 0.8 and 0.7: a self score of 3.85, and a final score of 2.48",
        s.olga.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: ratings("0.8", "0.7") as never }),
        expect((a) => [a.appraisal, n(a.selfScore), n(a.finalScore)]).toEqual([s.world.manualAppraisal, "3.85", "2.48"]),
        emits(AppraisalSelfRated, { appraisal: s.world.manualAppraisal }),
        appraisals.isIn(s.world.manualAppraisal, "draft"),
        spans({ present: ["appraisal.self-rate", "appraisal.self-rate.load", "appraisal.self-rate.update"] }),
      ),
      s.step(
        "her ratings read back on their criteria, and Ada's scores stand",
        s.olga.run(get, { id: s.world.manualAppraisal }),
        expect(scored).toEqual([[[q, "30", "5", "1.5"], [dev, "70", "3", "2.1"]], [[ps, "70", "0.8"], [ex, "30", "0.7"]], "3.6", "3.85", "0", "2.48", "draft"]),
        noEvents(),
      ),
      s.step(
        "rating herself again, in the other order, 1 and 0, replaces it: a self score of 3.5",
        s.olga.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: [{ criteria: ex, rating: d("0") }, { criteria: ps, rating: d("1") }] as never }),
        expect((a) => [n(a.selfScore), n(a.finalScore)]).toEqual(["3.5", "2.37"]),
      ),
      s.step("0.8 and 0.7 again", s.olga.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: ratings("0.8", "0.7") as never }), expect((a) => n(a.selfScore)).toBe("3.85")),
      s.step("Cy's appraisal is untouched by Olga's", s.cy.run(get, { id: s.world.secondManualAppraisal }), expect(scored).toEqual(fresh), noEvents()),

      // ── Making an appraisal by hand
      s.step(
        "Olga can't make an appraisal",
        s.olga.run(create, { employee: s.world.newHire, appraisalCycle: s.world.manualCycle, appraisalTemplate: s.world.appraisalTemplate }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["appraisal.create.insert"] }),
      ),
      s.step(
        "nor can Bo",
        s.bo.run(create, { employee: s.world.newHire, appraisalCycle: s.world.manualCycle, appraisalTemplate: s.world.appraisalTemplate }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
      ),
      s.step(
        "a second appraisal for Olga in H1 2027 is refused",
        s.ada.run(create, { employee: s.world.employee, appraisalCycle: s.world.manualCycle, appraisalTemplate: s.world.appraisalTemplate }),
        refuses(AppraisalAlreadyExists),
        noEvents(),
      ),
      s.step(
        "a template of Acme Logistics is judged before that",
        s.ada.run(create, { employee: s.world.employee, appraisalCycle: s.world.manualCycle, appraisalTemplate: s.world.outsideTemplate }),
        refuses(AppraisalTemplateNotInCompany),
        noEvents(),
      ),
      s.step(
        "Bo of Acme Logistics can't be appraised in Acme Trading's cycle",
        s.ada.run(create, { employee: s.world.outsider, appraisalCycle: s.world.manualCycle, appraisalTemplate: s.world.outsideTemplate }),
        refuses(AppraisedEmployeeNotInCompany),
        noEvents(),
      ),
      s.step(
        "Ada makes Dee's H1 2027 appraisal",
        s.ada.run(create, { employee: s.world.newHire, appraisalCycle: s.world.manualCycle, appraisalTemplate: s.world.appraisalTemplate }),
        expect((a) => a.appraisal).toMatch(/^apr_[0-9a-z]+$/),
        emits(AppraisalCreated, { appraisal: s.last.appraisal, employee: s.world.newHire, appraisalCycle: s.world.manualCycle }),
        appraisals.isIn(s.last.appraisal, "draft"),
        spans({ present: ["appraisal.create", "appraisal.create.load", "appraisal.create.insert"] }),
      ),
      s.step(
        "it takes the cycle's company and method and the template's lines, every score 0",
        s.dee.run(get, { id: s.last.appraisal }),
        expect((a) => [a.company, a.employee, a.appraisalCycle, a.kraEvaluationMethod, ...scored(a)]).toEqual([
          s.world.company, s.world.newHire, s.world.manualCycle, "Manual Rating", ...fresh,
        ]),
        noEvents(),
      ),

      // ── Submitting
      s.step("Olga can't submit her own", s.olga.run(submit, { appraisal: s.world.manualAppraisal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo", s.bo.run(submit, { appraisal: s.world.manualAppraisal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada submits Olga's, its final score 2.48",
        s.ada.run(submit, { appraisal: s.world.manualAppraisal }),
        expect((a) => [a.appraisal, n(a.finalScore), a.appraisalCycle]).toEqual([s.world.manualAppraisal, "2.48", s.world.manualCycle]),
        emits(AppraisalSubmitted, { appraisal: s.world.manualAppraisal }),
        appraisals.isIn(s.world.manualAppraisal, "submitted"),
        spans({ present: ["appraisal.submit", "appraisal.submit.update"] }),
      ),
      s.step("it can't be submitted twice", s.ada.run(submit, { appraisal: s.world.manualAppraisal }), refuses(appraisals.notFrom, { state: "submitted" }), noEvents()),
      s.step("nor rated", s.ada.run(rate, { appraisal: s.world.manualAppraisal, scores: scores("1", "1") as never }), refuses(appraisals.notFrom, { state: "submitted" }), noEvents()),
      s.step("nor rated by Olga", s.olga.run(selfRate, { appraisal: s.world.manualAppraisal, ratings: ratings("1", "1") as never }), refuses(appraisals.notFrom, { state: "submitted" }), noEvents()),
      s.step(
        "it reads back submitted, every score as it stood",
        s.olga.run(get, { id: s.world.manualAppraisal }),
        expect(scored).toEqual([[[q, "30", "5", "1.5"], [dev, "70", "3", "2.1"]], [[ps, "70", "0.8"], [ex, "30", "0.7"]], "3.6", "3.85", "0", "2.48", "submitted"]),
        noEvents(),
      ),

      // ── A leaver finishes what is open, and starts nothing
      s.step("Cy leaves", s.ada.run(relieve, { employee: s.world.secondEmployee, relievingDate: "2026-11-30" }), expect((a) => a.employee).toBe(s.world.secondEmployee)),
      s.step(
        "she may still rate herself on her open appraisal",
        s.cy.run(selfRate, { appraisal: s.world.secondManualAppraisal, ratings: ratings("1", "1") as never }),
        expect((a) => [n(a.selfScore), n(a.finalScore)]).toEqual(["5", "1.67"]),
      ),
      s.step("and Ada may rate it", s.ada.run(rate, { appraisal: s.world.secondManualAppraisal, scores: scores("0", "5") as never }), expect((a) => [n(a.totalScore), n(a.finalScore)]).toEqual(["3.5", "2.83"])),
      s.step("and submit it", s.ada.run(submit, { appraisal: s.world.secondManualAppraisal }), appraisals.isIn(s.world.secondManualAppraisal, "submitted")),
      s.step(
        "but no new appraisal is made for her, judged before a template of Acme Logistics",
        s.ada.run(create, { employee: s.world.secondEmployee, appraisalCycle: s.world.appraisalCycle, appraisalTemplate: s.world.outsideTemplate }),
        refuses(AppraisedEmployeeHasLeft),
        noEvents(),
      ),

      // ── A completed cycle takes no new appraisal
      s.step(
        "Dee's is the one draft left in H1 2027",
        s.ada.run(list, { appraisalCycle: s.world.manualCycle, employee: s.world.newHire }),
        expect((a) => a.items.map((i: { employee: string; state: string }) => [i.employee, i.state])).toEqual([[s.world.newHire, "draft"]]),
        noEvents(),
      ),
      s.step("Ada submits it", s.ada.run(submit, { appraisal: s.last.items[0].id }), expect((a) => a.appraisalCycle).toBe(s.world.manualCycle)),
      s.step("and completes H1 2027", s.ada.run(completeCycle, { appraisalCycle: s.world.manualCycle }), expect((a) => a.appraisalCycle).toBe(s.world.manualCycle)),
      s.step(
        "no appraisal is made in it now, judged before a template of Acme Logistics",
        s.ada.run(create, { employee: s.world.newHire, appraisalCycle: s.world.manualCycle, appraisalTemplate: s.world.outsideTemplate }),
        refuses(AppraisalCycleCompleted),
        noEvents(),
      ),
      s.step(
        "Cy's leaving is judged before the completed cycle",
        s.ada.run(create, { employee: s.world.secondEmployee, appraisalCycle: s.world.manualCycle, appraisalTemplate: s.world.appraisalTemplate }),
        refuses(AppraisedEmployeeHasLeft),
        noEvents(),
      ),
    ];
  },
});
