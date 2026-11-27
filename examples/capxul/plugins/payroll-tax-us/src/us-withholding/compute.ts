import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/us-withholding/verbs/compute.ts";
import { AmountFractional, AmountNegative, AmountNotANumber, WorkStateUnknown } from "../../blueprint/things/us-withholding/errors.ts";

/** The fifty states and DC, by their postal codes. Territories have their own withholding (CX-payroll-tax: the United States only). */
const workStates: ReadonlySet<string> = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD",
  "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]);

/** A figure in USDC base units, judged by name: a number, then not below nothing, then whole. */
const judged = (figure: "wage" | "yearToDate", text: string) =>
  Effect.gen(function* () {
    if (!/^-?\d+(\.\d+)?$/.test(text)) {
      yield* Effect.logInfo(`the ${figure} isn't a number`);
      return yield* new AmountNotANumber({ figure });
    }
    if (text.startsWith("-") && /[1-9]/.test(text)) {
      yield* Effect.logInfo(`the ${figure} is below nothing`);
      return yield* new AmountNegative({ figure });
    }
    if (text.includes(".")) {
      yield* Effect.logInfo(`the ${figure} isn't whole base units`);
      return yield* new AmountFractional({ figure });
    }
    return BigInt(text);
  });

/**
 * Work out one pay's US tax lines. Slice 0 has no dated rows yet (CX-tax-us-rows), so every tax is nothing, and a line
 * of nothing is left out: the answer has no lines until slice 3 brings federal's rows.
 */
const compute: Handler<typeof declaration> = ({ wage, yearToDate, workState }) =>
  Effect.gen(function* () {
    yield* judged("wage", wage);
    yield* judged("yearToDate", yearToDate);
    if (!workStates.has(workState)) {
      yield* Effect.logInfo("the work state isn't one of the fifty states or DC");
      return yield* new WorkStateUnknown({ workState });
    }
    return { lines: [] };
  });

export default compute;
