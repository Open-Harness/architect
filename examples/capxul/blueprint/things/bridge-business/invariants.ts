import { Blueprint } from "orthograph";
import { BridgeBusiness } from "./thing.ts";
import { KybAlreadyStarted } from "./errors.ts";

// One KYB per company: its bank accounts all hang off the one Bridge customer.
export const oneKybPerCompany = Blueprint.invariant.unique([BridgeBusiness.fields.company], { refuse: KybAlreadyStarted });
