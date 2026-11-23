import { Blueprint } from "orthograph";
import { Allowance } from "./thing.ts";

// Refusals that depend on data. The machine's own refusal, AllowanceNotActive, is generated and never written here.
// A row that is not there is refused as the model says: NotAllowed when a role reads it (M6-chain item 6).
export class AllowanceExceeded extends Blueprint.error({ remaining: Blueprint.money.of(Allowance.fields.token) }, { exit: 41 }) {}
