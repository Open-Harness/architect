// The declarations the #1133 type checks compile against (CX-feature-contracts, calls 2 and 4): payroll's slip, an optional contract (the tax on
// a slip) and a required one (an account's code), two operations that run them, and a fill of each. Written by the checks author for Goal 16; the
// builder never edits this folder.
import { Blueprint } from "orthograph";

export const Amount = Blueprint.value(Blueprint.uint(64));
export const Country = Blueprint.value(Blueprint.text({ max: 2 }));
export const Code = Blueprint.value(Blueprint.text({ max: 12 }));
export const Slip = Blueprint.thing({ description: "A pay slip.", fields: { id: Blueprint.id("slp"), gross: Amount, country: Country } });

export class TaxTableMissing extends Blueprint.error({ country: Country }, { exit: 63 }) {}
/** The tax contract's second error, which the US fill doesn't declare: a fill refuses with what its own declaration names. */
export class TaxRateDisputed extends Blueprint.error({ rate: Amount }, { exit: 67 }) {}
export class CodeTaken extends Blueprint.error({ code: Code }, { exit: 62 }) {}
export class SlipLate extends Blueprint.error({ slip: Slip.fields.id }, { exit: 66 }) {}
/** payroll-tax-us's own error: no contract declares it. */
export class RateMissing extends Blueprint.error({ region: Country }, { exit: 64 }) {}
/** Declared by nothing that runs here. */
export class Stranger extends Blueprint.error({ note: Code }, { exit: 65 }) {}

export const slipTax = Blueprint.contract({
  description: "The tax on a slip.",
  input: { slip: Slip.fields.id, gross: Amount, country: Country },
  output: { tax: Amount },
  errors: [TaxTableMissing, TaxRateDisputed],
  optional: true,
});
export const accountCode = Blueprint.contract({ description: "An account's code.", input: { name: Country }, output: { code: Code }, errors: [CodeTaken] });

/** Runs both: its own error, and each contract's. */
export const slipSubmit = Blueprint.operation(Slip, {
  description: "Submit a slip.",
  payload: { slip: Slip.fields.id, gross: Amount, country: Country },
  answer: { slip: Slip.fields.id, tax: Amount, code: Code },
  errors: [SlipLate],
  allowed: [Blueprint.signedIn],
  steps: { save: Blueprint.step.database(), tax: Blueprint.step.contract(slipTax), code: Blueprint.step.contract(accountCode) },
});
/** Runs the tax contract only, and declares no error of its own. */
export const slipQuick = Blueprint.operation(Slip, {
  description: "Tax a slip quickly.",
  payload: { slip: Slip.fields.id, gross: Amount, country: Country },
  answer: { slip: Slip.fields.id, tax: Amount },
  allowed: [Blueprint.signedIn],
  steps: { tax: Blueprint.step.contract(slipTax) },
});

export const slipTaxUs = Blueprint.fill(slipTax, {
  description: "US tax on a slip.",
  input: { slip: Slip.fields.id, gross: Amount, country: Country },
  output: { tax: Amount },
  errors: [TaxTableMissing],
  steps: { save: Blueprint.step.database() },
});
export const codesUs = Blueprint.fill(accountCode, { description: "US account codes.", input: { name: Country }, output: { code: Code }, errors: [CodeTaken] });
