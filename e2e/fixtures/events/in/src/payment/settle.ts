// Scaffolded from blueprint/things/payment/verbs/settle.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/payment/settle.handler.ts";
import { Payment } from "../../blueprint/things/payment/thing.ts";

/** Settle a payment: the bank said its checkout completed. The machine already found it pending, so it exists. */
const settle: Handler = ({ payment, intent }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Payment, payment));
    if (!found) return yield* Effect.die(new Error(`payment ${payment} was checked and then not found`));
    yield* steps.record(records.update(Payment, payment, { intent }));
    yield* move("settled");
    return { payment };
  });

export default settle;
