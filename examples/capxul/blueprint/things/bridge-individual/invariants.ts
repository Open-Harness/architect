import { Blueprint } from "orthograph";
import { BridgeIndividual } from "./thing.ts";
import { KycAlreadyStarted } from "./errors.ts";

// One KYC per person.
export const oneKycPerPerson = Blueprint.invariant.unique([BridgeIndividual.fields.person], { refuse: KycAlreadyStarted });

// Bridge's hosted form belongs to one customer, so no two KYCs share one. It names no refusal: a clash is the
// handler's bug.
export const oneKycPerForm = Blueprint.invariant.unique([BridgeIndividual.fields.kycLink]);
