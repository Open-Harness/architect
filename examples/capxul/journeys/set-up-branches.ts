// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. This journey makes one
// branch, and no create comes after it; the name journey reads every record back after its creates.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { BranchCreated } from "../blueprint/things/branch/events.ts";
import { machine as branches } from "../blueprint/things/branch/machine.ts";
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
      "Bo can't add a branch to Ada's company",
      s.bo.run(createBranch, { company: s.world.company, branchName: "Mombasa" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["branch.create", "branch.create.insert"] }),
    ),
    s.step(
      "Ada reads the branch back",
      s.ada.run(getBranch, { id: s.last.branch }),
      expect((a) => [a.company, a.branchName, a.state]).toEqual([s.world.company, "Nairobi", "active"]),
      noEvents(),
    ),
  ],
});
