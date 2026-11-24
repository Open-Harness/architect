import { Blueprint } from "orthograph";
import { BridgeBusiness } from "./thing.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** The company already has its KYB with Bridge: Bridge keeps one business customer per business. */
export class KybAlreadyStarted extends Blueprint.error({ company: BridgeBusiness.fields.company }, { exit: 41 }) {}
