import { Blueprint, Schema } from "orthograph";
import { UsWithholding } from "../thing.ts";

/** Form W-4 (2020 and later), its figures in USDC base units. Slice 2 makes it a value of its own, judged when malformed. */
const W4 = Blueprint.value(Schema.Struct({
  filingStatus: Schema.Literals(["single", "married-jointly", "head-of-household"]),
  step2: Schema.Boolean,
  step3Credits: Schema.String,
  step4aOtherIncome: Schema.String,
  step4bDeductions: Schema.String,
  step4cExtraWithholding: Schema.String,
}));

/** One tax line on a slip. Slice 3 adds the row and citation each is worked from. */
const TaxLine = Blueprint.value(Schema.Struct({
  jurisdiction: Schema.String,
  tax: Schema.String,
  share: Schema.Literals(["employee", "employer"]),
  amount: Schema.String,
}));

// `wage` and `yearToDate` are text, so a figure that isn't whole base units reaches the handler and is refused by name.
// `workState` is text too, judged by the handler. A line whose amount is nothing is left out of `lines`.
export default Blueprint.operation(UsWithholding, {
  description: "Work out one pay's US tax lines from its wage, frequency, pay date, work state, wages so far this year and W-4.",
  payload: {
    wage: Blueprint.text({ max: 40 }),
    frequency: Blueprint.oneOf(["weekly", "biweekly", "semimonthly", "monthly", "quarterly", "semiannual", "annual", "daily"]),
    payDate: Blueprint.day(),
    workState: Blueprint.text({ max: 40 }),
    yearToDate: Blueprint.text({ max: 40 }),
    w4: W4,
  },
  answer: {
    lines: Blueprint.list(TaxLine),
  },
  allowed: [Blueprint.signedIn],
});
