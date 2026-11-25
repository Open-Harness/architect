// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// Goals follow HRMS (CX-appraisals): a goal's status follows its progress (0 pending, below 100 in progress, 100
// completed) unless it is archived or closed; a group's progress is the average of its children that aren't archived,
// all the way up; and under the automated method each KRA of the appraisal scores the average progress of the employee's
// top goals under it that aren't archived, weighted by the KRA. Every score is rounded to two places, half up.
// Refusal order on create (goal/errors.ts): GoalCycleCompleted, GoalEmployeeNotInCompany, GoalOwnerHasLeft,
// GoalKraNotInAppraisal, ParentGoalMismatch, ProgressOutOfRange, ParentGoalNotGroup.
import { BigDecimal } from "effect";
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import {
  GoalArchived,
  GoalClosed,
  GoalCompleted,
  GoalCreated,
  GoalProgressUpdated,
  GoalReopened,
  GoalUnarchived,
} from "../blueprint/things/goal/events.ts";
import {
  GoalCycleCompleted,
  GoalEmployeeNotInCompany,
  GoalIsGroup,
  GoalKraNotInAppraisal,
  GoalOwnerHasLeft,
  ParentGoalMismatch,
  ParentGoalNotGroup,
  ProgressOutOfRange,
} from "../blueprint/things/goal/errors.ts";
import { machine as goals } from "../blueprint/things/goal/machine.ts";
import create from "../blueprint/things/goal/verbs/create.ts";
import updateProgress from "../blueprint/things/goal/verbs/update-progress.ts";
import complete from "../blueprint/things/goal/verbs/complete.ts";
import archive from "../blueprint/things/goal/verbs/archive.ts";
import close from "../blueprint/things/goal/verbs/close.ts";
import unarchive from "../blueprint/things/goal/verbs/unarchive.ts";
import reopen from "../blueprint/things/goal/verbs/reopen.ts";
import get from "../blueprint/things/goal/verbs/get.ts";
import list from "../blueprint/things/goal/verbs/list.ts";
import getAppraisal from "../blueprint/things/appraisal/verbs/get.ts";
import submitAppraisal from "../blueprint/things/appraisal/verbs/submit.ts";
import completeCycle from "../blueprint/things/appraisal-cycle/verbs/complete.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";

const d = BigDecimal.fromStringUnsafe;
const n = (x: BigDecimal.BigDecimal) => BigDecimal.format(BigDecimal.normalize(x));
type Goal = { id: string; goalName: string; progress: BigDecimal.BigDecimal; isGroup: boolean; parentGoal?: string; state: string };
/** An employee's goals in a cycle as rows: name, progress, group or not, the row of its parent (or null), status. */
const tree = (p: { items: ReadonlyArray<Goal> }) =>
  p.items.map((g) => [g.goalName, n(g.progress), g.isGroup, g.parentGoal === undefined ? null : p.items.findIndex((x) => x.id === g.parentGoal), g.state]);
type Scored = {
  kras: ReadonlyArray<{ kra: string; weightage: BigDecimal.BigDecimal; score: BigDecimal.BigDecimal; earned: BigDecimal.BigDecimal }>;
  totalScore: BigDecimal.BigDecimal; selfScore: BigDecimal.BigDecimal; avgFeedbackScore: BigDecimal.BigDecimal; finalScore: BigDecimal.BigDecimal; state: string;
};
/** An appraisal's KRA lines (KRA, weightage, score, earned), then its total, self, feedback and final scores, and its state. */
const scored = (a: Scored) => [
  a.kras.map((k) => [k.kra, n(k.weightage), n(k.score), n(k.earned)]),
  n(a.totalScore), n(a.selfScore), n(a.avgFeedbackScore), n(a.finalScore), a.state,
];

export default Blueprint.journey("set and track goals", {
  // H2 2026 scores goals' progress; Olga and Cy are appraised in it by Engineers (Quality 30, Development 70). Olga has
  // set herself Ship the ledger under Quality, at 0, and Cy Write the runbook under Development, at 50. H1 2027 is rated
  // by hand. Dee is in neither cycle; Bo drives for Acme Logistics.
  cast: { ada: owner, olga: Blueprint.signedIn, cy: Blueprint.signedIn, dee: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a started manual cycle",
  steps: (s) => {
    const olgaGoal = (kra: unknown, goalName: string, progress: string, extra: object = {}) => ({
      employee: s.world.employee, appraisalCycle: s.world.appraisalCycle, kra, goalName, progress: d(progress), isGroup: false, ...extra,
    }) as never;
    const manual = (kra: unknown, goalName: string, progress: string) => ({
      employee: s.world.employee, appraisalCycle: s.world.manualCycle, kra, goalName, progress: d(progress), isGroup: false,
    }) as never;
    const q = s.world.kra;
    const dev = s.world.otherKra;
    return [
      // ── Reading a goal
      s.step(
        "Olga's goal reads back as she set it, pending at 0",
        s.olga.run(get, { id: s.world.goal }),
        expect((a) => [a.company, a.employee, a.appraisalCycle, a.kra, a.goalName, n(a.progress), a.isGroup, a.state]).toEqual([
          s.world.company, s.world.employee, s.world.appraisalCycle, q, "Ship the ledger", "0", false, "pending",
        ]),
        noEvents(),
      ),
      s.step("Ada reads it too", s.ada.run(get, { id: s.world.goal }), expect((a) => a.goalName).toBe("Ship the ledger"), noEvents()),
      s.step("Cy can't read Olga's goal", s.cy.run(get, { id: s.world.goal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo", s.bo.run(get, { id: s.world.goal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("Cy can't list Olga's goals", s.cy.run(list, { employee: s.world.employee }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo list the cycle's", s.bo.run(list, { appraisalCycle: s.world.appraisalCycle }), refuses(Blueprint.NotAllowed), noEvents()),

      // ── Progress feeds the appraisal
      s.step("Cy can't move Olga's progress", s.cy.run(updateProgress, { goal: s.world.goal, progress: d("50") }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo", s.bo.run(updateProgress, { goal: s.world.goal, progress: d("50") }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Olga moves it to 50, and it is in progress",
        s.olga.run(updateProgress, { goal: s.world.goal, progress: d("50") }),
        expect((a) => [a.goal, n(a.progress), a.appraisal]).toEqual([s.world.goal, "50", s.world.appraisal]),
        emits(GoalProgressUpdated, { goal: s.world.goal }),
        goals.isIn(s.world.goal, "inProgress"),
        spans({ present: ["goal.update-progress", "goal.update-progress.load", "goal.update-progress.update"] }),
      ),
      s.step(
        "her appraisal's Quality scores 50, earning 15 of its 30: a total of 0.75 out of 5, and a final score of 0.25",
        s.olga.run(getAppraisal, { id: s.world.appraisal }),
        expect(scored).toEqual([[[q, "30", "50", "15"], [dev, "70", "0", "0"]], "0.75", "0", "0", "0.25", "draft"]),
        noEvents(),
      ),

      // ── A tree of goals under Development
      s.step(
        "Olga sets a group goal, Platform, typing 80: a group starts at 0",
        s.olga.run(create, { ...(olgaGoal(dev, "Platform work", "80") as object), isGroup: true } as never),
        expect((a) => a.appraisal).toBe(s.world.appraisal),
        emits(GoalCreated, { goal: s.last.goal, employee: s.world.employee, kra: dev }),
        goals.isIn(s.last.goal, "pending"),
        spans({ present: ["goal.create", "goal.create.load", "goal.create.insert"] }),
      ),
      s.step(
        "under it, Design API, done at 100",
        s.olga.run(create, olgaGoal(dev, "API design", "100", { parentGoal: s.last.goal })),
        expect((a) => a.goal).toMatch(/^gol_[0-9a-z]+$/),
        goals.isIn(s.last.goal, "completed"),
      ),
      s.step(
        "Platform follows its one child to 100, completed",
        s.olga.run(list, { appraisalCycle: s.world.appraisalCycle, employee: s.world.employee }),
        expect((a) => [a.items.length, a.items[1].goalName, n(a.items[1].progress), a.items[1].state]).toEqual([3, "Platform work", "100", "completed"]),
        noEvents(),
      ),
      s.step(
        "under Platform, Write docs at 25, in progress",
        s.olga.run(create, olgaGoal(dev, "Docs writing", "25", { parentGoal: s.last.items[1].id })),
        expect((a) => a.goal).toMatch(/^gol_[0-9a-z]+$/),
        goals.isIn(s.last.goal, "inProgress"),
      ),
      s.step(
        "Platform is now 62.5, in progress",
        s.olga.run(list, { appraisalCycle: s.world.appraisalCycle, employee: s.world.employee }),
        expect((a) => [a.items.length, n(a.items[1].progress), a.items[1].state]).toEqual([4, "62.5", "inProgress"]),
        noEvents(),
      ),
      s.step(
        "under Platform, a group of its own, Guides",
        s.olga.run(create, { ...(olgaGoal(dev, "Guides", "0", { parentGoal: s.last.items[1].id }) as object), isGroup: true } as never),
        goals.isIn(s.last.goal, "pending"),
      ),
      s.step(
        "under Guides, Guide one at 60",
        s.olga.run(create, olgaGoal(dev, "First guide", "60", { parentGoal: s.last.goal })),
        expect((a) => a.appraisal).toBe(s.world.appraisal),
        goals.isIn(s.last.goal, "inProgress"),
      ),
      s.step(
        "Guides follows to 60, and Platform, two levels up, to 61.67, the average of 100, 25 and 60",
        s.olga.run(list, { appraisalCycle: s.world.appraisalCycle, employee: s.world.employee }),
        expect(tree).toEqual([
          ["Ship the ledger", "50", false, null, "inProgress"],
          ["Platform work", "61.67", true, null, "inProgress"],
          ["API design", "100", false, 1, "completed"],
          ["Docs writing", "25", false, 1, "inProgress"],
          ["Guides", "60", true, 1, "inProgress"],
          ["First guide", "60", false, 4, "inProgress"],
        ]),
        noEvents(),
      ),
      s.step(
        "Development scores Platform's 61.67 alone, its only top goal, earning 43.17: a total of 2.91 and a final score of 0.97",
        s.ada.run(getAppraisal, { id: s.world.appraisal }),
        expect(scored).toEqual([[[q, "30", "50", "15"], [dev, "70", "61.67", "43.17"]], "2.91", "0", "0", "0.97", "draft"]),
        noEvents(),
      ),

      // ── Create's refusals, each pinned before the next
      s.step("Olga lists her goals", s.olga.run(list, { appraisalCycle: s.world.appraisalCycle, employee: s.world.employee }), expect((a) => a.items.length).toBe(6)),
      s.step(
        "a goal can't go under Ship the ledger, which isn't a group",
        s.olga.run(create, olgaGoal(q, "Sub-ledger", "10", { parentGoal: s.last.items[0].id })),
        refuses(ParentGoalNotGroup),
        noEvents(),
        spans({ absent: ["goal.create.insert"] }),
      ),
      s.step(
        "progress over 100 is judged before that",
        s.olga.run(create, olgaGoal(q, "Sub-ledger", "100.01", { parentGoal: s.last.items[0].id })),
        refuses(ProgressOutOfRange),
        noEvents(),
      ),
      s.step(
        "and so is progress below 0, at the top too",
        s.olga.run(create, olgaGoal(q, "Negative", "-0.01")),
        refuses(ProgressOutOfRange),
        noEvents(),
      ),
      s.step(
        "a child under another KRA than its parent's is refused, judged before its progress",
        s.olga.run(create, olgaGoal(q, "Wrong KRA", "101", { parentGoal: s.last.items[1].id })),
        refuses(ParentGoalMismatch),
        noEvents(),
      ),
      s.step(
        "and so is a child in another cycle",
        s.olga.run(create, { ...(manual(dev, "Wrong cycle", "10") as object), parentGoal: s.last.items[1].id } as never),
        refuses(ParentGoalMismatch),
        noEvents(),
      ),
      s.step(
        "and Cy's own goal under Olga's Platform",
        s.cy.run(create, {
          employee: s.world.secondEmployee, appraisalCycle: s.world.appraisalCycle, kra: dev, goalName: "Borrowed", progress: d("10"), isGroup: false,
          parentGoal: s.last.items[1].id,
        }),
        refuses(ParentGoalMismatch),
        noEvents(),
      ),
      s.step(
        "a KRA of Acme Logistics isn't on Olga's appraisal, judged before a parent",
        s.olga.run(create, olgaGoal(s.world.outsideKra, "Drive", "10", { parentGoal: s.last.items[0].id })),
        refuses(GoalKraNotInAppraisal),
        noEvents(),
      ),
      s.step(
        "Dee has no appraisal in H2 2026, so she can't set a goal in it",
        s.dee.run(create, { employee: s.world.newHire, appraisalCycle: s.world.appraisalCycle, kra: q, goalName: "Settle in", progress: d("0"), isGroup: false }),
        refuses(GoalKraNotInAppraisal),
        noEvents(),
      ),
      s.step(
        "Ada can't set Bo a goal in Acme Trading's cycle: he works for Acme Logistics",
        s.ada.run(create, { employee: s.world.outsider, appraisalCycle: s.world.appraisalCycle, kra: s.world.outsideKra, goalName: "Drive", progress: d("0"), isGroup: false }),
        refuses(GoalEmployeeNotInCompany),
        noEvents(),
      ),
      s.step(
        "Cy can't set Olga a goal",
        s.cy.run(create, olgaGoal(q, "Cy's idea", "0")),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["goal.create", "goal.create.insert"] }),
      ),
      s.step("nor can Bo", s.bo.run(create, olgaGoal(q, "Bo's idea", "0")), refuses(Blueprint.NotAllowed), noEvents()),

      // ── A group follows its children: it isn't moved by hand
      s.step("Olga lists her goals", s.olga.run(list, { appraisalCycle: s.world.appraisalCycle, employee: s.world.employee }), expect((a) => a.items.length).toBe(6)),
      s.step("Platform's progress isn't set by hand", s.olga.run(updateProgress, { goal: s.last.items[1].id, progress: d("90") }), refuses(GoalIsGroup), noEvents()),
      s.step("even out of range, the group is judged first", s.olga.run(updateProgress, { goal: s.last.items[1].id, progress: d("150") }), refuses(GoalIsGroup), noEvents()),
      s.step("nor is it completed by hand", s.ada.run(complete, { goal: s.last.items[1].id }), refuses(GoalIsGroup), noEvents()),
      s.step("nor archived", s.ada.run(archive, { goal: s.last.items[1].id }), refuses(GoalIsGroup), noEvents()),
      s.step("nor closed", s.ada.run(close, { goal: s.last.items[1].id }), refuses(GoalIsGroup), noEvents()),
      s.step("Write docs can't go over 100", s.olga.run(updateProgress, { goal: s.last.items[3].id, progress: d("100.01") }), refuses(ProgressOutOfRange), noEvents()),
      s.step("nor below 0", s.olga.run(updateProgress, { goal: s.last.items[3].id, progress: d("-1") }), refuses(ProgressOutOfRange), noEvents()),

      // ── Archiving takes a goal out of its parent's average and its appraisal's
      s.step("Cy can't archive Olga's Write docs", s.cy.run(archive, { goal: s.last.items[3].id }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo", s.bo.run(archive, { goal: s.last.items[3].id }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Olga archives Write docs",
        s.olga.run(archive, { goal: s.last.items[3].id }),
        emits(GoalArchived, { goal: s.last.goal }),
        goals.isIn(s.last.goal, "archived"),
        spans({ present: ["goal.archive", "goal.archive.load", "goal.archive.update"] }),
      ),
      s.step(
        "an archived goal's progress still moves, to 90, and it stays archived",
        s.olga.run(updateProgress, { goal: s.last.goal, progress: d("90") }),
        expect((a) => [n(a.progress), a.appraisal]).toEqual(["90", s.world.appraisal]),
        goals.isIn(s.last.goal, "archived"),
      ),
      s.step(
        "Platform leaves it out: the average of 100 and 60 is 80",
        s.olga.run(list, { appraisalCycle: s.world.appraisalCycle, employee: s.world.employee }),
        expect((a) => tree(a).map((r) => [r[0], r[1], r[4]])).toEqual([
          ["Ship the ledger", "50", "inProgress"], ["Platform work", "80", "inProgress"], ["API design", "100", "completed"],
          ["Docs writing", "90", "archived"], ["Guides", "60", "inProgress"], ["First guide", "60", "inProgress"],
        ]),
        noEvents(),
      ),
      s.step(
        "Development scores 80, earning 56: a total of 3.55 and a final score of 1.18",
        s.olga.run(getAppraisal, { id: s.world.appraisal }),
        expect(scored).toEqual([[[q, "30", "50", "15"], [dev, "70", "80", "56"]], "3.55", "0", "0", "1.18", "draft"]),
        noEvents(),
      ),
      s.step("Olga lists her goals", s.olga.run(list, { appraisalCycle: s.world.appraisalCycle, employee: s.world.employee }), expect((a) => a.items.length).toBe(6)),
      s.step("Cy can't unarchive Olga's", s.cy.run(unarchive, { goal: s.last.items[3].id }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Olga unarchives Write docs: at 90 it is in progress again",
        s.olga.run(unarchive, { goal: s.last.items[3].id }),
        emits(GoalUnarchived, { goal: s.last.goal }),
        goals.isIn(s.last.goal, "inProgress"),
        spans({ present: ["goal.unarchive", "goal.unarchive.update"] }),
      ),
      s.step(
        "Development counts it again: Platform 83.33, earning 58.33, a total of 3.67 and a final score of 1.22",
        s.olga.run(getAppraisal, { id: s.world.appraisal }),
        expect(scored).toEqual([[[q, "30", "50", "15"], [dev, "70", "83.33", "58.33"]], "3.67", "0", "0", "1.22", "draft"]),
        noEvents(),
      ),

      // ── Closing keeps a goal counting
      s.step("Cy can't close Olga's Ship the ledger", s.cy.run(close, { goal: s.world.goal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada closes it",
        s.ada.run(close, { goal: s.world.goal }),
        emits(GoalClosed, { goal: s.world.goal }),
        goals.isIn(s.world.goal, "closed"),
        spans({ present: ["goal.close", "goal.close.update"] }),
      ),
      s.step(
        "its progress still moves, to 100, and it stays closed",
        s.olga.run(updateProgress, { goal: s.world.goal, progress: d("100") }),
        goals.isIn(s.world.goal, "closed"),
      ),
      s.step(
        "a closed goal still counts: Quality scores 100, earning 30, a total of 4.42 and a final score of 1.47",
        s.olga.run(getAppraisal, { id: s.world.appraisal }),
        expect(scored).toEqual([[[q, "30", "100", "30"], [dev, "70", "83.33", "58.33"]], "4.42", "0", "0", "1.47", "draft"]),
        noEvents(),
      ),

      // ── Cy's goal, and a leaver
      s.step(
        "Cy's appraisal scores her runbook's 50 under Development, earning 35: a total of 1.75 and a final score of 0.58",
        s.cy.run(getAppraisal, { id: s.world.secondAppraisal }),
        expect(scored).toEqual([[[q, "30", "0", "0"], [dev, "70", "50", "35"]], "1.75", "0", "0", "0.58", "draft"]),
        noEvents(),
      ),
      s.step("Olga's progress doesn't touch Cy's: Cy's goal still reads 50", s.cy.run(get, { id: s.world.secondGoal }), expect((a) => [n(a.progress), a.state]).toEqual(["50", "inProgress"]), noEvents()),
      s.step("Cy leaves", s.ada.run(relieve, { employee: s.world.secondEmployee, relievingDate: "2026-11-30" }), expect((a) => a.employee).toBe(s.world.secondEmployee)),
      s.step(
        "she may still move a goal she already has, to 70",
        s.cy.run(updateProgress, { goal: s.world.secondGoal, progress: d("70") }),
        expect((a) => [n(a.progress), a.appraisal]).toEqual(["70", s.world.secondAppraisal]),
      ),
      s.step(
        "and her appraisal follows: 70 earns 49, a total of 2.45 and a final score of 0.82",
        s.ada.run(getAppraisal, { id: s.world.secondAppraisal }),
        expect(scored).toEqual([[[q, "30", "0", "0"], [dev, "70", "70", "49"]], "2.45", "0", "0", "0.82", "draft"]),
        noEvents(),
      ),
      s.step(
        "but she can't set a new goal",
        s.cy.run(create, { employee: s.world.secondEmployee, appraisalCycle: s.world.appraisalCycle, kra: q, goalName: "One more", progress: d("0"), isGroup: false }),
        refuses(GoalOwnerHasLeft),
        noEvents(),
      ),
      s.step(
        "her leaving is judged before a KRA that isn't on her appraisal",
        s.ada.run(create, { employee: s.world.secondEmployee, appraisalCycle: s.world.appraisalCycle, kra: s.world.outsideKra, goalName: "One more", progress: d("0"), isGroup: false }),
        refuses(GoalOwnerHasLeft),
        noEvents(),
      ),
      s.step("Ada archives the runbook", s.ada.run(archive, { goal: s.world.secondGoal }), goals.isIn(s.world.secondGoal, "archived")),
      s.step(
        "Cy's Development has no goal counting now, and scores 0",
        s.ada.run(getAppraisal, { id: s.world.secondAppraisal }),
        expect(scored).toEqual([[[q, "30", "0", "0"], [dev, "70", "0", "0"]], "0", "0", "0", "0", "draft"]),
        noEvents(),
      ),

      // ── Every move by status, in H1 2027, rated by hand
      s.step("Olga sets a goal at 0 in H1 2027: pending", s.olga.run(create, manual(q, "Idle", "0")), goals.isIn(s.last.goal, "pending")),
      s.step("Cy can't close it", s.cy.run(close, { goal: s.last.goal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("Olga closes it from pending", s.olga.run(close, { goal: s.last.goal }), goals.isIn(s.last.goal, "closed")),
      s.step("Cy can't reopen it", s.cy.run(reopen, { goal: s.last.goal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo", s.bo.run(reopen, { goal: s.last.goal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "reopened at 0, it is pending again",
        s.olga.run(reopen, { goal: s.last.goal }),
        emits(GoalReopened, { goal: s.last.goal }),
        goals.isIn(s.last.goal, "pending"),
        spans({ present: ["goal.reopen", "goal.reopen.update"] }),
      ),
      s.step("Olga archives it from pending", s.olga.run(archive, { goal: s.last.goal }), goals.isIn(s.last.goal, "archived")),
      s.step("closes it from archived", s.olga.run(close, { goal: s.last.goal }), goals.isIn(s.last.goal, "closed")),
      s.step("archives it again from closed", s.olga.run(archive, { goal: s.last.goal }), goals.isIn(s.last.goal, "archived")),
      s.step("it can't be reopened while archived", s.olga.run(reopen, { goal: s.last.goal }), refuses(goals.notFrom, { state: "archived" }), noEvents()),
      s.step("unarchived at 0, it is pending", s.olga.run(unarchive, { goal: s.last.goal }), goals.isIn(s.last.goal, "pending")),
      s.step("it can't be unarchived twice", s.olga.run(unarchive, { goal: s.last.goal }), refuses(goals.notFrom, { state: "pending" }), noEvents()),
      s.step("Olga sets a goal at 40: in progress", s.olga.run(create, manual(q, "Steady", "40")), goals.isIn(s.last.goal, "inProgress")),
      s.step("she archives it from in progress", s.olga.run(archive, { goal: s.last.goal }), goals.isIn(s.last.goal, "archived")),
      s.step("unarchived at 40, it is in progress", s.olga.run(unarchive, { goal: s.last.goal }), goals.isIn(s.last.goal, "inProgress")),
      s.step("she closes it from in progress", s.olga.run(close, { goal: s.last.goal }), goals.isIn(s.last.goal, "closed")),
      s.step("reopened at 40, it is in progress", s.olga.run(reopen, { goal: s.last.goal }), goals.isIn(s.last.goal, "inProgress")),
      s.step("back to 0, it is pending", s.olga.run(updateProgress, { goal: s.last.goal, progress: d("0") }), goals.isIn(s.last.goal, "pending")),
      s.step("at 99.99 it is still in progress", s.olga.run(updateProgress, { goal: s.last.goal, progress: d("99.99") }), goals.isIn(s.last.goal, "inProgress")),
      s.step("at 0.01 too", s.olga.run(updateProgress, { goal: s.last.goal, progress: d("0.01") }), goals.isIn(s.last.goal, "inProgress")),
      s.step("Cy can't complete it", s.cy.run(complete, { goal: s.last.goal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Bo", s.bo.run(complete, { goal: s.last.goal }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Olga completes it",
        s.olga.run(complete, { goal: s.last.goal }),
        emits(GoalCompleted, { goal: s.last.goal }),
        goals.isIn(s.last.goal, "completed"),
        spans({ present: ["goal.complete", "goal.complete.update"] }),
      ),
      s.step("completing set its progress to 100", s.olga.run(get, { id: s.last.goal }), expect((a) => [n(a.progress), a.state]).toEqual(["100", "completed"]), noEvents()),
      s.step("Olga lists H1 2027's goals", s.olga.run(list, { appraisalCycle: s.world.manualCycle, employee: s.world.employee }), expect((a) => a.items.length).toBe(2)),
      s.step("a completed goal can't be completed again", s.olga.run(complete, { goal: s.last.items[1].id }), refuses(goals.notFrom, { state: "completed" }), noEvents()),
      s.step("nor archived", s.olga.run(archive, { goal: s.last.items[1].id }), refuses(goals.notFrom, { state: "completed" }), noEvents()),
      s.step("nor closed", s.olga.run(close, { goal: s.last.items[1].id }), refuses(goals.notFrom, { state: "completed" }), noEvents()),
      s.step("but its progress moves back to 70, in progress", s.olga.run(updateProgress, { goal: s.last.items[1].id, progress: d("70") }), goals.isIn(s.last.goal, "inProgress")),
      s.step("and up to 100, completed", s.olga.run(updateProgress, { goal: s.last.goal, progress: d("100") }), goals.isIn(s.last.goal, "completed")),
      s.step("Olga sets a goal at 100: completed", s.olga.run(create, manual(dev, "Done already", "100")), goals.isIn(s.last.goal, "completed")),
      s.step("Olga sets one at 50 and archives it", s.olga.run(create, manual(dev, "Later", "50")), goals.isIn(s.last.goal, "inProgress")),
      s.step("archived", s.olga.run(archive, { goal: s.last.goal }), goals.isIn(s.last.goal, "archived")),
      s.step("it reaches 100 while archived", s.olga.run(updateProgress, { goal: s.last.goal, progress: d("100") }), goals.isIn(s.last.goal, "archived")),
      s.step("unarchived at 100, it is completed", s.olga.run(unarchive, { goal: s.last.goal }), goals.isIn(s.last.goal, "completed")),
      s.step("Olga sets one at 50 and closes it", s.olga.run(create, manual(dev, "Closed early", "50")), goals.isIn(s.last.goal, "inProgress")),
      s.step("closed", s.olga.run(close, { goal: s.last.goal }), goals.isIn(s.last.goal, "closed")),
      s.step("it reaches 100 while closed", s.olga.run(updateProgress, { goal: s.last.goal, progress: d("100") }), goals.isIn(s.last.goal, "closed")),
      s.step("reopened at 100, it is completed", s.olga.run(reopen, { goal: s.last.goal }), goals.isIn(s.last.goal, "completed")),
      s.step(
        "a group typed at 150 starts at 0, pending",
        s.olga.run(create, { ...(manual(q, "Group", "150") as object), isGroup: true } as never),
        goals.isIn(s.last.goal, "pending"),
      ),
      s.step("it reads back at 0, a group", s.olga.run(get, { id: s.last.goal }), expect((a) => [n(a.progress), a.isGroup, a.state]).toEqual(["0", true, "pending"]), noEvents()),
      s.step(
        "H1 2027 is rated by hand, so none of these goals scores Olga's appraisal there",
        s.olga.run(getAppraisal, { id: s.world.manualAppraisal }),
        expect(scored).toEqual([[[q, "30", "0", "0"], [dev, "70", "0", "0"]], "0", "0", "0", "0", "draft"]),
        noEvents(),
      ),

      // ── A completed cycle takes no change to its goals
      s.step("Ada submits Olga's H2 2026 appraisal", s.ada.run(submitAppraisal, { appraisal: s.world.appraisal }), expect((a) => n(a.finalScore)).toBe("1.47")),
      s.step("and Cy's", s.ada.run(submitAppraisal, { appraisal: s.world.secondAppraisal }), expect((a) => n(a.finalScore)).toBe("0")),
      s.step("and completes H2 2026", s.ada.run(completeCycle, { appraisalCycle: s.world.appraisalCycle }), expect((a) => a.appraisalCycle).toBe(s.world.appraisalCycle)),
      s.step(
        "no goal is set in it now, judged before Bo's company",
        s.ada.run(create, { employee: s.world.outsider, appraisalCycle: s.world.appraisalCycle, kra: s.world.outsideKra, goalName: "Drive", progress: d("0"), isGroup: false }),
        refuses(GoalCycleCompleted),
        noEvents(),
      ),
      s.step("Olga lists her H2 2026 goals", s.olga.run(list, { appraisalCycle: s.world.appraisalCycle, employee: s.world.employee }), expect((a) => a.items.length).toBe(6)),
      s.step("no progress moves", s.olga.run(updateProgress, { goal: s.last.items[5].id, progress: d("70") }), refuses(GoalCycleCompleted), noEvents()),
      s.step("no group is judged before the cycle", s.olga.run(updateProgress, { goal: s.last.items[1].id, progress: d("70") }), refuses(GoalCycleCompleted), noEvents()),
      s.step("nothing is completed, a group either", s.ada.run(complete, { goal: s.last.items[1].id }), refuses(GoalCycleCompleted), noEvents()),
      s.step("nothing archived", s.ada.run(archive, { goal: s.last.items[5].id }), refuses(GoalCycleCompleted), noEvents()),
      s.step("nothing closed", s.ada.run(close, { goal: s.last.items[5].id }), refuses(GoalCycleCompleted), noEvents()),
      s.step("nothing reopened", s.ada.run(reopen, { goal: s.world.goal }), refuses(GoalCycleCompleted), noEvents()),
      s.step("nothing unarchived", s.ada.run(unarchive, { goal: s.world.secondGoal }), refuses(GoalCycleCompleted), noEvents()),
      s.step(
        "Olga's appraisal reads back submitted, as it stood",
        s.olga.run(getAppraisal, { id: s.world.appraisal }),
        expect(scored).toEqual([[[q, "30", "100", "30"], [dev, "70", "83.33", "58.33"]], "4.42", "0", "0", "1.47", "submitted"]),
        noEvents(),
      ),
    ];
  },
});
