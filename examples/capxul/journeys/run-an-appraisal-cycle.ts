// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// A cycle moves notStarted → inProgress → completed, and back to inProgress (HRMS's "Mark as In Progress"). Refusal order
// on create (appraisal-cycle/errors.ts): CycleEndsBeforeStart, AppraiseeNotInCompany, AppraiseeHasLeft,
// AppraiseeTemplateNotInCompany, AppraiseeListedTwice; CycleNameTaken at commit. Start makes one appraisal per appraisee
// who has none and is still at work, in the order listed. HRMS's `create_appraisals_for_cycle` skips an existing
// appraisal; skipping a leaver is Capxul's own, under CX-expense-leavers (`decisions/CX-appraisals.md`).
import { BigDecimal } from "effect";
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import {
  AppraisalCycleCompleted as CycleCompleted,
  AppraisalCycleCreated,
  AppraisalCycleReopened,
  AppraisalCycleStarted,
} from "../blueprint/things/appraisal-cycle/events.ts";
import {
  AppraisalsNotSubmitted,
  AppraiseeHasLeft,
  AppraiseeListedTwice,
  AppraiseeNotInCompany,
  AppraiseeTemplateNotInCompany,
  CycleEndsBeforeStart,
  CycleNameTaken,
  CycleWithoutAppraisees,
} from "../blueprint/things/appraisal-cycle/errors.ts";
import { machine as cycles } from "../blueprint/things/appraisal-cycle/machine.ts";
import create from "../blueprint/things/appraisal-cycle/verbs/create.ts";
import start from "../blueprint/things/appraisal-cycle/verbs/start.ts";
import complete from "../blueprint/things/appraisal-cycle/verbs/complete.ts";
import reopen from "../blueprint/things/appraisal-cycle/verbs/reopen.ts";
import get from "../blueprint/things/appraisal-cycle/verbs/get.ts";
import { AppraisalCycleCompleted } from "../blueprint/things/appraisal/errors.ts";
import { machine as appraisals } from "../blueprint/things/appraisal/machine.ts";
import createAppraisal from "../blueprint/things/appraisal/verbs/create.ts";
import submitAppraisal from "../blueprint/things/appraisal/verbs/submit.ts";
import listAppraisals from "../blueprint/things/appraisal/verbs/list.ts";
import createTemplate from "../blueprint/things/appraisal-template/verbs/create.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";
import getAppraisal from "../blueprint/things/appraisal/verbs/get.ts";
import { machine as goals } from "../blueprint/things/goal/machine.ts";
import createGoal from "../blueprint/things/goal/verbs/create.ts";
import updateProgress from "../blueprint/things/goal/verbs/update-progress.ts";

const d = BigDecimal.fromStringUnsafe;
const n = (x: BigDecimal.BigDecimal) => BigDecimal.format(BigDecimal.normalize(x));
type Item = {
  id: string; company: string; employee: string; appraisalCycle: string; appraisalTemplate: string; kraEvaluationMethod: string; state: string;
  kras: ReadonlyArray<{ kra: string; weightage: BigDecimal.BigDecimal; score: BigDecimal.BigDecimal; earned: BigDecimal.BigDecimal }>;
  selfRatings: ReadonlyArray<{ criteria: string; weightage: BigDecimal.BigDecimal; rating: BigDecimal.BigDecimal }>;
  totalScore: BigDecimal.BigDecimal; selfScore: BigDecimal.BigDecimal; avgFeedbackScore: BigDecimal.BigDecimal; finalScore: BigDecimal.BigDecimal;
};
/** Each appraisal as a row: who, which cycle, template and method, its lines and its four scores, its state. */
const rows = (p: { items: ReadonlyArray<Item> }) =>
  p.items.map((i) => [
    i.company, i.employee, i.appraisalCycle, i.appraisalTemplate, i.kraEvaluationMethod, i.state,
    i.kras.map((k) => [k.kra, n(k.weightage), n(k.score), n(k.earned)]),
    i.selfRatings.map((r) => [r.criteria, n(r.weightage), n(r.rating)]),
    [n(i.totalScore), n(i.selfScore), n(i.avgFeedbackScore), n(i.finalScore)],
  ]);

export default Blueprint.journey("run an appraisal cycle", {
  // Ada runs Acme Trading, whose template Engineers weighs Quality 30 and Development 70, rated on Problem Solving 70 and
  // Excellence 30. H2 2026 appraises Olga then Cy and hasn't started; Q1 2027 appraises Olga, Cy and Dee by hand. Bo
  // drives for Acme Logistics, her other company.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a three-person cycle",
  steps: (s) => {
    const fresh = (employee: unknown, state: string) => [
      s.world.company, employee, s.world.appraisalCycle, s.world.appraisalTemplate, "Automated Based on Goal Progress", state,
      [[s.world.kra, "30", "0", "0"], [s.world.otherKra, "70", "0", "0"]],
      [[s.world.criteria, "70", "0"], [s.world.otherCriteria, "30", "0"]],
      ["0", "0", "0", "0"],
    ];
    const cycle = (cycleName: string, startDate: string, endDate: string, appraisees: ReadonlyArray<unknown>) => ({
      company: s.world.company, cycleName, startDate, endDate, kraEvaluationMethod: "Manual Rating" as const, appraisees: appraisees as never,
    });
    const olga = { employee: s.world.employee, appraisalTemplate: s.world.appraisalTemplate };
    const cy = { employee: s.world.secondEmployee, appraisalTemplate: s.world.appraisalTemplate };
    const bo = { employee: s.world.outsider, appraisalTemplate: s.world.appraisalTemplate };
    const dee = { employee: s.world.newHire, appraisalTemplate: s.world.appraisalTemplate };
    return [
      s.step(
        "H2 2026 reads back not started, appraising Olga then Cy",
        s.ada.run(get, { id: s.world.appraisalCycle }),
        expect((a) => [a.company, a.cycleName, a.startDate, a.endDate, a.kraEvaluationMethod, a.appraisees, a.state]).toEqual([
          s.world.company, "H2 2026", "2026-07-01", "2026-12-31", "Automated Based on Goal Progress", [olga, cy], "notStarted",
        ]),
        noEvents(),
      ),
      s.step("Olga can't read the cycle", s.olga.run(get, { id: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo", s.bo.run(get, { id: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "no appraisal is made before it starts",
        s.ada.run(listAppraisals, { appraisalCycle: s.world.appraisalCycle }),
        expect((a) => a.items.length).toBe(0),
        noEvents(),
      ),
      s.step(
        "Bo can't set up a cycle in Acme Trading",
        s.bo.run(create, cycle("Bo's", "2027-01-01", "2027-06-30", [cy])),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["appraisal-cycle.create.insert"] }),
      ),
      s.step(
        "nor can Olga",
        s.olga.run(create, cycle("Olga's", "2027-01-01", "2027-06-30", [cy])),
        refuses(Blueprint.NotAllowed),
        noEvents(),
      ),
      s.step(
        "a cycle ending the day before it starts is refused, carrying the start, though Bo is listed",
        s.ada.run(create, cycle("Backwards", "2027-01-01", "2026-12-31", [bo])),
        refuses(CycleEndsBeforeStart, { startDate: "2027-01-01" }),
        noEvents(),
        spans({ absent: ["appraisal-cycle.create.insert"] }),
      ),
      s.step(
        "and one ending a month before it starts",
        s.ada.run(create, cycle("Backwards", "2027-03-15", "2027-02-15", [olga])),
        refuses(CycleEndsBeforeStart, { startDate: "2027-03-15" }),
        noEvents(),
      ),
      s.step(
        "an appraisee of Acme Logistics is refused, listed last, judged before a repeat",
        s.ada.run(create, cycle("Outsider", "2027-01-01", "2027-06-30", [olga, olga, bo])),
        refuses(AppraiseeNotInCompany),
        noEvents(),
      ),
      s.step(
        "an employee listed twice is refused",
        s.ada.run(create, cycle("Twice", "2027-01-01", "2027-06-30", [olga, cy, olga])),
        refuses(AppraiseeListedTwice),
        noEvents(),
      ),
      s.step(
        "a one-day cycle with no appraisees may be set up",
        s.ada.run(create, cycle("Empty", "2027-02-01", "2027-02-01", [])),
        expect((a) => a.appraisalCycle).toMatch(/^apc_[0-9a-z]+$/),
        emits(AppraisalCycleCreated, { appraisalCycle: s.last.appraisalCycle, company: s.world.company }),
        cycles.isIn(s.last.appraisalCycle, "notStarted"),
        spans({ present: ["appraisal-cycle.create", "appraisal-cycle.create.load", "appraisal-cycle.create.insert"] }),
      ),
      s.step(
        "but it can't start",
        s.ada.run(start, { appraisalCycle: s.last.appraisalCycle }),
        refuses(CycleWithoutAppraisees),
        noEvents(),
        spans({ absent: ["appraisal-cycle.start.create"] }),
      ),
      s.step(
        "a cycle's name is taken in Acme Trading",
        s.ada.run(create, cycle("H2 2026", "2027-01-01", "2027-06-30", [olga])),
        refuses(CycleNameTaken, { cycleName: "H2 2026" }),
        noEvents(),
      ),
      s.step(
        "Acme Logistics may use it for Bo",
        s.ada.run(create, { ...cycle("H2 2026", "2026-07-01", "2026-12-31", []), company: s.world.otherCompany }),
        expect((a) => a.appraisalCycle).toMatch(/^apc_[0-9a-z]+$/),
        emits(AppraisalCycleCreated, { appraisalCycle: s.last.appraisalCycle, company: s.world.otherCompany }),
      ),
      s.step("Bo can't start H2 2026", s.bo.run(start, { appraisalCycle: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Olga", s.olga.run(start, { appraisalCycle: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada can't complete it before it starts",
        s.ada.run(complete, { appraisalCycle: s.world.appraisalCycle }),
        refuses(cycles.notFrom, { state: "notStarted" }),
        noEvents(),
      ),
      s.step(
        "nor reopen it",
        s.ada.run(reopen, { appraisalCycle: s.world.appraisalCycle }),
        refuses(cycles.notFrom, { state: "notStarted" }),
        noEvents(),
      ),
      s.step(
        "Ada starts it, making two appraisals",
        s.ada.run(start, { appraisalCycle: s.world.appraisalCycle }),
        expect((a) => [a.appraisalCycle, a.appraisals.length, a.appraisals.every((x: string) => /^apr_[0-9a-z]+$/.test(x))]).toEqual([s.world.appraisalCycle, 2, true]),
        emits(AppraisalCycleStarted, { appraisalCycle: s.world.appraisalCycle }),
        cycles.isIn(s.world.appraisalCycle, "inProgress"),
        appraisals.isIn(s.last.appraisals[0], "draft"),
        appraisals.isIn(s.last.appraisals[1], "draft"),
        spans({ present: ["appraisal-cycle.start", "appraisal-cycle.start.load", "appraisal-cycle.start.create"] }),
      ),
      s.step(
        "it can't start twice",
        s.ada.run(start, { appraisalCycle: s.world.appraisalCycle }),
        refuses(cycles.notFrom, { state: "inProgress" }),
        noEvents(),
      ),
      s.step(
        "nor be reopened while in progress",
        s.ada.run(reopen, { appraisalCycle: s.world.appraisalCycle }),
        refuses(cycles.notFrom, { state: "inProgress" }),
        noEvents(),
      ),
      s.step(
        "it can't complete while both appraisals are drafts",
        s.ada.run(complete, { appraisalCycle: s.world.appraisalCycle }),
        refuses(AppraisalsNotSubmitted, { drafts: 2n }),
        noEvents(),
        spans({ absent: ["appraisal-cycle.complete.update"] }),
      ),
      s.step("Bo can't complete it", s.bo.run(complete, { appraisalCycle: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Olga", s.olga.run(complete, { appraisalCycle: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada submits the first appraisal start answered",
        s.ada.run(submitAppraisal, { appraisal: s.last.appraisals[0] }),
        expect((a) => [a.appraisalCycle, n(a.finalScore)]).toEqual([s.world.appraisalCycle, "0"]),
        appraisals.isIn(s.last.appraisal, "submitted"),
      ),
      s.step(
        "the cycle's appraisals are Olga's, now submitted, then Cy's, each copying the template with every score 0",
        s.ada.run(listAppraisals, { appraisalCycle: s.world.appraisalCycle }),
        expect((a) => rows(a)).toEqual([fresh(s.world.employee, "submitted"), fresh(s.world.secondEmployee, "draft")]),
        noEvents(),
      ),
      s.step(
        "Olga sees hers alone",
        s.olga.run(listAppraisals, { employee: s.world.employee }),
        expect((a) => rows(a)).toEqual([fresh(s.world.employee, "submitted")]),
        noEvents(),
      ),
      s.step("Bo can't list the cycle's", s.bo.run(listAppraisals, { appraisalCycle: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor Olga's", s.bo.run(listAppraisals, { employee: s.world.employee }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("Olga can't list the whole cycle's", s.olga.run(listAppraisals, { appraisalCycle: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "it still can't complete while Cy's is a draft",
        s.ada.run(complete, { appraisalCycle: s.world.appraisalCycle }),
        refuses(AppraisalsNotSubmitted, { drafts: 1n }),
        noEvents(),
      ),
      s.step("Ada lists them again", s.ada.run(listAppraisals, { appraisalCycle: s.world.appraisalCycle }), expect((a) => a.items.map((i: Item) => i.state)).toEqual(["submitted", "draft"])),
      s.step("and submits Cy's", s.ada.run(submitAppraisal, { appraisal: s.last.items[1].id }), expect((a) => a.appraisalCycle).toBe(s.world.appraisalCycle)),
      s.step(
        "Ada completes the cycle",
        s.ada.run(complete, { appraisalCycle: s.world.appraisalCycle }),
        expect((a) => a.appraisalCycle).toBe(s.world.appraisalCycle),
        emits(CycleCompleted, { appraisalCycle: s.world.appraisalCycle }),
        cycles.isIn(s.world.appraisalCycle, "completed"),
        spans({ present: ["appraisal-cycle.complete", "appraisal-cycle.complete.load", "appraisal-cycle.complete.update"] }),
      ),
      s.step("it can't complete twice", s.ada.run(complete, { appraisalCycle: s.world.appraisalCycle }), refuses(cycles.notFrom, { state: "completed" }), noEvents()),
      s.step("nor start again", s.ada.run(start, { appraisalCycle: s.world.appraisalCycle }), refuses(cycles.notFrom, { state: "completed" }), noEvents()),
      s.step(
        "no appraisal is made in it now",
        s.ada.run(createAppraisal, { employee: s.world.newHire, appraisalCycle: s.world.appraisalCycle, appraisalTemplate: s.world.appraisalTemplate }),
        refuses(AppraisalCycleCompleted),
        noEvents(),
      ),
      s.step("Bo can't reopen it", s.bo.run(reopen, { appraisalCycle: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Olga", s.olga.run(reopen, { appraisalCycle: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada puts it back in progress",
        s.ada.run(reopen, { appraisalCycle: s.world.appraisalCycle }),
        expect((a) => a.appraisalCycle).toBe(s.world.appraisalCycle),
        emits(AppraisalCycleReopened, { appraisalCycle: s.world.appraisalCycle }),
        cycles.isIn(s.world.appraisalCycle, "inProgress"),
        spans({ present: ["appraisal-cycle.reopen", "appraisal-cycle.reopen.update"] }),
      ),
      s.step(
        "and may then add Dee's appraisal by hand",
        s.ada.run(createAppraisal, { employee: s.world.newHire, appraisalCycle: s.world.appraisalCycle, appraisalTemplate: s.world.appraisalTemplate }),
        expect((a) => a.appraisal).toMatch(/^apr_[0-9a-z]+$/),
      ),
      s.step(
        "Dee's takes the cycle's method, scored from goals, and the template's lines",
        s.ada.run(listAppraisals, { appraisalCycle: s.world.appraisalCycle, employee: s.world.newHire }),
        expect(rows).toEqual([fresh(s.world.newHire, "draft")]),
        noEvents(),
      ),
      s.step(
        "the cycle's settings read back unchanged",
        s.ada.run(get, { id: s.world.appraisalCycle }),
        expect((a) => [a.cycleName, a.startDate, a.endDate, a.kraEvaluationMethod, a.appraisees, a.state]).toEqual([
          "H2 2026", "2026-07-01", "2026-12-31", "Automated Based on Goal Progress", [olga, cy], "inProgress",
        ]),
        noEvents(),
      ),
      s.step(
        "Ada makes Olga's Q1 2027 appraisal by hand before it starts",
        s.ada.run(createAppraisal, { employee: s.world.employee, appraisalCycle: s.world.threePersonCycle, appraisalTemplate: s.world.appraisalTemplate }),
        expect((a) => a.appraisal).toMatch(/^apr_[0-9a-z]+$/),
      ),
      s.step(
        "Olga may set a goal in Q1 2027 before it starts: HRMS refuses only a completed cycle",
        s.olga.run(createGoal, { employee: s.world.employee, appraisalCycle: s.world.threePersonCycle, kra: s.world.kra, goalName: "Early start", progress: d("20"), isGroup: false } as never),
        goals.isIn(s.last.goal, "inProgress"),
      ),
      s.step("and move it to 40", s.olga.run(updateProgress, { goal: s.last.goal, progress: d("40") } as never), expect((g) => n(g.progress)).toBe("40")),
      s.step(
        "Dee leaves",
        s.ada.run(relieve, { employee: s.world.newHire, relievingDate: "2026-11-30" }),
        expect((a) => a.employee).toBe(s.world.newHire),
      ),
      s.step(
        "a new cycle listing her is refused, judged before a repeat",
        s.ada.run(create, cycle("Leaver", "2027-01-01", "2027-06-30", [olga, olga, dee])),
        refuses(AppraiseeHasLeft),
        noEvents(),
      ),
      s.step(
        "Bo of Acme Logistics is judged before Dee's leaving",
        s.ada.run(create, cycle("Leaver", "2027-01-01", "2027-06-30", [dee, bo])),
        refuses(AppraiseeNotInCompany),
        noEvents(),
      ),
      s.step(
        "Ada makes a template in Acme Logistics",
        s.ada.run(createTemplate, {
          company: s.world.otherCompany, title: "Drivers", kras: [{ kra: s.world.outsideKra, weightage: d("100") }], criteria: [],
        }),
        expect((a) => a.appraisalTemplate).toMatch(/^apt_[0-9a-z]+$/),
      ),
      s.step(
        "Dee's leaving is judged before Cy listed by Acme Logistics' template",
        s.ada.run(create, cycle("Leaver", "2027-01-01", "2027-06-30", [{ employee: s.world.secondEmployee, appraisalTemplate: s.last.appraisalTemplate }, dee])),
        refuses(AppraiseeHasLeft),
        noEvents(),
      ),
      s.step(
        "a cycle by that template in Acme Trading is refused, listed last, judged before a repeat",
        s.ada.run(create, cycle("Borrowed", "2027-01-01", "2027-06-30", [olga, olga, { employee: s.world.secondEmployee, appraisalTemplate: s.last.appraisalTemplate }])),
        refuses(AppraiseeTemplateNotInCompany),
        noEvents(),
      ),
      s.step(
        "Ada starts Q1 2027: Olga has one already and Dee has left, so it makes Cy's alone",
        s.ada.run(start, { appraisalCycle: s.world.threePersonCycle }),
        expect((a) => a.appraisals.length).toBe(1),
        cycles.isIn(s.world.threePersonCycle, "inProgress"),
      ),
      s.step(
        "Q1 2027 holds Olga's and Cy's, rated by hand, and none of Dee's",
        s.ada.run(listAppraisals, { appraisalCycle: s.world.threePersonCycle }),
        expect((a) => a.items.map((i: Item) => [i.employee, i.kraEvaluationMethod, i.state])).toEqual([
          [s.world.employee, "Manual Rating", "draft"],
          [s.world.secondEmployee, "Manual Rating", "draft"],
        ]),
        noEvents(),
      ),

      // ── Each appraisee by their own row's template
      s.step(
        "Ada makes a template of one KRA, Quality at 100, and no criteria",
        s.ada.run(createTemplate, { company: s.world.company, title: "Quality only", kras: [{ kra: s.world.kra, weightage: d("100") }], criteria: [] }),
        expect((a) => a.appraisalTemplate).toMatch(/^apt_[0-9a-z]+$/),
      ),
      s.step(
        "and a cycle appraising Olga by Engineers and Cy by the one-KRA template",
        s.ada.run(create, cycle("Mixed 2027", "2027-10-01", "2027-12-31", [olga, { employee: s.world.secondEmployee, appraisalTemplate: s.last.appraisalTemplate }])),
        expect((a) => a.appraisalCycle).toMatch(/^apc_[0-9a-z]+$/),
      ),
      s.step("she starts it: two appraisals", s.ada.run(start, { appraisalCycle: s.last.appraisalCycle }), expect((a) => a.appraisals.length).toBe(2)),
      s.step(
        "each takes the lines of their own row's template",
        s.ada.run(listAppraisals, { appraisalCycle: s.last.appraisalCycle }),
        expect((a) => a.items.map((i: Item) => [i.employee, i.kras.map((k) => [k.kra, n(k.weightage)]), i.selfRatings.length])).toEqual([
          [s.world.employee, [[s.world.kra, "30"], [s.world.otherKra, "70"]], 2],
          [s.world.secondEmployee, [[s.world.kra, "100"]], 0],
        ]),
        noEvents(),
      ),

      // ── A start that makes nothing still starts
      s.step("Ada sets up a summer cycle for Olga", s.ada.run(create, cycle("Summer 2027", "2027-07-01", "2027-09-30", [olga])), expect((a) => a.appraisalCycle).toMatch(/^apc_[0-9a-z]+$/)),
      s.step(
        "and makes Olga's appraisal in it by hand",
        s.ada.run(createAppraisal, { employee: s.world.employee, appraisalCycle: s.last.appraisalCycle, appraisalTemplate: s.world.appraisalTemplate }),
        expect((a) => a.appraisal).toMatch(/^apr_[0-9a-z]+$/),
      ),
      s.step("it reads back as Olga's", s.ada.run(getAppraisal, { id: s.last.appraisal }), expect((a) => a.employee).toBe(s.world.employee), noEvents()),
      s.step(
        "starting the summer cycle makes nothing, since Olga has hers, and it is in progress",
        s.ada.run(start, { appraisalCycle: s.last.appraisalCycle }),
        expect((a) => a.appraisals.length).toBe(0),
        cycles.isIn(s.last.appraisalCycle, "inProgress"),
      ),
    ];
  },
});
