// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeeHired } from "../blueprint/things/employee/events.ts";
import { EmployeeAlreadyHired, JoinedBeforeBorn } from "../blueprint/things/employee/errors.ts";
import { machine } from "../blueprint/things/employee/machine.ts";
import hire from "../blueprint/things/employee/verbs/hire.ts";
import get from "../blueprint/things/employee/verbs/get.ts";

export default Blueprint.journey("hire an employee", {
  // Ada runs Acme Trading; Olga is about to join it; Bo is signed in and works for nobody here.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a team",
  steps: (s) => [
    s.step(
      "Ada hires Olga as an engineer in Engineering",
      s.ada.run(hire, {
        company: s.world.company,
        person: s.olga.person,
        firstName: "Olga",
        gender: "Female",
        dateOfBirth: "1994-03-17",
        dateOfJoining: "2026-01-05",
        department: s.world.department,
        designation: s.world.designation,
      }),
      expect((a) => a.employee).toMatch(/^emp_[0-9a-z]+$/),
      emits(EmployeeHired, { employee: s.last.employee, company: s.world.company, person: s.olga.person }),
      machine.isIn(s.last.employee, "active"),
      spans({ present: ["employee.hire", "employee.hire.load", "employee.hire.insert"] }),
    ),
    s.step(
      "Bo can't read Olga's record",
      s.bo.run(get, { id: s.last.employee }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada can't hire Olga again while she works there",
      s.ada.run(hire, {
        company: s.world.company,
        person: s.olga.person,
        firstName: "Olga",
        gender: "Female",
        dateOfBirth: "1994-03-17",
        dateOfJoining: "2026-02-01",
        department: s.world.department,
        designation: s.world.designation,
      }),
      refuses(EmployeeAlreadyHired, { person: s.olga.person }),
      noEvents(),
    ),
    s.step(
      "Bo can't hire anyone into Ada's company",
      s.bo.run(hire, {
        company: s.world.company,
        person: s.bo.person,
        firstName: "Bo",
        gender: "Male",
        dateOfBirth: "1990-06-01",
        dateOfJoining: "2026-01-05",
        department: s.world.department,
        designation: s.world.designation,
      }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["employee.hire", "employee.hire.insert"] }),
    ),
    s.step(
      "Ada can't hire Bo with a joining day before his birthday",
      s.ada.run(hire, {
        company: s.world.company,
        person: s.bo.person,
        firstName: "Bo",
        gender: "Male",
        dateOfBirth: "1990-06-01",
        dateOfJoining: "1990-05-31",
        department: s.world.department,
        designation: s.world.designation,
      }),
      refuses(JoinedBeforeBorn, { dateOfBirth: "1990-06-01" }),
      noEvents(),
      spans({ absent: ["employee.hire.insert"] }),
    ),
    s.step(
      "Olga reads her own record, with every field Ada typed",
      s.olga.run(get, { id: s.last.employee }),
      expect((a) => [
        a.company,
        a.person,
        a.firstName,
        a.gender,
        a.dateOfBirth,
        a.dateOfJoining,
        a.department,
        a.designation,
        a.state,
      ]).toEqual([
        s.world.company,
        s.olga.person,
        "Olga",
        "Female",
        "1994-03-17",
        "2026-01-05",
        s.world.department,
        s.world.designation,
        "active",
      ]),
      noEvents(),
    ),
  ],
});
