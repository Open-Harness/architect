import { Blueprint } from "orthograph";
import { PayrollPeriod } from "../thing.ts";
import { machine } from "../machine.ts";
import { PayrollPeriodEndsBeforeStart, PayrollPeriodOverlaps } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts): PayrollPeriodEndsBeforeStart, PayrollPeriodOverlaps; then the runtime's
// PayrollPeriodNameTaken. The overlap is judged against the company's own periods only.
export default Blueprint.operation(PayrollPeriod, {
  description: "Set up a company's payroll period.",
  payload: {
    company: PayrollPeriod.fields.company,
    payrollPeriodName: PayrollPeriod.fields.payrollPeriodName,
    startDate: PayrollPeriod.fields.startDate,
    endDate: PayrollPeriod.fields.endDate,
  },
  answer: { payrollPeriod: PayrollPeriod.fields.id },
  move: machine.moves.create,
  errors: [PayrollPeriodEndsBeforeStart, PayrollPeriodOverlaps],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
