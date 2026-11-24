import { Blueprint } from "orthograph";
import { BridgeIndividual } from "./thing.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** The person already has their KYC with Bridge: Bridge keeps one customer per person. */
export class KycAlreadyStarted extends Blueprint.error({ person: BridgeIndividual.fields.person }, { exit: 41 }) {}
