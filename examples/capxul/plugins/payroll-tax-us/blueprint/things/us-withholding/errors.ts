import { Blueprint } from "orthograph";

/** Which of the pay's figures a refusal names: the wage for this pay, or the wages paid before it this year. */
const Figure = Blueprint.value(Blueprint.oneOf(["wage", "yearToDate"]));

// Refusals that depend on data. `us-withholding.compute` judges the wage, then the year to date, then the work state.
/** A figure below nothing. */
export class AmountNegative extends Blueprint.error({ figure: Figure }, { exit: 41 }) {}
/** A figure that isn't whole USDC base units. */
export class AmountFractional extends Blueprint.error({ figure: Figure }, { exit: 42 }) {}
/** A figure that isn't a number at all. */
export class AmountNotANumber extends Blueprint.error({ figure: Figure }, { exit: 43 }) {}
/** A work state that isn't one of the fifty states or DC (CX-payroll-tax: the United States only). */
export class WorkStateUnknown extends Blueprint.error({ workState: Blueprint.value(Blueprint.text({ max: 40 })) }, { exit: 44 }) {}
