// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. A journey can hand on only
// the latest answer, so the grades read back at the end are made by the starting worlds, and this journey's one create
// comes after all of them: a create that changes an earlier record is caught by the reads that follow it.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeeGradeCreated } from "../blueprint/things/employee-grade/events.ts";
import { EmployeeGradeNameTaken } from "../blueprint/things/employee-grade/errors.ts";
import { long, odd } from "../blueprint/values/grades-names.ts";
import getCompany from "../blueprint/things/company/verbs/get.ts";
import createGrade from "../blueprint/things/employee-grade/verbs/create.ts";
import getGrade from "../blueprint/things/employee-grade/verbs/get.ts";

export default Blueprint.journey("grade names are the company's", {
  // Ada runs Acme Trading, with the grades Senior and a 140-letter one, and Acme Logistics, with Senior and one more.
  cast: { ada: owner },
  starts: "four grades",
  steps: (s) => [
    s.step(
      "Ada can't add a second grade of the same name",
      s.ada.run(createGrade, { company: s.world.company, gradeName: "Senior" }),
      refuses(EmployeeGradeNameTaken, { gradeName: "Senior" }),
      noEvents(),
    ),
    s.step(
      "nor reuse a name her second company holds there",
      s.ada.run(createGrade, { company: s.world.otherCompany, gradeName: odd }),
      refuses(EmployeeGradeNameTaken, { gradeName: odd }),
      noEvents(),
    ),
    s.step(
      "Ada adds a third grade to her first company",
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
      "her first company's first grade is unchanged by every create after it",
      s.ada.run(getGrade, { id: s.world.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.company, "Senior", "active"]),
      noEvents(),
    ),
    s.step(
      "the one with the longest name allowed reads back whole",
      s.ada.run(getGrade, { id: s.world.longGrade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.company, long, "active"]),
      noEvents(),
    ),
    s.step(
      "her second company's grade of the same name as the first is its own record",
      s.ada.run(getGrade, { id: s.world.otherGrade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.otherCompany, "Senior", "active"]),
      noEvents(),
    ),
    s.step(
      "her second company's other grade keeps every letter and space she typed",
      s.ada.run(getGrade, { id: s.world.oddGrade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.otherCompany, odd, "active"]),
      noEvents(),
    ),
    s.step(
      "her first company is unchanged by its grades",
      s.ada.run(getCompany, { id: s.world.company }),
      expect((a) => [a.companyName, a.abbr, a.country, a.defaultCurrency, a.owner, a.state]).toEqual([
        "Acme Trading",
        "AT",
        "Kenya",
        "USD",
        s.ada.person,
        "active",
      ]),
      noEvents(),
    ),
    s.step(
      "and so is her second",
      s.ada.run(getCompany, { id: s.world.otherCompany }),
      expect((a) => [a.companyName, a.abbr, a.country, a.defaultCurrency, a.owner, a.state]).toEqual([
        "Acme Logistics",
        "AL",
        "Uganda",
        "UGX",
        s.ada.person,
        "active",
      ]),
      noEvents(),
    ),
  ],
});
