// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. A journey can hand on only
// the latest answer, so the branches read back at the end are made by the starting worlds, and this journey's one create,
// Bo's, comes after all of them: a create that changes any earlier record or company is caught by the reads after it.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { BranchCreated } from "../blueprint/things/branch/events.ts";
import { BranchNameTaken } from "../blueprint/things/branch/errors.ts";
import { digits, long, odd } from "../blueprint/values/branches-names.ts";
import getCompany from "../blueprint/things/company/verbs/get.ts";
import createBranch from "../blueprint/things/branch/verbs/create.ts";
import getBranch from "../blueprint/things/branch/verbs/get.ts";

export default Blueprint.journey("branch names are the company's", {
  // Ada runs Acme Trading, with Nairobi and a 140-letter branch, and Acme Logistics, with Nairobi and one more. Bo runs Bo
  // Ltd, which has none.
  cast: { ada: owner, bo: Blueprint.signedIn },
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
      "Bo can't add a branch to Ada's company",
      s.bo.run(createBranch, { company: s.world.company, branchName: digits }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["branch.create.insert"] }),
    ),
    s.step(
      "Bo adds his company's first branch, named with digits alone",
      s.bo.run(createBranch, { company: s.world.boCompany, branchName: digits }),
      expect((a) => a.branch).toMatch(/^brn_[0-9a-z]+$/),
      emits(BranchCreated, { branch: s.last.branch, company: s.world.boCompany }),
    ),
    s.step(
      "Ada can't read Bo's branch",
      s.ada.run(getBranch, { id: s.last.branch }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo reads it back whole, in his own company",
      s.bo.run(getBranch, { id: s.last.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.boCompany, digits, "active"]),
      noEvents(),
    ),
    s.step(
      "Bo can't read Ada's first branch",
      s.bo.run(getBranch, { id: s.world.branch }),
      refuses(Blueprint.NotAllowed),
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
      "her first company is unchanged by its branches",
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
