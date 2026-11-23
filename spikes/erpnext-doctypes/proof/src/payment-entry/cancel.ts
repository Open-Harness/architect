// Hand-written over the scaffold (proof/). Yours from now on. ERPNext's cancel also reverses the ledger lines; the proof
// stops at the move, because finding the lines needs a list by voucher the scaffold does not declare.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/payment-entry/cancel.handler.ts";

const cancel: Handler = ({ paymentEntry }, { steps, move }) => Effect.gen(function* () {
  yield* steps.record(Effect.void);
  yield* move();
  return { paymentEntry };
});

export default cancel;
