// Hand-written over the scaffold (proof/). Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/payment-entry/submit.handler.ts";
import { GlEntry } from "../../blueprint/things/gl-entry/thing.ts";
import { startGlEntry } from "../erpnext/gl-entry.start.ts";

/** ERPNext's make_gl_entries for a payment received: debit the account paid to, credit the account paid from. */
const submit: Handler = ({ paymentEntry }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const pe = subject as unknown as Record<string, unknown>;
    const line = { ...startGlEntry, postingDate: pe["postingDate"], company: pe["company"], voucherNo: { declaration: "payment-entry", id: paymentEntry }, accountCurrency: "USD" };
    const debit = yield* Ids.of(GlEntry.fields.id);
    const credit = yield* Ids.of(GlEntry.fields.id);
    yield* steps.record(Effect.all([
      records.insert(GlEntry, { ...line, id: debit, account: pe["paidTo"], debit: pe["baseReceivedAmount"], credit: 0n } as never, "posted"),
      records.insert(GlEntry, { ...line, id: credit, account: pe["paidFrom"], debit: 0n, credit: pe["basePaidAmount"] } as never, "posted"),
    ]));
    yield* move();
    return { paymentEntry, debit, credit };
  });

export default submit;
