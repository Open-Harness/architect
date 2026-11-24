// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeeGradeCreated } from "../blueprint/things/employee-grade/events.ts";
import { EmployeeGradeNameTaken } from "../blueprint/things/employee-grade/errors.ts";
import createGrade from "../blueprint/things/employee-grade/verbs/create.ts";
import getGrade from "../blueprint/things/employee-grade/verbs/get.ts";

// Names: the longest is 140 letters, a grade name's limit; others carry digits, hyphens and several words.
const long = "L5-B Senior Staff Engineer, Platform & Infrastructure (Payments, Ledger and Payroll Systems), band 3 of 4, reviewed each January since 2027.";

export default Blueprint.journey("grade names are the company's", {
  // Ada runs Acme Trading, which has the grade Senior, and Acme Logistics, which has none.
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
      "Ada adds a grade with the longest name allowed",
      s.ada.run(createGrade, { company: s.world.company, gradeName: long }),
      expect((a) => a.grade).toMatch(/^egr_[0-9a-z]+$/),
      emits(EmployeeGradeCreated, { grade: s.last.grade, company: s.world.company }),
    ),
    s.step(
      "it reads back whole",
      s.ada.run(getGrade, { id: s.last.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.company, long, "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds a third grade",
      s.ada.run(createGrade, { company: s.world.company, gradeName: "Grade-2 Associate Analyst" }),
      expect((a) => a.grade).toMatch(/^egr_[0-9a-z]+$/),
      emits(EmployeeGradeCreated, { grade: s.last.grade, company: s.world.company }),
    ),
    s.step(
      "the third reads back as typed",
      s.ada.run(getGrade, { id: s.last.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.company, "Grade-2 Associate Analyst", "active"]),
      noEvents(),
    ),
    s.step(
      "her first grade is unchanged by the two after it",
      s.ada.run(getGrade, { id: s.world.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.company, "Senior", "active"]),
      noEvents(),
    ),
    s.step(
      "her second company may reuse the first grade's name, because names are unique within a company",
      s.ada.run(createGrade, { company: s.world.otherCompany, gradeName: "Senior" }),
      expect((a) => a.grade).toMatch(/^egr_[0-9a-z]+$/),
      emits(EmployeeGradeCreated, { grade: s.last.grade, company: s.world.otherCompany }),
    ),
    s.step(
      "that grade is the second company's own record",
      s.ada.run(getGrade, { id: s.last.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.otherCompany, "Senior", "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds a grade to her second company under a name the first doesn't use",
      s.ada.run(createGrade, { company: s.world.otherCompany, gradeName: "Band 7 Lead" }),
      expect((a) => a.grade).toMatch(/^egr_[0-9a-z]+$/),
      emits(EmployeeGradeCreated, { grade: s.last.grade, company: s.world.otherCompany }),
    ),
    s.step(
      "it is filed under the second company",
      s.ada.run(getGrade, { id: s.last.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.otherCompany, "Band 7 Lead", "active"]),
      noEvents(),
    ),
    s.step(
      "and the first company's first grade still reads back as before",
      s.ada.run(getGrade, { id: s.world.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.company, "Senior", "active"]),
      noEvents(),
    ),
  ],
});
