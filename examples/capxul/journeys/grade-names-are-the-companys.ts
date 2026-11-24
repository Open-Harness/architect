// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeeGradeCreated } from "../blueprint/things/employee-grade/events.ts";
import { EmployeeGradeNameTaken } from "../blueprint/things/employee-grade/errors.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import createGrade from "../blueprint/things/employee-grade/verbs/create.ts";
import getGrade from "../blueprint/things/employee-grade/verbs/get.ts";

export default Blueprint.journey("grade names are the company's", {
  // Ada runs Acme Trading, which has the grade Senior.
  cast: { ada: owner },
  starts: "a grade",
  steps: (s) => [
    s.step(
      "Ada can't add a second grade of the same name",
      s.ada.run(createGrade, { company: s.world.company, gradeName: "Senior" }),
      refuses(EmployeeGradeNameTaken, { gradeName: "Senior" }),
      noEvents(),
    ),
    s.step(
      "the grade she had is left as it was",
      s.ada.run(getGrade, { id: s.world.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.company, "Senior", "active"]),
      noEvents(),
    ),
    s.step(
      "Ada sets up a second company",
      s.ada.run(createCompany, { companyName: "Acme Logistics", abbr: "AL", country: "Kenya", defaultCurrency: "KES" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "her second company may have a grade of that name too, because names are unique within a company",
      s.ada.run(createGrade, { company: s.last.company, gradeName: "Senior" }),
      expect((a) => a.grade).toMatch(/^egr_[0-9a-z]+$/),
      emits(EmployeeGradeCreated, { grade: s.last.grade }),
    ),
    s.step(
      "that grade is its own record, not the first company's",
      s.ada.run(getGrade, { id: s.last.grade }),
      expect((a) => [a.gradeName, a.state]).toEqual(["Senior", "active"]),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
      noEvents(),
    ),
    s.step(
      "and the first company's grade still reads back as before",
      s.ada.run(getGrade, { id: s.world.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.company, "Senior", "active"]),
      noEvents(),
    ),
  ],
});
