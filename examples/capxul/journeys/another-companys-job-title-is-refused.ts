// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { DesignationNotInCompany } from "../blueprint/things/employee/errors.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import createDesignation from "../blueprint/things/designation/verbs/create.ts";
import hire from "../blueprint/things/employee/verbs/hire.ts";

export default Blueprint.journey("another company's job title is refused", {
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a team",
  steps: (s) => [
    s.step(
      "Bo sets up a company of his own",
      s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Kenya", defaultCurrency: "KES" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "Bo adds a job title to it",
      s.bo.run(createDesignation, { company: s.last.company, designationName: "Clerk" }),
      expect((a) => a.designation).toMatch(/^dsg_[0-9a-z]+$/),
    ),
    s.step(
      "Ada can't give Olga Bo's job title",
      s.ada.run(hire, {
        company: s.world.company,
        person: s.olga.person,
        firstName: "Olga Petrova",
        gender: "Female",
        dateOfBirth: "1994-03-17",
        dateOfJoining: "2026-01-05",
        department: s.world.department,
        designation: s.last.designation,
      }),
      refuses(DesignationNotInCompany),
      noEvents(),
      spans({ present: ["employee.hire", "employee.hire.load"], absent: ["employee.hire.insert"] }),
    ),
  ],
});
