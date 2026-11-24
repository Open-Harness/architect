// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. A journey can hand on only
// the latest answer, so the grades read back at the end are made by the starting worlds, and this journey's one create,
// Bo's, comes after all of them: a create that changes any earlier record or company is caught by the reads after it.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { EmployeeGradeCreated } from "../blueprint/things/employee-grade/events.ts";
import { EmployeeGradeNameTaken } from "../blueprint/things/employee-grade/errors.ts";
import { digits, long, odd } from "../blueprint/values/grades-names.ts";
import getCompany from "../blueprint/things/company/verbs/get.ts";
import createGrade from "../blueprint/things/employee-grade/verbs/create.ts";
import getGrade from "../blueprint/things/employee-grade/verbs/get.ts";

export default Blueprint.journey("grade names are the company's", {
  // Ada runs Acme Trading, with Senior and a 140-letter grade, and Acme Logistics, with Senior and one more. Bo runs Bo
  // Ltd, which has none.
  cast: { ada: owner, bo: Blueprint.signedIn },
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
      "Bo can't add a grade to Ada's company",
      s.bo.run(createGrade, { company: s.world.company, gradeName: digits }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["employee-grade.create.insert"] }),
    ),
    s.step(
      "Bo adds his company's first grade, named with digits alone",
      s.bo.run(createGrade, { company: s.world.boCompany, gradeName: digits }),
      expect((a) => a.grade).toMatch(/^egr_[0-9a-z]+$/),
      emits(EmployeeGradeCreated, { grade: s.last.grade, company: s.world.boCompany }),
    ),
    s.step(
      "Ada can't read Bo's grade",
      s.ada.run(getGrade, { id: s.last.grade }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo reads it back whole, in his own company",
      s.bo.run(getGrade, { id: s.last.grade }),
      expect((a) => [a.company, a.gradeName, a.state]).toEqual([s.world.boCompany, digits, "active"]),
      noEvents(),
    ),
    s.step(
      "Bo can't read Ada's first grade",
      s.bo.run(getGrade, { id: s.world.grade }),
      refuses(Blueprint.NotAllowed),
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
    s.step(
      "and Bo's",
      s.bo.run(getCompany, { id: s.world.boCompany }),
      expect((a) => [a.companyName, a.abbr, a.country, a.defaultCurrency, a.owner, a.state]).toEqual([
        "Bo Ltd",
        "BL",
        "Tanzania",
        "TZS",
        s.bo.person,
        "active",
      ]),
      noEvents(),
    ),
  ],
});
