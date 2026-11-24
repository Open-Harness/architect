import { Blueprint } from "orthograph";
import { Branch } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// No `errors:`: BranchNameTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(Branch, {
  description: "Add a branch to a company.",
  payload: { company: Branch.fields.company, branchName: Branch.fields.branchName },
  answer: { branch: Branch.fields.id },
  move: machine.moves.create,
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
