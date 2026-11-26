// Refused. Fault: 'note'. A fill answers its own output, which here adds a note its contract lacks: it is typed from its fill.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { FillHandler, Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { CodeTaken, RateMissing, SlipLate, Stranger, TaxTableMissing, codesUs, slipQuick, slipSubmit, slipTaxUs, slipTaxWide } from "../features.ts";

void [refusesWith, CodeTaken, RateMissing, SlipLate, Stranger, TaxTableMissing, codesUs, slipQuick, slipSubmit, slipTaxUs, slipTaxWide];

export const usWide: FillHandler<typeof slipTaxWide> = ({ gross }) =>
  Effect.gen(function* () { // ← the fault
    return { tax: gross / 10n };
  });

// FillHandler and Handler are both imported so every file reads alike.
export type Uses = [FillHandler<typeof codesUs>, Handler<typeof slipQuick>];
