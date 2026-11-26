import { Blueprint } from "orthograph";
import { PersonalSafe } from "./thing.ts";

// Refusals that depend on data. SignerNotProven comes with the claim, in S1b.
/** The person already has their Safe: one per person. */
export class SafeAlreadyOpen extends Blueprint.error({ person: PersonalSafe.fields.person }, { exit: 41 }) {}
