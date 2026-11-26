import { Blueprint } from "orthograph";
import { Schema } from "effect";

// Capxul's Safes (design/decisions/CX-safe.md; the person's Safe's machine, CX-safe-machines). An address on chain is a
// CAIP-10 account, `Blueprint.account()`, with the address checksummed (EIP-55).

/** The CREATE2 salt's nonce, `uint256(keccak256("capxul:<environment>:safe:v1:<per_…>"))`: public once deployed, so it never holds an email. */
export const SaltNonce = Blueprint.value(Blueprint.uint(256));
/** An EVM address, checksummed (EIP-55): the key a person signs with. */
export const EvmAddress = Blueprint.value(Schema.String.check(Schema.isPattern(/^0x[0-9a-fA-F]{40}$/)));

/**
 * What a Safe's address depends on in each environment beside its owner: the chain its accounts are on and the salt's
 * namespace. An environment declaration has no field for an app's own settings, so they are kept here by the
 * environment's name (`blueprint/environments/<name>.ts`). Staging's is added with the staging run.
 */
export const SafeSettings = {
  local: { chain: "eip155:31337", namespace: "capxul:local:safe:v1" },
} as const;
