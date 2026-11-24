// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { BranchCreated } from "../blueprint/things/branch/events.ts";
import { BranchNameTaken } from "../blueprint/things/branch/errors.ts";
import createBranch from "../blueprint/things/branch/verbs/create.ts";
import getBranch from "../blueprint/things/branch/verbs/get.ts";

// Names: the longest is 140 letters, a branch name's limit; others carry digits, hyphens and several words.
const long = "Mombasa Port, Shed 14 - Cold-Store & Bonded Warehouse (Kilindini Harbour, Gate 2), serving the Coast, Lamu and Tana River counties from 2019";

export default Blueprint.journey("branch names are the company's", {
  // Ada runs Acme Trading, which has the branch Nairobi, and Acme Logistics, which has none.
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
      "Ada adds a branch with the longest name allowed",
      s.ada.run(createBranch, { company: s.world.company, branchName: long }),
      expect((a) => a.branch).toMatch(/^brn_[0-9a-z]+$/),
      emits(BranchCreated, { branch: s.last.branch, company: s.world.company }),
    ),
    s.step(
      "it reads back whole",
      s.ada.run(getBranch, { id: s.last.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, long, "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds a third branch",
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
      "her first branch is unchanged by the two after it",
      s.ada.run(getBranch, { id: s.world.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, "Nairobi", "active"]),
      noEvents(),
    ),
    s.step(
      "her second company may reuse the first branch's name, because names are unique within a company",
      s.ada.run(createBranch, { company: s.world.otherCompany, branchName: "Nairobi" }),
      expect((a) => a.branch).toMatch(/^brn_[0-9a-z]+$/),
      emits(BranchCreated, { branch: s.last.branch, company: s.world.otherCompany }),
    ),
    s.step(
      "that branch is the second company's own record",
      s.ada.run(getBranch, { id: s.last.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.otherCompany, "Nairobi", "active"]),
      noEvents(),
    ),
    s.step(
      "Ada adds a branch to her second company under a name the first doesn't use",
      s.ada.run(createBranch, { company: s.world.otherCompany, branchName: "Eldoret Depot 3" }),
      expect((a) => a.branch).toMatch(/^brn_[0-9a-z]+$/),
      emits(BranchCreated, { branch: s.last.branch, company: s.world.otherCompany }),
    ),
    s.step(
      "it is filed under the second company",
      s.ada.run(getBranch, { id: s.last.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.otherCompany, "Eldoret Depot 3", "active"]),
      noEvents(),
    ),
    s.step(
      "and the first company's first branch still reads back as before",
      s.ada.run(getBranch, { id: s.world.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, "Nairobi", "active"]),
      noEvents(),
    ),
  ],
});
