// Refused. Fault: 'CodeTaken'. slip.quick runs the tax contract only: the account code's error is no refusal of its.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { FillHandler, Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { CodeTaken, RateMissing, SlipLate, Stranger, TaxTableMissing, codesUs, slipQuick, slipSubmit, slipTaxUs } from "../features.ts";

void [refusesWith, CodeTaken, RateMissing, SlipLate, Stranger, TaxTableMissing, codesUs, slipQuick, slipSubmit, slipTaxUs];

export const quick: Handler<typeof slipQuick> = ({ slip, gross, country }, { steps }) =>
  Effect.gen(function* () { // ← the fault
    const taxed = yield* steps.tax({ slip, gross, country });
    if (taxed === undefined) return yield* new CodeTaken({ code: country });
    return { slip, tax: taxed.tax };
  });
// FillHandler and Handler are both imported so every file reads alike.
export type Uses = [FillHandler<typeof codesUs>, Handler<typeof slipQuick>];
