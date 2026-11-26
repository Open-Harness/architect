// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// Slice 0 of the US payroll tax lane (design/goals/16-lane-payroll-tax.md): the piece's footing. It needs no rows: it
// proves the piece is mounted, that `us-withholding.compute` judges its figures by name, and that a line of nothing is
// left out, never shown as zero (CX-payroll's accrual does the same). It imports only `@capxul/payroll-tax-us` and
// `orthograph`, nothing of the app's, until the pieces move lands.
//
// The contract the builder declares, in `examples/capxul/plugins/payroll-tax-us/blueprint/things/us-withholding/`:
// - `verbs/compute.ts`, the operation `us-withholding.compute`, which any signed-in person may call. Its payload has
//   `wage` and `yearToDate` as text, so a figure that isn't whole base units reaches the handler and is refused by
//   name rather than by the wire; `frequency`; `payDate`, a day; `workState`, as text, judged by the handler; and `w4`,
//   Form W-4's figures. Its answer has `lines`, a list of tax lines.
// - `errors.ts`: `AmountNegative`, `AmountFractional` and `AmountNotANumber`, each with `figure` ("wage" or
//   "yearToDate"), and `WorkStateUnknown`, with `workState`.
import { Blueprint, expect, noEvents, refuses } from "orthograph";
import compute from "@capxul/payroll-tax-us/blueprint/things/us-withholding/verbs/compute.ts";
import { AmountFractional, AmountNegative, WorkStateUnknown } from "@capxul/payroll-tax-us/blueprint/things/us-withholding/errors.ts";

// A single filer's 2020-and-later W-4 with nothing in Steps 2 to 4: no extra withholding in Step 4(c).
const plainW4 = {
  filingStatus: "single",
  step2: false,
  step3Credits: "0",
  step4aOtherIncome: "0",
  step4bDeductions: "0",
  step4cExtraWithholding: "0",
} as const;

// One biweekly pay in Texas, dated 2026-12-04, with no wages paid before it this year. Amounts are USDC base units.
const pay = (changes: { readonly wage?: string; readonly workState?: string }) => ({
  wage: "0",
  frequency: "biweekly",
  payDate: "2026-12-04",
  workState: "TX",
  yearToDate: "0",
  w4: plainW4,
  ...changes,
});

export default Blueprint.journey("tax-us: the piece's footing", {
  cast: { ada: Blueprint.signedIn },
  steps: (s) => [
    s.step(
      "a negative wage is refused, naming the wage",
      s.ada.run(compute, pay({ wage: "-1" })),
      refuses(AmountNegative, { figure: "wage" }),
      noEvents(),
    ),
    s.step(
      "a wage that isn't whole base units is refused, naming the wage",
      s.ada.run(compute, pay({ wage: "1500000000.5" })),
      refuses(AmountFractional, { figure: "wage" }),
      noEvents(),
    ),
    s.step(
      "a work state that isn't one of the fifty or DC is refused, naming it",
      // Puerto Rico has its own withholding, outside this piece (CX-payroll-tax: the United States only).
      s.ada.run(compute, pay({ wage: "1500000000", workState: "PR" })),
      refuses(WorkStateUnknown, { workState: "PR" }),
      noEvents(),
    ),
    s.step(
      "a wage of nothing, with no Step 4(c) extra withholding, gives no lines: a line of nothing is left out",
      s.ada.run(compute, pay({ wage: "0" })),
      expect((a) => a.lines).toEqual([]),
    ),
  ],
});
