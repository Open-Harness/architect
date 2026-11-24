// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. A journey can hand on only
// the latest answer, so the branchs read back at the end are made by the starting worlds, and this journey's one create
// comes after all of them: a create that changes an earlier record is caught by the reads that follow it.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { BranchCreated } from "../blueprint/things/branch/events.ts";
import { BranchNameTaken } from "../blueprint/things/branch/errors.ts";
import { long, odd } from "../blueprint/values/branches-names.ts";
import getCompany from "../blueprint/things/company/verbs/get.ts";
import createBranch from "../blueprint/things/branch/verbs/create.ts";
import getBranch from "../blueprint/things/branch/verbs/get.ts";

export default Blueprint.journey("branch names are the company's", {
  // Ada runs Acme Trading, with the branchs Nairobi and a 140-letter one, and Acme Logistics, with Nairobi and one more.
  cast: { ada: owner },
  starts: "four branches",
  steps: (s) => [
    s.step(
      "Ada can't add a second branch of the same name",
      s.ada.run(createBranch, { company: s.world.company, branchName: "Nairobi" }),
      refuses(BranchNameTaken, { branchName: "Nairobi" }),
      noEvents(),
    ),
    s.step(
      "nor reuse a name her second company holds there",
      s.ada.run(createBranch, { company: s.world.otherCompany, branchName: odd }),
      refuses(BranchNameTaken, { branchName: odd }),
      noEvents(),
    ),
    s.step(
      "Ada adds a third branch to her first company",
      s.ada.run(createBranch, { company: s.world.company, branchName: "Kisumu-West Site 2" }),
      expect((a) => a.branch).toMatch(/^brn_[0-9a-z]+$/),
      emits(BranchCreated, { branch: s.last.branch, company: s.world.company }),
    ),
    s.step(
      "the third reads back as typed",
      s.ada.run(getBranch, { id: s.last.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, "Kisumu-West Site 2", "active"]),
      noEvents(),
    ),
    s.step(
      "her first company's first branch is unchanged by every create after it",
      s.ada.run(getBranch, { id: s.world.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, "Nairobi", "active"]),
      noEvents(),
    ),
    s.step(
      "the one with the longest name allowed reads back whole",
      s.ada.run(getBranch, { id: s.world.longBranch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, long, "active"]),
      noEvents(),
    ),
    s.step(
      "her second company's branch of the same name as the first is its own record",
      s.ada.run(getBranch, { id: s.world.otherBranch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.otherCompany, "Nairobi", "active"]),
      noEvents(),
    ),
    s.step(
      "her second company's other branch keeps every letter and space she typed",
      s.ada.run(getBranch, { id: s.world.oddBranch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.otherCompany, odd, "active"]),
      noEvents(),
    ),
    s.step(
      "her first company is unchanged by its branchs",
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
