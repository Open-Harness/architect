import { Blueprint } from "orthograph";
import { BankTransaction } from "./thing.ts";
import { AlreadyRecorded } from "./errors.ts";

// One transaction per movement Bridge reports, however often it reports it. The key is Bridge's id for the movement,
// not the webhook's `event_id`: one deposit is several `virtual_account.activity` events (`funds_received`,
// `payment_submitted`, `payment_processed`), each with its own `event_id`, so keying on that would count it once per
// event (design/decisions/CX-bridge.md).
export const oneTransactionPerMovement = Blueprint.invariant.unique([BankTransaction.fields.reference], { refuse: AlreadyRecorded });
