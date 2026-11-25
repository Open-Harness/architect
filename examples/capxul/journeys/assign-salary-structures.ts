// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// HRMS's Salary Structure Assignment (decisions/CX-payroll.md). `create` refuses AssignedEmployeeNotInCompany, then
// AssignedEmployeeHasLeft, then AssignmentExists (a submitted assignment of the employee on the same day; drafts and
// cancelled ones don't count), then AssignmentBeforeJoining, then AssignedStructureNotInCompany, then
// AssignedStructureNotSubmitted. `submit` judges AssignmentExists, then AssignedStructureNotSubmitted, again.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import {
  SalaryStructureAssigned,
  SalaryStructureAssignmentCancelled,
  SalaryStructureAssignmentSubmitted,
} from "../blueprint/things/salary-structure-assignment/events.ts";
import {
  AssignedEmployeeHasLeft,
  AssignedEmployeeNotInCompany,
  AssignedStructureNotInCompany,
  AssignedStructureNotSubmitted,
  AssignmentBeforeJoining,
  AssignmentExists,
} from "../blueprint/things/salary-structure-assignment/errors.ts";
import { machine as assignments } from "../blueprint/things/salary-structure-assignment/machine.ts";
import { machine as structures } from "../blueprint/things/salary-structure/machine.ts";
import assign from "../blueprint/things/salary-structure-assignment/verbs/create.ts";
import submitAssignment from "../blueprint/things/salary-structure-assignment/verbs/submit.ts";
import cancelAssignment from "../blueprint/things/salary-structure-assignment/verbs/cancel.ts";
import getAssignment from "../blueprint/things/salary-structure-assignment/verbs/get.ts";
import listAssignments from "../blueprint/things/salary-structure-assignment/verbs/list.ts";
import createStructure from "../blueprint/things/salary-structure/verbs/create.ts";
import submitStructure from "../blueprint/things/salary-structure/verbs/submit.ts";
import cancelStructure from "../blueprint/things/salary-structure/verbs/cancel.ts";
import createComponent from "../blueprint/things/salary-component/verbs/create.ts";
import createAccount from "../blueprint/things/account/verbs/create.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";

const USDC = 1_000_000n;
type Row = { readonly company: string; readonly employee: string; readonly salaryStructure: string; readonly fromDate: string; readonly state: string };
const rows = (p: { readonly items: ReadonlyArray<Row> }) => p.items.map((i) => [i.company, i.employee, i.salaryStructure, i.fromDate, i.state]);

export default Blueprint.journey("assign salary structures", {
  // Acme Trading's submitted structure Engineers, assigned to Olga (joined 5 January 2026) from her joining day and
  // submitted; Cy joined on 12 January 2026 and holds no assignment. Ada also runs Acme Logistics, where Bo (signed in)
  // drives from 2 March 2026. Bo doesn't run Acme Trading.
  cast: { ada: owner, olga: Blueprint.signedIn, cy: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a payroll outsider",
  steps: (s) => {
    const to = (employee: unknown, salaryStructure: unknown, fromDate: string) =>
      s.ada.run(assign, { company: s.world.company, employee, salaryStructure, fromDate } as never);
    return [
      s.step(
        "Bo can't assign a structure at Acme Trading",
        s.bo.run(assign, { company: s.world.company, employee: s.world.secondEmployee, salaryStructure: s.world.salaryStructure, fromDate: "2026-01-12" }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        spans({ absent: ["salary-structure-assignment.create.insert"] }),
      ),
      s.step(
        "Acme Logistics' driver can't be assigned Acme Trading's structure",
        to(s.world.outsider, s.world.salaryStructure, "2026-03-02"),
        refuses(AssignedEmployeeNotInCompany),
        noEvents(),
        spans({ absent: ["salary-structure-assignment.create.insert"] }),
      ),
      s.step(
        "Cy can't be paid from the day before she joined, and the refusal names her joining day",
        to(s.world.secondEmployee, s.world.salaryStructure, "2026-01-11"),
        refuses(AssignmentBeforeJoining, { dateOfJoining: "2026-01-12" }),
        noEvents(),
      ),
      s.step(
        "Olga already has a submitted assignment from 5 January, so another that day is refused",
        to(s.world.employee, s.world.salaryStructure, "2026-01-05"),
        refuses(AssignmentExists, { fromDate: "2026-01-05" }),
        noEvents(),
      ),
      s.step(
        "Ada drafts a second structure: Basic at its own 3,000",
        s.ada.run(createStructure, { company: s.world.company, salaryStructureName: "Leads", earnings: [{ salaryComponent: s.world.basic, amount: 0n }], deductions: [] } as never),
      ),
      s.step(
        "a draft structure can't be assigned",
        to(s.world.secondEmployee, s.last.salaryStructure, "2026-01-12"),
        refuses(AssignedStructureNotSubmitted),
        noEvents(),
      ),
      s.step(
        "a day already taken is judged before the structure",
        to(s.world.employee, s.last.salaryStructure, "2026-01-05"),
        refuses(AssignmentExists, { fromDate: "2026-01-05" }),
        noEvents(),
      ),
      s.step(
        "and the joining day before the structure",
        to(s.world.secondEmployee, s.last.salaryStructure, "2026-01-11"),
        refuses(AssignmentBeforeJoining, { dateOfJoining: "2026-01-12" }),
        noEvents(),
      ),
      s.step(
        "another company's employee is judged before the day",
        to(s.world.outsider, s.last.salaryStructure, "2026-01-01"),
        refuses(AssignedEmployeeNotInCompany),
        noEvents(),
      ),
      s.step(
        "Ada starts Acme Logistics' chart with a root group",
        s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Expenses", isGroup: true, rootType: "Expense" }),
      ),
      s.step("and a ledger under it", s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Wages", parentAccount: s.last.account, isGroup: false })),
      s.step(
        "and Basic for Acme Logistics",
        s.ada.run(createComponent, { company: s.world.otherCompany, salaryComponent: "Basic", type: "Earning", amount: 1_000n * USDC, account: s.last.account }),
      ),
      s.step(
        "and drafts a structure there",
        s.ada.run(createStructure, { company: s.world.otherCompany, salaryStructureName: "Drivers", earnings: [{ salaryComponent: s.last.salaryComponent, amount: 0n }], deductions: [] } as never),
      ),
      s.step(
        "Cy can't be paid by Acme Logistics' structure, though it is a draft too",
        to(s.world.secondEmployee, s.last.salaryStructure, "2026-01-12"),
        refuses(AssignedStructureNotInCompany),
        noEvents(),
      ),
      s.step(
        "Ada assigns the engineers' structure to Cy from her joining day",
        to(s.world.secondEmployee, s.world.salaryStructure, "2026-01-12"),
        emits(SalaryStructureAssigned, { employee: s.world.secondEmployee, salaryStructure: s.world.salaryStructure, fromDate: "2026-01-12" }),
        assignments.isIn(s.last.salaryStructureAssignment, "draft"),
        spans({ present: ["salary-structure-assignment.create", "salary-structure-assignment.create.load", "salary-structure-assignment.create.insert"] }),
      ),
      s.step("Bo can't read it", s.bo.run(getAssignment, { id: s.last.salaryStructureAssignment }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor submit it", s.bo.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "a draft can't be cancelled",
        s.ada.run(cancelAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment }),
        refuses(assignments.notFrom, { state: "draft" }),
        noEvents(),
        spans({ absent: ["salary-structure-assignment.cancel.update"] }),
      ),
      s.step(
        "it reads back a draft",
        s.ada.run(getAssignment, { id: s.last.salaryStructureAssignment }),
        expect((a) => [a.company, a.employee, a.salaryStructure, a.fromDate, a.state]).toEqual([
          s.world.company, s.world.secondEmployee, s.world.salaryStructure, "2026-01-12", "draft",
        ]),
      ),
      s.step(
        "a second draft for the same day is allowed: drafts don't count",
        to(s.world.secondEmployee, s.world.salaryStructure, "2026-01-12"),
        assignments.isIn(s.last.salaryStructureAssignment, "draft"),
      ),
      s.step(
        "Ada submits the second",
        s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment }),
        expect((a) => [a.employee, a.salaryStructure]).toEqual([s.world.secondEmployee, s.world.salaryStructure]),
        emits(SalaryStructureAssignmentSubmitted, { salaryStructureAssignment: s.last.salaryStructureAssignment }),
        assignments.isIn(s.last.salaryStructureAssignment, "submitted"),
        spans({ present: ["salary-structure-assignment.submit", "salary-structure-assignment.submit.load", "salary-structure-assignment.submit.update"] }),
      ),
      s.step(
        "it can't be submitted twice",
        s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment }),
        refuses(assignments.notFrom, { state: "submitted" }),
        noEvents(),
      ),
      s.step("Bo can't list Cy's assignments", s.bo.run(listAssignments, { employee: s.world.secondEmployee }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step("nor can Cy herself", s.cy.run(listAssignments, { employee: s.world.secondEmployee }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Cy's assignments: the first a draft, the second submitted, oldest first",
        s.ada.run(listAssignments, { employee: s.world.secondEmployee }),
        expect(rows).toEqual([
          [s.world.company, s.world.secondEmployee, s.world.salaryStructure, "2026-01-12", "draft"],
          [s.world.company, s.world.secondEmployee, s.world.salaryStructure, "2026-01-12", "submitted"],
        ]),
      ),
      s.step(
        "the first can't be submitted now: the day is taken, and the refusal names it",
        s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.items[0].id }),
        refuses(AssignmentExists, { fromDate: "2026-01-12" }),
        noEvents(),
        spans({ absent: ["salary-structure-assignment.submit.update"] }),
      ),
      s.step(
        "nor can a new one for that day be made",
        to(s.world.secondEmployee, s.world.salaryStructure, "2026-01-12"),
        refuses(AssignmentExists, { fromDate: "2026-01-12" }),
        noEvents(),
      ),
      s.step("Bo can't cancel the second", s.bo.run(cancelAssignment, { salaryStructureAssignment: s.last.items[1].id }), refuses(Blueprint.NotAllowed), noEvents()),
      s.step(
        "Ada cancels it",
        s.ada.run(cancelAssignment, { salaryStructureAssignment: s.last.items[1].id }),
        expect((a) => a.salaryStructure).toBe(s.world.salaryStructure),
        emits(SalaryStructureAssignmentCancelled, { salaryStructureAssignment: s.last.salaryStructureAssignment }),
        assignments.isIn(s.last.salaryStructureAssignment, "cancelled"),
        spans({ present: ["salary-structure-assignment.cancel", "salary-structure-assignment.cancel.update"] }),
      ),
      s.step(
        "it can't be cancelled twice",
        s.ada.run(cancelAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment }),
        refuses(assignments.notFrom, { state: "cancelled" }),
        noEvents(),
      ),
      s.step(
        "nor submitted again",
        s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment }),
        refuses(assignments.notFrom, { state: "cancelled" }),
        noEvents(),
      ),
      s.step(
        "it reads back cancelled",
        s.ada.run(getAssignment, { id: s.last.salaryStructureAssignment }),
        expect((a) => [a.employee, a.fromDate, a.state]).toEqual([s.world.secondEmployee, "2026-01-12", "cancelled"]),
      ),
      s.step("Ada lists Cy's assignments again", s.ada.run(listAssignments, { employee: s.world.secondEmployee }), expect((p) => p.items.length).toBe(2)),
      s.step(
        "a cancelled one doesn't hold the day: the first draft can be submitted now",
        s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.items[0].id }),
        assignments.isIn(s.last.salaryStructureAssignment, "submitted"),
      ),
      s.step("Ada drafts Cy's assignment from 2 February", to(s.world.secondEmployee, s.world.salaryStructure, "2026-02-02")),
      s.step("and Olga's from the same day", to(s.world.employee, s.world.salaryStructure, "2026-02-02")),
      s.step("she submits Olga's", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment }), expect((a) => a.employee).toBe(s.world.employee)),
      s.step("Cy's three assignments, the newest a draft", s.ada.run(listAssignments, { employee: s.world.secondEmployee }), expect((p) => p.items.map((i: { fromDate: string; state: string }) => [i.fromDate, i.state])).toEqual([
        ["2026-01-12", "submitted"], ["2026-01-12", "cancelled"], ["2026-02-02", "draft"],
      ])),
      s.step(
        "Olga's day is her own: Cy's for the same day can be submitted",
        s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.items[2].id }),
        expect((a) => a.employee).toBe(s.world.secondEmployee),
        assignments.isIn(s.last.salaryStructureAssignment, "submitted"),
      ),
      s.step(
        "Ada drafts a seniors' structure: Basic at 5,000",
        s.ada.run(createStructure, { company: s.world.company, salaryStructureName: "Seniors", earnings: [{ salaryComponent: s.world.basic, amount: 5_000n * USDC }], deductions: [] } as never),
      ),
      s.step("and submits it", s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure })),
      s.step(
        "she assigns it to Olga from 1 June, a draft",
        to(s.world.employee, s.last.salaryStructure, "2026-06-01"),
        assignments.isIn(s.last.salaryStructureAssignment, "draft"),
      ),
      s.step(
        "it reads back from 1 June",
        s.ada.run(getAssignment, { id: s.last.salaryStructureAssignment }),
        expect((a) => [a.employee, a.fromDate, a.state]).toEqual([s.world.employee, "2026-06-01", "draft"]),
      ),
      s.step(
        "a draft assignment doesn't keep the structure in use: Ada cancels it",
        s.ada.run(cancelStructure, { salaryStructure: s.last.salaryStructure }),
      ),
      s.step("Olga's assignments: the first, February's, then the June draft", s.ada.run(listAssignments, { employee: s.world.employee }), expect((p) => p.items.length).toBe(3)),
      s.step(
        "the draft can't be submitted now, its structure cancelled",
        s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.items[2].id }),
        refuses(AssignedStructureNotSubmitted),
        noEvents(),
        spans({ absent: ["salary-structure-assignment.submit.update"] }),
      ),
      s.step(
        "nor can a new one to that structure be made",
        to(s.world.employee, s.last.items[2].salaryStructure, "2026-07-01"),
        refuses(AssignedStructureNotSubmitted),
        noEvents(),
      ),
      s.step("Ada relieves Cy on 30 November", s.ada.run(relieve, { employee: s.world.secondEmployee, relievingDate: "2026-11-30" })),
      s.step(
        "a leaver can't be assigned a structure",
        to(s.world.secondEmployee, s.world.salaryStructure, "2026-12-01"),
        refuses(AssignedEmployeeHasLeft),
        noEvents(),
        spans({ absent: ["salary-structure-assignment.create.insert"] }),
      ),
      s.step(
        "having left is judged before a day already taken",
        to(s.world.secondEmployee, s.world.salaryStructure, "2026-01-12"),
        refuses(AssignedEmployeeHasLeft),
        noEvents(),
      ),
      s.step("Ada relieves Bo at Acme Logistics", s.ada.run(relieve, { employee: s.world.outsider, relievingDate: "2026-11-30" })),
      s.step(
        "another company's leaver is refused for the company first",
        to(s.world.outsider, s.world.salaryStructure, "2026-12-01"),
        refuses(AssignedEmployeeNotInCompany),
        noEvents(),
      ),
      s.step(
        "Ada drafts a structure for temporary staff: Basic at its own 3,000",
        s.ada.run(createStructure, { company: s.world.company, salaryStructureName: "Temps", earnings: [{ salaryComponent: s.world.basic, amount: 0n }], deductions: [] } as never),
      ),
      s.step("and submits it", s.ada.run(submitStructure, { salaryStructure: s.last.salaryStructure })),
      s.step("she assigns it to Olga from 1 August", to(s.world.employee, s.last.salaryStructure, "2026-08-01")),
      s.step("and submits it", s.ada.run(submitAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step("then cancels it", s.ada.run(cancelAssignment, { salaryStructureAssignment: s.last.salaryStructureAssignment })),
      s.step(
        "a cancelled assignment doesn't keep the structure in use: Ada cancels it",
        s.ada.run(cancelStructure, { salaryStructure: s.last.salaryStructure }),
        structures.isIn(s.last.salaryStructure, "cancelled"),
      ),
    ];
  },
});
