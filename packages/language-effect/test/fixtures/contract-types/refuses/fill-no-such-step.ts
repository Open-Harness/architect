// Refused. Fault: 'audit'. A fill runs only the steps its declaration holds.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { FillHandler, Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { CodeTaken, RateMissing, SlipLate, Stranger, TaxTableMissing, codesUs, slipQuick, slipSubmit, slipTaxUs } from "../features.ts";

void [refusesWith, CodeTaken, RateMissing, SlipLate, Stranger, TaxTableMissing, codesUs, slipQuick, slipSubmit, slipTaxUs];

export const usTax: FillHandler<typeof slipTaxUs> = ({ gross, country }, { steps }) =>
  Effect.gen(function* () {
    if (country !== "US") return yield* new TaxTableMissing({ country });
    void steps.audit; // ← the fault
    yield* steps.save(Effect.void);
    return { tax: gross / 10n };
  });
// FillHandler and Handler are both imported so every file reads alike.
export type Uses = [FillHandler<typeof codesUs>, Handler<typeof slipQuick>];
