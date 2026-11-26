// Refused. Fault: 'gross'. The contract's input is its own: gross is an amount, not a country.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { FillHandler, Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { CodeTaken, RateMissing, SlipLate, Stranger, TaxTableMissing, codesUs, slipQuick, slipSubmit, slipTaxUs } from "../features.ts";

void [refusesWith, CodeTaken, RateMissing, SlipLate, Stranger, TaxTableMissing, codesUs, slipQuick, slipSubmit, slipTaxUs];

export const submit: Handler<typeof slipSubmit> = ({ slip, gross, country }, { steps }) =>
  Effect.gen(function* () {
    if (gross === 0n) return yield* new SlipLate({ slip });
    const taxed = yield* steps.tax({ slip, gross: country, country }); // ← the fault
    const { code } = yield* steps.code({ name: country });
    return { slip, tax: taxed === undefined ? 0n : taxed.tax, code };
  });
// FillHandler and Handler are both imported so every file reads alike.
export type Uses = [FillHandler<typeof codesUs>, Handler<typeof slipQuick>];
