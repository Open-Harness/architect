import { Blueprint } from "orthograph";

// The first two are the runtime's, for the rules in invariants.ts: no verb lists them in `errors:` and no handler makes them (G5 section 3).
export class HandleTaken extends Blueprint.error({}, { exit: 10 }) {}
export class HandleAlreadyOwned extends Blueprint.error({}, { exit: 12 }) {}
// The handler's own: what `handle.resolve` answers when no claimed handle has the name.
export class HandleNotFound extends Blueprint.error({}, { exit: 13 }) {}
