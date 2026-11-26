import { Blueprint } from "orthograph";
import { Safe } from "../thing.ts";
import { machine } from "../machine.ts";
import { FounderHasNoSafe } from "../errors.ts";
import { Company } from "../../company/thing.ts";
import { owner } from "../../company/roles.ts";

// Only the company's founder, who runs it, records its Safe. Its first owner is the founder's own Safe's account, its
// salt nonce `uint256(keccak256("<namespace>:<the company's com_ id>"))`. SafeAlreadyRecorded belongs to the rule in
// ../invariants.ts; FounderHasNoSafe is the handler's, when the founder has recorded no Safe of their own.
export default Blueprint.operation(Safe, {
  description: "Record a company's Safe, owned by its founder's own Safe, at the address it will have once deployed.",
  payload: { company: Blueprint.described(Company.fields.id, "The company whose Safe it is.") },
  answer: { safe: Safe.fields.id, account: Safe.fields.account },
  move: machine.moves.recordCompany,
  errors: [FounderHasNoSafe],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
