// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// The world's clock starts at Tuesday 1 December 2026, 09:00 UTC (environments/local.ts). A transfer is submitted on or
// after its day, by the clock's day in UTC (HRMS's `before_submit`). Refusal order on create (employee-transfer/errors.ts):
// TransferredEmployeeNotInCompany, TransferredEmployeeHasLeft, NewDepartmentNotInCompany, DepartmentUnchanged.
// Cancelling puts back the department the transfer replaced. A transfer stays in its company (CX-employee-moves).
// One prove run shares one clock that never goes back, and journeys run in file-name order: this one's days (8
// December) come after promote-an-employee's (7 December), which runs before it. A clock step keeps within seven days
// of the journey's start, since the cast's sessions last seven days.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeeTransferCancelled, EmployeeTransferDrafted, EmployeeTransferred } from "../blueprint/things/employee-transfer/events.ts";
import {
  DepartmentUnchanged,
  NewDepartmentNotInCompany,
  TransferNotYetDue,
  TransferredEmployeeHasLeft,
  TransferredEmployeeNotInCompany,
} from "../blueprint/things/employee-transfer/errors.ts";
import { machine as transfers } from "../blueprint/things/employee-transfer/machine.ts";
import create from "../blueprint/things/employee-transfer/verbs/create.ts";
import submit from "../blueprint/things/employee-transfer/verbs/submit.ts";
import cancel from "../blueprint/things/employee-transfer/verbs/cancel.ts";
import get from "../blueprint/things/employee-transfer/verbs/get.ts";
import getEmployee from "../blueprint/things/employee/verbs/get.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";

export default Blueprint.journey("transfer an employee", {
  // Olga and Cy are engineers in Acme Trading's Engineering; Acme Trading also has Platform. Bo drives in Acme
  // Logistics' Logistics. Ada runs both companies and has drafted Olga's transfer to Platform from Tuesday 8 December,
  // and Cy's from Tuesday 1 December.
  cast: { ada: owner, olga: Blueprint.signedIn, cy: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a second transfer",
  steps: (s) => [
    s.step(
      "Olga's transfer reads back a draft, from Engineering to Platform, from 8 December",
      s.ada.run(get, { id: s.world.employeeTransfer }),
      expect((a) => [a.company, a.employee, a.transferDate, a.currentDepartment, a.newDepartment, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-12-08",
        s.world.department,
        s.world.secondDepartment,
        "draft",
      ]),
      noEvents(),
    ),
    s.step(
      "Olga reads her own",
      s.olga.run(get, { id: s.world.employeeTransfer }),
      expect((a) => [a.employee, a.currentDepartment, a.newDepartment, a.state]).toEqual([s.world.employee, s.world.department, s.world.secondDepartment, "draft"]),
      noEvents(),
    ),
    s.step("Cy can't read Olga's", s.cy.run(get, { id: s.world.employeeTransfer }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("nor can Bo", s.bo.run(get, { id: s.world.employeeTransfer }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "Bo can't draft a transfer in Acme Trading",
      s.bo.run(create, { company: s.world.company, employee: s.world.secondEmployee, transferDate: "2026-12-01", newDepartment: s.world.secondDepartment }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["employee-transfer.create", "employee-transfer.create.insert"] }),
    ),
    s.step(
      "Ada can't submit Olga's before its day",
      s.ada.run(submit, { employeeTransfer: s.world.employeeTransfer }),
      refuses(TransferNotYetDue, { transferDate: "2026-12-08" }),
      noEvents(),
      spans({ absent: ["employee-transfer.submit.update"] }),
    ),
    s.step("Bo can't submit it", s.bo.run(submit, { employeeTransfer: s.world.employeeTransfer }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("nor can Olga submit her own", s.olga.run(submit, { employeeTransfer: s.world.employeeTransfer }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "Ada can't cancel it while it is a draft",
      s.ada.run(cancel, { employeeTransfer: s.world.employeeTransfer }),
      refuses(transfers.notFrom, { state: "draft" }),
      noEvents(),
    ),
    s.step(
      "the clock reaches a second before midnight on the eve of its day",
      s.clock.moveTo("2026-12-07T23:59:59Z"),
      expect((a) => a.now).toBe("2026-12-07T23:59:59.000Z"),
    ),
    s.step(
      "Ada still can't submit it",
      s.ada.run(submit, { employeeTransfer: s.world.employeeTransfer }),
      refuses(TransferNotYetDue, { transferDate: "2026-12-08" }),
      noEvents(),
    ),
    s.step("Olga still reads back in Engineering", s.olga.run(getEmployee, { id: s.world.employee }), expect((a) => a.department).toBe(s.world.department), noEvents()),
    s.step(
      "the clock reaches midnight on its day",
      s.clock.moveTo("2026-12-08T00:00:00Z"),
      expect((a) => a.now).toBe("2026-12-08T00:00:00.000Z"),
    ),
    s.step(
      "Ada submits it on the day itself",
      s.ada.run(submit, { employeeTransfer: s.world.employeeTransfer }),
      expect((a) => [a.employeeTransfer, a.employee, a.department]).toEqual([s.world.employeeTransfer, s.world.employee, s.world.secondDepartment]),
      emits(EmployeeTransferred, { employeeTransfer: s.world.employeeTransfer, employee: s.world.employee, department: s.world.secondDepartment }),
      transfers.isIn(s.world.employeeTransfer, "submitted"),
      spans({ present: ["employee-transfer.submit", "employee-transfer.submit.update"] }),
    ),
    s.step(
      "Olga reads herself back in Platform, still an engineer at Acme Trading",
      s.olga.run(getEmployee, { id: s.world.employee }),
      expect((a) => [a.company, a.department, a.designation, a.state]).toEqual([s.world.company, s.world.secondDepartment, s.world.designation, "active"]),
      noEvents(),
    ),
    s.step("Ada can't submit it twice", s.ada.run(submit, { employeeTransfer: s.world.employeeTransfer }), refuses(transfers.notFrom, { state: "submitted" }), noEvents()),
    s.step(
      "Ada can't draft Olga's transfer to Platform again, where she now works",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, transferDate: "2026-12-21", newDepartment: s.world.secondDepartment }),
      refuses(DepartmentUnchanged),
      noEvents(),
      spans({ absent: ["employee-transfer.create.insert"] }),
    ),
    s.step(
      "but she may draft one back to Engineering",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, transferDate: "2026-12-21", newDepartment: s.world.department }),
      expect((a) => a.employeeTransfer).toMatch(/^etr_[0-9a-z]+$/),
      emits(EmployeeTransferDrafted, { employeeTransfer: s.last.employeeTransfer, employee: s.world.employee }),
      transfers.isIn(s.last.employeeTransfer, "draft"),
      spans({ present: ["employee-transfer.create", "employee-transfer.create.load", "employee-transfer.create.insert"] }),
    ),
    s.step(
      "it copied the department she works in now, Platform",
      s.ada.run(get, { id: s.last.employeeTransfer }),
      expect((a) => [a.company, a.employee, a.transferDate, a.currentDepartment, a.newDepartment, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-12-21",
        s.world.secondDepartment,
        s.world.department,
        "draft",
      ]),
      noEvents(),
    ),
    s.step(
      "beside that draft, Ada may draft another back to Engineering from 2 December, a day already past",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, transferDate: "2026-12-02", newDepartment: s.world.department }),
      expect((a) => a.employeeTransfer).toMatch(/^etr_[0-9a-z]+$/),
      emits(EmployeeTransferDrafted, { employeeTransfer: s.last.employeeTransfer, employee: s.world.employee }),
      transfers.isIn(s.last.employeeTransfer, "draft"),
    ),
    s.step(
      "and submit it at once, as its day has come",
      s.ada.run(submit, { employeeTransfer: s.last.employeeTransfer }),
      expect((a) => [a.employee, a.department]).toEqual([s.world.employee, s.world.department]),
      emits(EmployeeTransferred, { employeeTransfer: s.last.employeeTransfer, employee: s.world.employee, department: s.world.department }),
      transfers.isIn(s.last.employeeTransfer, "submitted"),
    ),
    s.step(
      "Olga reads her department back as Engineering again",
      s.olga.run(getEmployee, { id: s.world.employee }),
      expect((a) => a.department).toBe(s.world.department),
      noEvents(),
    ),
    s.step("Bo can't cancel Olga's first", s.bo.run(cancel, { employeeTransfer: s.world.employeeTransfer }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("nor can Olga", s.olga.run(cancel, { employeeTransfer: s.world.employeeTransfer }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("nor Cy", s.cy.run(cancel, { employeeTransfer: s.world.employeeTransfer }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "Ada cancels it, putting back Engineering",
      s.ada.run(cancel, { employeeTransfer: s.world.employeeTransfer }),
      expect((a) => [a.employeeTransfer, a.employee, a.department]).toEqual([s.world.employeeTransfer, s.world.employee, s.world.department]),
      emits(EmployeeTransferCancelled, { employeeTransfer: s.world.employeeTransfer, employee: s.world.employee, department: s.world.department }),
      transfers.isIn(s.world.employeeTransfer, "cancelled"),
      spans({ present: ["employee-transfer.cancel", "employee-transfer.cancel.update"] }),
    ),
    s.step(
      "Olga reads herself back in Engineering again, still an engineer",
      s.olga.run(getEmployee, { id: s.world.employee }),
      expect((a) => [a.company, a.department, a.designation, a.state]).toEqual([s.world.company, s.world.department, s.world.designation, "active"]),
      noEvents(),
    ),
    s.step(
      "the transfer reads back cancelled, its departments kept",
      s.ada.run(get, { id: s.world.employeeTransfer }),
      expect((a) => [a.currentDepartment, a.newDepartment, a.state]).toEqual([s.world.department, s.world.secondDepartment, "cancelled"]),
      noEvents(),
    ),
    s.step("Ada can't cancel it twice", s.ada.run(cancel, { employeeTransfer: s.world.employeeTransfer }), refuses(transfers.notFrom, { state: "cancelled" }), noEvents()),
    s.step("nor submit it again", s.ada.run(submit, { employeeTransfer: s.world.employeeTransfer }), refuses(transfers.notFrom, { state: "cancelled" }), noEvents()),
    s.step(
      "Ada can't draft Olga's transfer to Engineering, where she works",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, transferDate: "2026-12-21", newDepartment: s.world.department }),
      refuses(DepartmentUnchanged),
      noEvents(),
    ),
    s.step(
      "Ada can't move Olga into Acme Logistics' Logistics: a transfer stays in its company",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, transferDate: "2026-12-21", newDepartment: s.world.otherDepartment }),
      refuses(NewDepartmentNotInCompany),
      noEvents(),
      spans({ absent: ["employee-transfer.create.insert"] }),
    ),
    s.step(
      "Ada can't transfer Bo in Acme Trading, where he doesn't work",
      s.ada.run(create, { company: s.world.company, employee: s.world.outsider, transferDate: "2026-12-21", newDepartment: s.world.secondDepartment }),
      refuses(TransferredEmployeeNotInCompany),
      noEvents(),
      spans({ absent: ["employee-transfer.create.insert"] }),
    ),
    s.step(
      "nor send Bo, at Acme Logistics, to Acme Trading's Platform",
      s.ada.run(create, { company: s.world.otherCompany, employee: s.world.outsider, transferDate: "2026-12-21", newDepartment: s.world.secondDepartment }),
      refuses(NewDepartmentNotInCompany),
      noEvents(),
    ),
    s.step(
      "Olga in Acme Logistics is refused for the employee's company, which is judged before the department's",
      s.ada.run(create, { company: s.world.otherCompany, employee: s.world.employee, transferDate: "2026-12-21", newDepartment: s.world.secondDepartment }),
      refuses(TransferredEmployeeNotInCompany),
      noEvents(),
    ),
    s.step(
      "Ada relieves Bo on 30 November",
      s.ada.run(relieve, { employee: s.world.outsider, relievingDate: "2026-11-30" }),
      expect((a) => a.employee).toBe(s.world.outsider),
    ),
    s.step(
      "Ada can't transfer Bo now he has left, which is judged before the department's company",
      s.ada.run(create, { company: s.world.otherCompany, employee: s.world.outsider, transferDate: "2026-12-21", newDepartment: s.world.secondDepartment }),
      refuses(TransferredEmployeeHasLeft),
      noEvents(),
      spans({ absent: ["employee-transfer.create.insert"] }),
    ),
    s.step(
      "in Acme Trading he is refused for the company first",
      s.ada.run(create, { company: s.world.company, employee: s.world.outsider, transferDate: "2026-12-21", newDepartment: s.world.secondDepartment }),
      refuses(TransferredEmployeeNotInCompany),
      noEvents(),
    ),
    s.step(
      "Ada relieves Cy on 30 November",
      s.ada.run(relieve, { employee: s.world.secondEmployee, relievingDate: "2026-11-30" }),
      expect((a) => a.employee).toBe(s.world.secondEmployee),
    ),
    s.step(
      "Ada still submits Cy's transfer, drafted before she left",
      s.ada.run(submit, { employeeTransfer: s.world.secondTransfer }),
      expect((a) => [a.employeeTransfer, a.employee, a.department]).toEqual([s.world.secondTransfer, s.world.secondEmployee, s.world.secondDepartment]),
      emits(EmployeeTransferred, { employeeTransfer: s.world.secondTransfer, employee: s.world.secondEmployee, department: s.world.secondDepartment }),
      transfers.isIn(s.world.secondTransfer, "submitted"),
    ),
    s.step(
      "Cy reads herself back in Platform, an engineer who has left",
      s.cy.run(getEmployee, { id: s.world.secondEmployee }),
      expect((a) => [a.department, a.designation, a.state]).toEqual([s.world.secondDepartment, s.world.designation, "left"]),
      noEvents(),
    ),
    s.step(
      "Ada can't draft a new one for Cy now she has left, which is judged before the department she works in",
      s.ada.run(create, { company: s.world.company, employee: s.world.secondEmployee, transferDate: "2026-12-21", newDepartment: s.world.secondDepartment }),
      refuses(TransferredEmployeeHasLeft),
      noEvents(),
    ),
    s.step(
      "Ada still cancels Cy's, drafted before she left, putting back Engineering",
      s.ada.run(cancel, { employeeTransfer: s.world.secondTransfer }),
      expect((a) => [a.employeeTransfer, a.employee, a.department]).toEqual([s.world.secondTransfer, s.world.secondEmployee, s.world.department]),
      emits(EmployeeTransferCancelled, { employeeTransfer: s.world.secondTransfer, employee: s.world.secondEmployee, department: s.world.department }),
      transfers.isIn(s.world.secondTransfer, "cancelled"),
    ),
    s.step(
      "Cy reads her department back as Engineering, and has still left",
      s.cy.run(getEmployee, { id: s.world.secondEmployee }),
      expect((a) => [a.department, a.state]).toEqual([s.world.department, "left"]),
      noEvents(),
    ),
  ],
});
