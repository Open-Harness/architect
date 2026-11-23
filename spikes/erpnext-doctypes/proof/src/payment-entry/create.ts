// Hand-written over the scaffold (proof/). Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/payment-entry/create.handler.ts";
import { PaymentEntry } from "../../blueprint/things/payment-entry/thing.ts";
import { startPaymentEntry } from "../erpnext/payment-entry.start.ts";

/** An amount times an exact decimal rate, rounded half up to a whole smallest unit (ERPNext's flt(x * rate, precision)). */
export const times = (amount: bigint, rate: string): bigint => {
  const [whole, frac = ""] = rate.split(".");
  const scale = 10n ** BigInt(frac.length);
  return (amount * BigInt(`${whole}${frac}`) * 2n + scale) / (2n * scale);
};

const create: Handler = (payload, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // ERPNext fetches the accounts' currencies from Account; there is no Account thing yet, so the proof's company is in USD.
    yield* steps.record(records.insert(PaymentEntry, {
      ...startPaymentEntry, ...payload, id,
      paidFromAccountCurrency: "USD", paidToAccountCurrency: "USD",
      basePaidAmount: times(payload.paidAmount, payload.sourceExchangeRate),
      baseReceivedAmount: times(payload.receivedAmount, payload.targetExchangeRate),
    } as never));
    yield* move();
    return { paymentEntry: id };
  });

export default create;
