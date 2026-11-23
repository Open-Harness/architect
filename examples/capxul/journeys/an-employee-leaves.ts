// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeeHired, EmployeeRelieved } from "../blueprint/things/employee/events.ts";
import { RelievedBeforeJoined } from "../blueprint/things/employee/errors.ts";
import { machine } from "../blueprint/things/employee/machine.ts";
import hire from "../blueprint/things/employee/verbs/hire.ts";
import relieve from "../blueprint/things/employee/verbs/relieve.ts";
import get from "../blueprint/things/employee/verbs/get.ts";

export default Blueprint.journey("an employee leaves", {
  // Olga joined Acme Trading on 5 January 2026.
  cast: { ada: owner, olga: Blueprint.signedIn },
  starts: "an employee",
  steps: (s) => [
    s.step(
      "Olga can't relieve herself",
      s.olga.run(relieve, { employee: s.world.employee, relievingDate: "2026-11-30" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      machine.isIn(s.world.employee, "active"),
      spans({ absent: ["employee.relieve", "employee.relieve.update"] }),
    ),
    s.step(
      "Ada can't relieve her the day before she joined",
      s.ada.run(relieve, { employee: s.world.employee, relievingDate: "2026-01-04" }),
      refuses(RelievedBeforeJoined, { dateOfJoining: "2026-01-05" }),
      noEvents(),
      machine.isIn(s.world.employee, "active"),
      spans({ absent: ["employee.relieve.update"] }),
    ),
    s.step(
      "Ada relieves her on 30 November",
      s.ada.run(relieve, { employee: s.world.employee, relievingDate: "2026-11-30" }),
      expect((a) => [a.employee, a.relievingDate]).toEqual([s.world.employee, "2026-11-30"]),
      emits(EmployeeRelieved, { employee: s.world.employee, relievingDate: "2026-11-30" }),
      machine.isIn(s.world.employee, "left"),
      spans({ present: ["employee.relieve", "employee.relieve.load", "employee.relieve.update"] }),
    ),
    s.step(
      "she can't be relieved twice",
      s.ada.run(relieve, { employee: s.world.employee, relievingDate: "2026-12-01" }),
      refuses(machine.notFrom, { state: "left" }),
      noEvents(),
      spans({ absent: ["employee.relieve.update"] }),
    ),
    s.step(
      "Olga still reads her old record, which shows she has left",
      s.olga.run(get, { id: s.world.employee }),
      expect((a) => [a.dateOfJoining, a.state]).toEqual(["2026-01-05", "left"]),
      noEvents(),
    ),
    s.step(
      "Ada may hire her again, as a new employee",
      s.ada.run(hire, {
        company: s.world.company,
        person: s.olga.person,
        firstName: "Olga Petrova",
        gender: "Female",
        dateOfBirth: "1994-03-17",
        dateOfJoining: "2027-02-01",
        department: s.world.department,
        designation: s.world.designation,
      }),
      expect((a) => a.employee).toMatch(/^emp_[0-9a-z]+$/),
      emits(EmployeeHired, { employee: s.last.employee, person: s.olga.person }),
      machine.isIn(s.last.employee, "active"),
      machine.isIn(s.world.employee, "left"),
    ),
  ],
});
