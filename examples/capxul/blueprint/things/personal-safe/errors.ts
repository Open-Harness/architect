import { Blueprint } from "orthograph";
import { PersonalSafe } from "./thing.ts";
import { EvmAddress } from "../../values/safe.ts";

// Refusals that depend on data. The machine's own refusal (a second claim) is generated and never written here.
/** The person already has their Safe: one per person. */
export class SafeAlreadyOpen extends Blueprint.error({ person: PersonalSafe.fields.person }, { exit: 41 }) {}
/** The proof was not signed by the key the claim names. */
export class SignerNotProven extends Blueprint.error({ signer: EvmAddress }, { exit: 42 }) {}
