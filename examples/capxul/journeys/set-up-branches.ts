// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { BranchCreated } from "../blueprint/things/branch/events.ts";
import { machine as branches } from "../blueprint/things/branch/machine.ts";
import createCompany from "../blueprint/things/company/verbs/create.ts";
import createBranch from "../blueprint/things/branch/verbs/create.ts";
import getBranch from "../blueprint/things/branch/verbs/get.ts";

export default Blueprint.journey("set up branches", {
  // Ada runs Acme Trading; Bo is signed in and runs nothing of hers.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a company",
  steps: (s) => [
    s.step(
      "Ada adds a branch",
      s.ada.run(createBranch, { company: s.world.company, branchName: "Nairobi" }),
      expect((a) => a.branch).toMatch(/^brn_[0-9a-z]+$/),
      emits(BranchCreated, { branch: s.last.branch, company: s.world.company }),
      branches.isIn(s.last.branch, "active"),
      spans({ present: ["branch.create", "branch.create.insert"] }),
    ),
    s.step(
      "Bo can't read Ada's branch",
      s.bo.run(getBranch, { id: s.last.branch }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada reads the branch back",
      s.ada.run(getBranch, { id: s.last.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, "Nairobi", "active"]),
      noEvents(),
    ),
    s.step(
      "Bo can't add a branch to Ada's company",
      s.bo.run(createBranch, { company: s.world.company, branchName: "Mombasa" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["branch.create", "branch.create.insert"] }),
    ),
    s.step(
      "Ada adds a second branch",
      s.ada.run(createBranch, { company: s.world.company, branchName: "Kisumu Depot" }),
      expect((a) => a.branch).toMatch(/^brn_[0-9a-z]+$/),
      emits(BranchCreated, { branch: s.last.branch, company: s.world.company }),
      branches.isIn(s.last.branch, "active"),
    ),
    s.step(
      "it reads back under its own name",
      s.ada.run(getBranch, { id: s.last.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, "Kisumu Depot", "active"]),
      noEvents(),
    ),
    s.step(
      "Bo sets up a company of his own",
      s.bo.run(createCompany, { companyName: "Bo Ltd", abbr: "BL", country: "Uganda", defaultCurrency: "UGX" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
    ),
    s.step(
      "Bo adds a branch to his company",
      s.bo.run(createBranch, { company: s.last.company, branchName: "Kampala" }),
      expect((a) => a.branch).toMatch(/^brn_[0-9a-z]+$/),
      emits(BranchCreated, { branch: s.last.branch }),
      branches.isIn(s.last.branch, "active"),
    ),
    s.step(
      "Ada can't read Bo's branch",
      s.ada.run(getBranch, { id: s.last.branch }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo reads his branch back, in his own company",
      s.bo.run(getBranch, { id: s.last.branch }),
      expect((a) => [a.branchName, a.state]).toEqual(["Kampala", "active"]),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
      noEvents(),
    ),
  ],
});
