import { Blueprint } from "orthograph";

// The runtime's, for the rule in invariants.ts: no verb lists it in `errors:` and no handler makes it (G5 section 3).
export class TableTaken extends Blueprint.error({}, { exit: 20 }) {}
