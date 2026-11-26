import { Blueprint } from "orthograph";
import { EvmAddress, SaltNonce } from "../../values/safe.ts";

// A person's own Safe (design/decisions/CX-safe.md, the person's Safe's machine). It is opened with no owner and no
// address: a Safe 1.4.1 needs a real owner at setup, and CREATE2 binds its address to that setup, so the address is
// worked out at claim, from the signer the person proves they hold and the salt nonce kept at open.
export const PersonalSafe = Blueprint.thing({
  description: "A person's own Safe: opened first, then claimed with the key they sign with, which gives its address.",
  code: "SF",
  fields: {
    id: Blueprint.id("saf"),
    person: Blueprint.described(Blueprint.id("per"), "Whose Safe it is."),
    saltNonce: Blueprint.described(SaltNonce, "The salt nonce its address is worked out from, kept at open so the address can be checked again."),
    signer: Blueprint.described(Blueprint.optional(EvmAddress), "The key the person proved they hold, set at claim."),
    firstOwner: Blueprint.described(Blueprint.optional(Blueprint.account()), "The one owner it is set up with, set at claim: the signer, on the environment's chain."),
    account: Blueprint.described(Blueprint.optional(Blueprint.account()), "Its address once claimed, worked out before it is deployed, checksummed (EIP-55)."),
  },
});
