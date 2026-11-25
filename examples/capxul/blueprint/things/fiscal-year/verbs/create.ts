import { Blueprint } from "orthograph";
import { FiscalYear } from "../thing.ts";
import { machine } from "../machine.ts";
import { FiscalYearEndsBeforeStart, FiscalYearOverlaps, FiscalYearWrongLength } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts): FiscalYearEndsBeforeStart, FiscalYearWrongLength, FiscalYearOverlaps; then the runtime's
// FiscalYearNameTaken. The overlap is judged against the company's own years only.
export default Blueprint.operation(FiscalYear, {
  description: "Set up a company's fiscal year.",
  payload: {
    company: FiscalYear.fields.company,
    year: FiscalYear.fields.year,
    yearStartDate: FiscalYear.fields.yearStartDate,
    yearEndDate: FiscalYear.fields.yearEndDate,
    isShortYear: FiscalYear.fields.isShortYear,
  },
  answer: { fiscalYear: FiscalYear.fields.id },
  move: machine.moves.create,
  errors: [FiscalYearEndsBeforeStart, FiscalYearWrongLength, FiscalYearOverlaps],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
