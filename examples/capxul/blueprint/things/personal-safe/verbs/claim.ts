import { Blueprint } from "orthograph";
import { PersonalSafe } from "../thing.ts";
import { machine } from "../machine.ts";
import { holder } from "../roles.ts";
import { SignerNotProven } from "../errors.ts";
import { EvmAddress, PersonalSignature } from "../../../values/safe.ts";

// The proof is an EIP-191 `personal_sign` by `signer` of the exact text "Capxul: claim Safe <saf_…> for <per_…>". The
// handler recovers it and refuses SignerNotProven unless it recovers to `signer`. Then `signer` is the one owner, and
// the account is the address Safe 1.4.1's factory gives for setup([signer], 1, MultiSend → SafeModuleSetup
// .enableModules([Safe4337Module]), fallback Safe4337Module, no payment) and the salt nonce, on the environment's chain.
export default Blueprint.operation(PersonalSafe, {
  description: "Claim your Safe with the key you sign with, proving you hold it. This works out its address; nothing is sent to the chain.",
  payload: {
    safe: PersonalSafe.fields.id,
    signer: Blueprint.described(EvmAddress, "The key you sign with, which becomes the Safe's one owner."),
    proof: Blueprint.described(PersonalSignature, "Your signer's personal_sign of \"Capxul: claim Safe <safe> for <you>\"."),
  },
  answer: { safe: PersonalSafe.fields.id, account: Blueprint.account() },
  move: machine.moves.claim,
  errors: [SignerNotProven],
  allowed: [holder],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
