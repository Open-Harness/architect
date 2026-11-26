import { Blueprint } from "orthograph";
import { Safe } from "../thing.ts";
import { machine } from "../machine.ts";

// The person is the caller: nobody records a Safe for someone else. SafeAlreadyRecorded belongs to the rule in
// ../invariants.ts, and the runtime refuses it. Its first owner is the environment's bootstrap key's address, its salt
// nonce `uint256(keccak256("<namespace>:<the caller's per_ id>"))`, and its account the address Safe 1.4.1's factory
// gives them (blueprint/values/safe.ts, CX-safe "The address before deploy").
export default Blueprint.operation(Safe, {
  description: "Record your own Safe, at the address it will have once deployed. Nothing is sent to the chain.",
  payload: {},
  answer: { safe: Safe.fields.id, account: Safe.fields.account },
  move: machine.moves.record,
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
