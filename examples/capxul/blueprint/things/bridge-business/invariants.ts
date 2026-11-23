import { Blueprint } from "orthograph";
import { BridgeBusiness } from "./thing.ts";
import { KybAlreadyStarted } from "./errors.ts";

// One KYB per company: its bank accounts all hang off the one Bridge customer.
export const oneKybPerCompany = Blueprint.invariant.unique([BridgeBusiness.fields.company], { refuse: KybAlreadyStarted });

// Bridge's hosted form belongs to one customer, so no two KYBs share one. It names no refusal: a clash is the
// handler's bug.
export const oneKybPerForm = Blueprint.invariant.unique([BridgeBusiness.fields.kybLink]);
