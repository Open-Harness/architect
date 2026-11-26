import { Blueprint } from "orthograph";
import { Safe } from "./thing.ts";
import { SafeAlreadyRecorded } from "./errors.ts";

// One Safe per person and per company: the salt nonce is worked out from the person's or the company's id, so a second
// Safe for the same id would hold the same salt nonce. It is also how a company's Safe finds its founder's.
export const oneSafeEach = Blueprint.invariant.unique(Safe.fields.saltNonce, { refuse: SafeAlreadyRecorded });
