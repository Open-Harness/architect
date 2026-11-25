// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. A read's answer carries no
// id, so the employee is the world's `newHire`, hired by `employee.hire` in the world "a new hire".
// End to end: hired, promoted, transferred, separated, then relieved, the employee read back after each step.
// Every promotion and transfer day here is due when the suite starts (Tuesday 1 December 2026), so this journey never
// moves the clock:
// one prove run shares one clock that never goes back, and journeys run in file-name order (CX-employee-moves).
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeePromoted, EmployeePromotionDrafted } from "../blueprint/things/employee-promotion/events.ts";
import { EmployeeTransferDrafted, EmployeeTransferred } from "../blueprint/things/employee-transfer/events.ts";
import { EmployeeSeparationBegun, EmployeeSeparationCompleted, EmployeeSeparationStarted } from "../blueprint/things/employee-separation/events.ts";
import { EmployeeRelieved } from "../blueprint/things/employee/events.ts";
import { machine as employees } from "../blueprint/things/employee/machine.ts";
import { machine as promotions } from "../blueprint/things/employee-promotion/machine.ts";
import { machine as transfers } from "../blueprint/things/employee-transfer/machine.ts";
import { machine as separations } from "../blueprint/things/employee-separation/machine.ts";
import promote from "../blueprint/things/employee-promotion/verbs/create.ts";
import submitPromotion from "../blueprint/things/employee-promotion/verbs/submit.ts";
import transfer from "../blueprint/things/employee-transfer/verbs/create.ts";
import submitTransfer from "../blueprint/things/employee-transfer/verbs/submit.ts";
import separate from "../blueprint/things/employee-separation/verbs/create.ts";
import begin from "../blueprint/things/employee-separation/verbs/begin.ts";
import complete from "../blueprint/things/employee-separation/verbs/complete.ts";
import getSeparation from "../blueprint/things/employee-separation/verbs/get.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";
import getEmployee from "../blueprint/things/employee/verbs/get.ts";

export default Blueprint.journey("move an employee through the company", {
  // Ada hired Dee as an engineer in Engineering at Acme Trading, joining 2 February 2026. Acme Trading also has the
  // job title Lead Engineer and the department Platform.
  cast: { ada: owner, dee: Blueprint.signedIn },
  starts: "a new hire",
  steps: (s) => [
    s.step(
      "Dee reads herself back hired, an engineer in Engineering",
      s.dee.run(getEmployee, { id: s.world.newHire }),
      expect((a) => [a.company, a.person, a.dateOfJoining, a.department, a.designation, a.state]).toEqual([
        s.world.company,
        s.dee.person,
        "2026-02-02",
        s.world.department,
        s.world.designation,
        "active",
      ]),
      noEvents(),
    ),
    s.step(
      "Ada drafts Dee's promotion to Lead Engineer, from 1 December",
      s.ada.run(promote, { company: s.world.company, employee: s.world.newHire, promotionDate: "2026-12-01", newDesignation: s.world.otherDesignation }),
      expect((a) => a.employeePromotion).toMatch(/^epr_[0-9a-z]+$/),
      emits(EmployeePromotionDrafted, { employeePromotion: s.last.employeePromotion, employee: s.world.newHire }),
      promotions.isIn(s.last.employeePromotion, "draft"),
    ),
    s.step(
      "and submits it",
      s.ada.run(submitPromotion, { employeePromotion: s.last.employeePromotion }),
      expect((a) => [a.employee, a.designation]).toEqual([s.world.newHire, s.world.otherDesignation]),
      emits(EmployeePromoted, { employeePromotion: s.last.employeePromotion, employee: s.world.newHire, designation: s.world.otherDesignation }),
      promotions.isIn(s.last.employeePromotion, "submitted"),
    ),
    s.step(
      "Dee reads herself back a lead engineer, still in Engineering",
      s.dee.run(getEmployee, { id: s.world.newHire }),
      expect((a) => [a.company, a.department, a.designation, a.state]).toEqual([s.world.company, s.world.department, s.world.otherDesignation, "active"]),
      noEvents(),
    ),
    s.step(
      "Ada drafts Dee's transfer to Platform, from 1 December too",
      s.ada.run(transfer, { company: s.world.company, employee: s.world.newHire, transferDate: "2026-12-01", newDepartment: s.world.secondDepartment }),
      expect((a) => a.employeeTransfer).toMatch(/^etr_[0-9a-z]+$/),
      emits(EmployeeTransferDrafted, { employeeTransfer: s.last.employeeTransfer, employee: s.world.newHire }),
      transfers.isIn(s.last.employeeTransfer, "draft"),
    ),
    s.step(
      "Ada submits Dee's transfer",
      s.ada.run(submitTransfer, { employeeTransfer: s.last.employeeTransfer }),
      expect((a) => [a.employee, a.department]).toEqual([s.world.newHire, s.world.secondDepartment]),
      emits(EmployeeTransferred, { employeeTransfer: s.last.employeeTransfer, employee: s.world.newHire, department: s.world.secondDepartment }),
      transfers.isIn(s.last.employeeTransfer, "submitted"),
    ),
    s.step(
      "Dee reads herself back a lead engineer in Platform",
      s.dee.run(getEmployee, { id: s.world.newHire }),
      expect((a) => [a.company, a.department, a.designation, a.state]).toEqual([s.world.company, s.world.secondDepartment, s.world.otherDesignation, "active"]),
      noEvents(),
    ),
    s.step(
      "Dee resigns: Ada starts her separation, from her letter of 30 November, beginning 14 December",
      s.ada.run(separate, { company: s.world.company, employee: s.world.newHire, resignationLetterDate: "2026-11-30", boardingBeginsOn: "2026-12-14" }),
      expect((a) => a.employeeSeparation).toMatch(/^esp_[0-9a-z]+$/),
      emits(EmployeeSeparationStarted, { employeeSeparation: s.last.employeeSeparation, employee: s.world.newHire }),
      separations.isIn(s.last.employeeSeparation, "pending"),
    ),
    s.step(
      "Ada marks it in process",
      s.ada.run(begin, { employeeSeparation: s.last.employeeSeparation }),
      expect((a) => a.employeeSeparation).toMatch(/^esp_[0-9a-z]+$/),
      emits(EmployeeSeparationBegun, { employeeSeparation: s.last.employeeSeparation }),
      separations.isIn(s.last.employeeSeparation, "inProcess"),
    ),
    s.step(
      "and completes it",
      s.ada.run(complete, { employeeSeparation: s.last.employeeSeparation }),
      expect((a) => a.employeeSeparation).toMatch(/^esp_[0-9a-z]+$/),
      emits(EmployeeSeparationCompleted, { employeeSeparation: s.last.employeeSeparation }),
      separations.isIn(s.last.employeeSeparation, "completed"),
    ),
    s.step(
      "the separation reads back completed, Dee's",
      s.ada.run(getSeparation, { id: s.last.employeeSeparation }),
      expect((a) => [a.company, a.employee, a.resignationLetterDate, a.boardingBeginsOn, a.state]).toEqual([
        s.world.company,
        s.world.newHire,
        "2026-11-30",
        "2026-12-14",
        "completed",
      ]),
      noEvents(),
    ),
    s.step(
      "Dee is still at work: the separation didn't relieve her",
      s.dee.run(getEmployee, { id: s.world.newHire }),
      expect((a) => [a.department, a.designation, a.state]).toEqual([s.world.secondDepartment, s.world.otherDesignation, "active"]),
      noEvents(),
    ),
    s.step(
      "Ada relieves Dee on 31 December",
      s.ada.run(relieve, { employee: s.world.newHire, relievingDate: "2026-12-31" }),
      expect((a) => [a.employee, a.relievingDate]).toEqual([s.world.newHire, "2026-12-31"]),
      emits(EmployeeRelieved, { employee: s.world.newHire, relievingDate: "2026-12-31" }),
      employees.isIn(s.world.newHire, "left"),
    ),
    s.step(
      "Dee reads herself back a lead engineer in Platform who has left",
      s.dee.run(getEmployee, { id: s.world.newHire }),
      expect((a) => [a.company, a.department, a.designation, a.state]).toEqual([s.world.company, s.world.secondDepartment, s.world.otherDesignation, "left"]),
      noEvents(),
    ),
  ],
});
