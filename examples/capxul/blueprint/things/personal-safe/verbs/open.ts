import { Blueprint } from "orthograph";
import { PersonalSafe } from "../thing.ts";
import { machine } from "../machine.ts";

// The person is the caller: nobody opens a Safe for someone else. SafeAlreadyOpen belongs to the rule in
// ../invariants.ts, and the runtime refuses it. The salt nonce is `uint256(keccak256("<namespace>:<the caller's per_ id>"))`
// (blueprint/values/safe.ts); there is no owner and no address until the claim.
export default Blueprint.operation(PersonalSafe, {
  description: "Open your own Safe. It has no address until you claim it with the key you sign with.",
  payload: {},
  answer: { safe: PersonalSafe.fields.id },
  move: machine.moves.open,
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
