// Scaffolded from blueprint/things/payment/verbs/start.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/payment/start.handler.ts";
import { Payment } from "../../blueprint/things/payment/thing.ts";

/** Start a payment. It is pending until the bank says the checkout completed. */
const start: Handler = ({ amount }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const payment = yield* Ids.of(Payment.fields.id);
    yield* steps.insert(records.insert(Payment, { id: payment, amount, intent: "" }));
    yield* move("pending");
    return { payment };
  });

export default start;
