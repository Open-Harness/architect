import { Blueprint, type Field } from "orthograph";
import { Company } from "../company/thing.ts";
import { Employee } from "../employee/thing.ts";
import { AppraisalCycle } from "../appraisal-cycle/thing.ts";
import { Kra } from "../kra/thing.ts";
import { GoalName, Progress } from "../../values/appraisals.ts";

// HRMS's Goal (hrms/hr/doctype/goal): the employee, the cycle, the KRA, its name, its progress from 0 to 100, and an
// optional parent goal of the same employee, KRA and cycle (a tree, HRMS's NestedSet on `parent_goal`), whose `isGroup`
// says it holds goals: a group's progress is its children's average, never typed. Its company is
// the employee's. HRMS's cycle is optional; here a goal always belongs to a cycle, as every journey of appraisals needs.
// Its description and copied days are left out (`decisions/CX-appraisals.md`).
// A goal's id, named before the thing so its parent's link can be typed: the thing refers to itself (TS7022).
const goalId = Blueprint.id("gol");

export const Goal = Blueprint.thing({
  description: "Something an employee aims to do in an appraisal cycle, under one KRA.",
  code: "GL",
  fields: {
    id: goalId,
    company: Company.fields.id,
    employee: Employee.fields.id,
    appraisalCycle: AppraisalCycle.fields.id,
    kra: Kra.fields.id,
    goalName: GoalName,
    progress: Progress,
    isGroup: Blueprint.described(Blueprint.bool(), "Whether the goal holds other goals, its progress following theirs (HRMS's `is_group`)."),
    parentGoal: Blueprint.optional(Blueprint.link((): Field<typeof goalId> => Goal.fields.id)),
  },
});
