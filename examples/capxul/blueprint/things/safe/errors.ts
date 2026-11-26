import { Blueprint } from "orthograph";
import { Safe } from "./thing.ts";
import { Company } from "../company/thing.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here. ThresholdOutOfRange
// and OwnersNotUnique (CX-safe, section 1) come with S3, whose operations are the first to take owners or a threshold.
/** The person or the company already has its Safe: one salt nonce, so one address, per id. */
export class SafeAlreadyRecorded extends Blueprint.error({ saltNonce: Safe.fields.saltNonce }, { exit: 41 }) {}
/** A company's Safe is owned by its founder's own Safe, and the founder has none yet. */
export class FounderHasNoSafe extends Blueprint.error({ company: Company.fields.id }, { exit: 42 }) {}
