// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { DepartmentNotInCompany } from "../blueprint/things/employee/errors.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import createDepartment from "../blueprint/things/department/verbs/create.ts";
import hire from "../blueprint/things/employee/verbs/hire.ts";

export default Blueprint.journey("another company's department is refused", {
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a team",
  steps: (s) => [
    s.step(
      "Bo sets up a company of his own",
      s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Kenya", defaultCurrency: "KES" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "Bo adds Sales to it",
      s.bo.run(createDepartment, { company: s.last.company, departmentName: "Sales" }),
      expect((a) => a.department).toMatch(/^dep_[0-9a-z]+$/),
    ),
    s.step(
      "Ada can't place Olga in Bo's department",
      s.ada.run(hire, {
        company: s.world.company,
        person: s.olga.person,
        firstName: "Olga",
        gender: "Female",
        dateOfBirth: "1994-03-17",
        dateOfJoining: "2026-01-05",
        department: s.last.department,
        designation: s.world.designation,
      }),
      refuses(DepartmentNotInCompany),
      noEvents(),
      spans({ present: ["employee.hire", "employee.hire.load"], absent: ["employee.hire.insert"] }),
    ),
  ],
});
