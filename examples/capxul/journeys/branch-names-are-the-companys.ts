// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { BranchCreated } from "../blueprint/things/branch/events.ts";
import { BranchNameTaken } from "../blueprint/things/branch/errors.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import createBranch from "../blueprint/things/branch/verbs/create.ts";
import getBranch from "../blueprint/things/branch/verbs/get.ts";

export default Blueprint.journey("branch names are the company's", {
  // Ada runs Acme Trading, which has the branch Nairobi.
  cast: { ada: owner },
  starts: "a branch",
  steps: (s) => [
    s.step(
      "Ada can't add a second branch of the same name",
      s.ada.run(createBranch, { company: s.world.company, branchName: "Nairobi" }),
      refuses(BranchNameTaken, { branchName: "Nairobi" }),
      noEvents(),
    ),
    s.step(
      "the branch she had is left as it was",
      s.ada.run(getBranch, { id: s.world.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, "Nairobi", "active"]),
      noEvents(),
    ),
    s.step(
      "Ada sets up a second company",
      s.ada.run(createCompany, { companyName: "Acme Logistics", abbr: "AL", country: "Kenya", defaultCurrency: "KES" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "her second company may have a branch of that name too, because names are unique within a company",
      s.ada.run(createBranch, { company: s.last.company, branchName: "Nairobi" }),
      expect((a) => a.branch).toMatch(/^brn_[0-9a-z]+$/),
      emits(BranchCreated, { branch: s.last.branch }),
    ),
    s.step(
      "that branch is its own record, not the first company's",
      s.ada.run(getBranch, { id: s.last.branch }),
      expect((a) => [a.branchName, a.state]).toEqual(["Nairobi", "active"]),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
      noEvents(),
    ),
    s.step(
      "and the first company's branch still reads back as before",
      s.ada.run(getBranch, { id: s.world.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, "Nairobi", "active"]),
      noEvents(),
    ),
  ],
});
