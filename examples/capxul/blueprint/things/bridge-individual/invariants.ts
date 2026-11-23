import { Blueprint } from "orthograph";
import { BridgeIndividual } from "./thing.ts";
import { KycAlreadyStarted } from "./errors.ts";

// One KYC per person.
export const oneKycPerPerson = Blueprint.invariant.unique([BridgeIndividual.fields.person], { refuse: KycAlreadyStarted });
