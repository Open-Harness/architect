// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// A separation goes pending → inProcess → completed, moved by the company's owner, or straight from pending to
// completed. One open (pending or inProcess) separation per employee: SeparationAlreadyOpen, the rule's, at commit,
// after SeparatedEmployeeNotInCompany. Completing one doesn't relieve the employee (CX-employee-moves).
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeeSeparationBegun, EmployeeSeparationCompleted, EmployeeSeparationStarted } from "../blueprint/things/employee-separation/events.ts";
import { SeparatedEmployeeNotInCompany, SeparationAlreadyOpen } from "../blueprint/things/employee-separation/errors.ts";
import { machine as separations } from "../blueprint/things/employee-separation/machine.ts";
import create from "../blueprint/things/employee-separation/verbs/create.ts";
import begin from "../blueprint/things/employee-separation/verbs/begin.ts";
import complete from "../blueprint/things/employee-separation/verbs/complete.ts";
import get from "../blueprint/things/employee-separation/verbs/get.ts";
import getEmployee from "../blueprint/things/employee/verbs/get.ts";

export default Blueprint.journey("run a separation", {
  // Olga and Cy are engineers at Acme Trading; Bo drives for Acme Logistics. Ada runs both and has started Olga's
  // separation, from her letter of 20 November, beginning on 1 December.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a separation",
  steps: (s) => [
    s.step(
      "Olga's separation reads back pending, from her letter of 20 November, beginning 1 December",
      s.ada.run(get, { id: s.world.employeeSeparation }),
      expect((a) => [a.company, a.employee, a.resignationLetterDate, a.boardingBeginsOn, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-20",
        "2026-12-01",
        "pending",
      ]),
      noEvents(),
    ),
    s.step("Olga can't read it: only the owner does", s.olga.run(get, { id: s.world.employeeSeparation }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step("nor can Bo", s.bo.run(get, { id: s.world.employeeSeparation }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "Bo can't start a separation in Acme Trading",
      s.bo.run(create, { company: s.world.company, employee: s.world.secondEmployee, resignationLetterDate: "2026-11-23", boardingBeginsOn: "2026-12-02" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["employee-separation.create", "employee-separation.create.insert"] }),
    ),
    s.step(
      "Ada can't start a second for Olga while hers is pending",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, resignationLetterDate: "2026-11-25", boardingBeginsOn: "2026-12-03" }),
      refuses(SeparationAlreadyOpen),
      noEvents(),
    ),
    s.step(
      "Ada can't start one for Bo in Acme Trading, where he doesn't work",
      s.ada.run(create, { company: s.world.company, employee: s.world.outsider, resignationLetterDate: "2026-11-23", boardingBeginsOn: "2026-12-02" }),
      refuses(SeparatedEmployeeNotInCompany),
      noEvents(),
      spans({ absent: ["employee-separation.create.insert"] }),
    ),
    s.step(
      "Olga in Acme Logistics is refused for her company, before her open separation is",
      s.ada.run(create, { company: s.world.otherCompany, employee: s.world.employee, resignationLetterDate: "2026-11-25", boardingBeginsOn: "2026-12-03" }),
      refuses(SeparatedEmployeeNotInCompany),
      noEvents(),
    ),
    s.step("Bo can't mark Olga's in process", s.bo.run(begin, { employeeSeparation: s.world.employeeSeparation }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "Ada marks it in process",
      s.ada.run(begin, { employeeSeparation: s.world.employeeSeparation }),
      expect((a) => a.employeeSeparation).toBe(s.world.employeeSeparation),
      emits(EmployeeSeparationBegun, { employeeSeparation: s.world.employeeSeparation }),
      separations.isIn(s.world.employeeSeparation, "inProcess"),
      spans({ present: ["employee-separation.begin", "employee-separation.begin.update"] }),
    ),
    s.step(
      "Ada can't mark it in process twice",
      s.ada.run(begin, { employeeSeparation: s.world.employeeSeparation }),
      refuses(separations.notFrom, { state: "inProcess" }),
      noEvents(),
    ),
    s.step(
      "nor start a second for Olga while hers is in process",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, resignationLetterDate: "2026-11-25", boardingBeginsOn: "2026-12-03" }),
      refuses(SeparationAlreadyOpen),
      noEvents(),
    ),
    s.step("Bo can't complete it", s.bo.run(complete, { employeeSeparation: s.world.employeeSeparation }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "Ada completes it",
      s.ada.run(complete, { employeeSeparation: s.world.employeeSeparation }),
      expect((a) => a.employeeSeparation).toBe(s.world.employeeSeparation),
      emits(EmployeeSeparationCompleted, { employeeSeparation: s.world.employeeSeparation }),
      separations.isIn(s.world.employeeSeparation, "completed"),
      spans({ present: ["employee-separation.complete", "employee-separation.complete.update"] }),
    ),
    s.step(
      "it reads back completed, as it was started",
      s.ada.run(get, { id: s.world.employeeSeparation }),
      expect((a) => [a.company, a.employee, a.resignationLetterDate, a.boardingBeginsOn, a.state]).toEqual([
        s.world.company,
        s.world.employee,
        "2026-11-20",
        "2026-12-01",
        "completed",
      ]),
      noEvents(),
    ),
    s.step(
      "Olga is still at work: a separation doesn't relieve her",
      s.olga.run(getEmployee, { id: s.world.employee }),
      expect((a) => [a.company, a.department, a.designation, a.state]).toEqual([s.world.company, s.world.department, s.world.designation, "active"]),
      noEvents(),
    ),
    s.step(
      "Ada can't complete it twice",
      s.ada.run(complete, { employeeSeparation: s.world.employeeSeparation }),
      refuses(separations.notFrom, { state: "completed" }),
      noEvents(),
    ),
    s.step(
      "nor mark it in process again",
      s.ada.run(begin, { employeeSeparation: s.world.employeeSeparation }),
      refuses(separations.notFrom, { state: "completed" }),
      noEvents(),
    ),
    s.step(
      "with that one completed, Ada may start a new one for Olga",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, resignationLetterDate: "2026-11-25", boardingBeginsOn: "2026-12-03" }),
      expect((a) => a.employeeSeparation).toMatch(/^esp_[0-9a-z]+$/),
      emits(EmployeeSeparationStarted, { employeeSeparation: s.last.employeeSeparation, employee: s.world.employee }),
      separations.isIn(s.last.employeeSeparation, "pending"),
      spans({ present: ["employee-separation.create", "employee-separation.create.load", "employee-separation.create.insert"] }),
    ),
    s.step(
      "and complete it straight from pending",
      s.ada.run(complete, { employeeSeparation: s.last.employeeSeparation }),
      expect((a) => a.employeeSeparation).toMatch(/^esp_[0-9a-z]+$/),
      emits(EmployeeSeparationCompleted, { employeeSeparation: s.last.employeeSeparation }),
      separations.isIn(s.last.employeeSeparation, "completed"),
    ),
    s.step(
      "the new one reads back completed, with its own days",
      s.ada.run(get, { id: s.last.employeeSeparation }),
      expect((a) => [a.employee, a.resignationLetterDate, a.boardingBeginsOn, a.state]).toEqual([s.world.employee, "2026-11-25", "2026-12-03", "completed"]),
      noEvents(),
    ),
    s.step(
      "Cy's separation is her own: Ada starts it while Olga's are done",
      s.ada.run(create, { company: s.world.company, employee: s.world.secondEmployee, resignationLetterDate: "2026-11-23", boardingBeginsOn: "2026-12-02" }),
      expect((a) => a.employeeSeparation).toMatch(/^esp_[0-9a-z]+$/),
      emits(EmployeeSeparationStarted, { employeeSeparation: s.last.employeeSeparation, employee: s.world.secondEmployee }),
      separations.isIn(s.last.employeeSeparation, "pending"),
    ),
    s.step(
      "and a third for Olga is allowed beside Cy's open one",
      s.ada.run(create, { company: s.world.company, employee: s.world.employee, resignationLetterDate: "2026-11-27", boardingBeginsOn: "2026-12-04" }),
      expect((a) => a.employeeSeparation).toMatch(/^esp_[0-9a-z]+$/),
      separations.isIn(s.last.employeeSeparation, "pending"),
    ),
  ],
});
