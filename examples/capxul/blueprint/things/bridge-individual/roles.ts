import { Blueprint } from "orthograph";
import { BridgeIndividual } from "./thing.ts";

/** The person checked. Nobody else sees their KYC, a company's owner included. */
export const self = Blueprint.role(BridgeIndividual, { rule: (individual, caller) => individual.person === caller.person });
