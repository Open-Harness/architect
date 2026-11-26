import { Blueprint } from "orthograph";
import { PayrollEntry } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Payroll Entry: a draft, filled with its employees; submitted, when it makes their salary slips as drafts
// (`on_submit`); then accrued, when it submits the slips and posts their accrual journal entry (`submit_salary_slips`,
// HRMS's `salary_slips_submitted`). Cancelling an entry, and with it its slips and journal entry, comes later.
export const machine = Blueprint.machine(PayrollEntry, {
  states: ["draft", "submitted", "accrued"],
  moves: {
    create: { from: [], to: "draft", emits: Events.PayrollEntryDrafted },
    submit: { from: ["draft"], to: "submitted", emits: Events.PayrollEntrySubmitted },
    submitSlips: { from: ["submitted"], to: "accrued", emits: Events.SalarySlipsSubmitted },
  },
  notFrom: { exit: 40 },
});
