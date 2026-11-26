import { Blueprint } from "orthograph";

// Capxul's Safes (design/decisions/CX-safe.md, section 1). An address is a CAIP-10 account, `Blueprint.account()`.

/** Whose a Safe is: a person's own, or a company's, which its founder's personal Safe owns. */
export const SafeKind = Blueprint.value(Blueprint.oneOf(["personal", "company"]));
/** The CREATE2 salt's nonce, `uint256(keccak256("capxul:<environment>:safe:v1:<id>"))`: public once deployed, so it never holds an email. */
export const SaltNonce = Blueprint.value(Blueprint.uint(256));
/** How many owners must approve a Safe's transaction: 1 at setup, and never more than it has owners. */
export const Threshold = Blueprint.value(Blueprint.uint(8));

/**
 * What a Safe's address depends on in each environment: the salt's namespace, and the address of the environment's
 * bootstrap key, the only owner a personal Safe has until it is claimed (CX-safe, "The bootstrap owner and the claim").
 * The key itself is a secret, held by the server, and never written here. An environment declaration has no field
 * for an app's own settings, so they are kept here by the environment's name (`blueprint/environments/<name>.ts`).
 *
 * `local`'s bootstrap address is Anvil's first development account, whose key is public, so a world's journeys can
 * sign the claim (S3) without any secret. Staging's is added with the staging run, from the server's own key.
 */
export const SafeSettings = {
  local: { chain: "eip155:31337", namespace: "capxul:local:safe:v1", bootstrap: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
} as const;
