import { Blueprint } from "orthograph";
import { Schema } from "effect";
import { SalaryStructure } from "../thing.ts";
import { machine } from "../machine.ts";
import {
  StructureComponentNotInCompany,
  StructureComponentRepeated,
  StructureComponentWrongType,
  StructureLineWithoutAmount,
  StructureWithoutEarnings,
} from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { SalaryDetail } from "../../salary-detail/thing.ts";

/** One line as the owner types it: a component, and its amount in USDC base units, or 0 for the component's own. */
const Line = Schema.Struct({
  salaryComponent: SalaryDetail.fields.salaryComponent.value.schema,
  amount: SalaryDetail.fields.amount.value.schema,
});
const Lines = (what: string) =>
  Blueprint.described(Blueprint.value(Schema.Array(Line).check(Schema.isMaxLength(50))), `${what}, in order: each a component and its amount, 0 for the component's own. At most 50.`);

// Refusal order (errors.ts). The structure and every line are written together, each table's lines numbered from 1 in
// the order given, a line given 0 taking its component's amount (HRMS's `set_missing_values`). The totals are the
// lines' sums; the net pay may be negative in a draft.
export default Blueprint.operation(SalaryStructure, {
  description: "Draft a salary structure with its earnings and deductions.",
  payload: {
    company: SalaryStructure.fields.company,
    salaryStructureName: SalaryStructure.fields.salaryStructureName,
    earnings: Lines("Its earnings"),
    deductions: Lines("Its deductions"),
  },
  answer: {
    salaryStructure: SalaryStructure.fields.id,
    totalEarning: SalaryStructure.fields.totalEarning,
    totalDeduction: SalaryStructure.fields.totalDeduction,
    netPay: SalaryStructure.fields.netPay,
  },
  move: machine.moves.create,
  errors: [StructureWithoutEarnings, StructureComponentNotInCompany, StructureComponentWrongType, StructureLineWithoutAmount, StructureComponentRepeated],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database({ writes: [SalaryStructure, SalaryDetail] }) },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
