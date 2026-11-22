import { Blueprint } from "orthograph";

/** The declared refusal a handler maps the outside ledger's failure to. */
export class LedgerUnavailable extends Blueprint.error({}, { exit: 78 }) {}
