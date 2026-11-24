// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. This journey makes one
// grade, and no create comes after it; the name journey reads every record back after its creates.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeeGradeCreated } from "../blueprint/things/employee-grade/events.ts";
import { machine as grades } from "../blueprint/things/employee-grade/machine.ts";
import createGrade from "../blueprint/things/employee-grade/verbs/create.ts";
import getGrade from "../blueprint/things/employee-grade/verbs/get.ts";

export default Blueprint.journey("set up grades", {
  // Ada runs Acme Trading; Bo is signed in and runs nothing of hers.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a company",
  steps: (s) => [
    s.step(
      "Ada adds a grade",
      s.ada.run(createGrade, { company: s.world.company, gradeName: "Junior" }),
      expect((a) => a.grade).toMatch(/^egr_[0-9a-z]+$/),
      emits(EmployeeGradeCreated, { grade: s.last.grade, company: s.world.company }),
      grades.isIn(s.last.grade, "active"),
      spans({ present: ["employee-grade.create", "employee-grade.create.insert"] }),
    ),
    s.step(
      "Bo can't read Ada's grade",
      s.bo.run(getGrade, { id: s.last.grade }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo can't add a grade to Ada's company",
      s.bo.run(createGrade, { company: s.world.company, gradeName: "Lead" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["employee-grade.create", "employee-grade.create.insert"] }),
    ),
    s.step(
      "Ada reads the grade back",
      s.ada.run(getGrade, { id: s.last.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.company, "Junior", "active"]),
      noEvents(),
    ),
  ],
});
