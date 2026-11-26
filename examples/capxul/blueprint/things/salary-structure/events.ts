import { Blueprint } from "orthograph";
import { SalaryStructure } from "./thing.ts";

export const SalaryStructureDrafted = Blueprint.event({
  salaryStructure: SalaryStructure.fields.id,
  company: SalaryStructure.fields.company,
  netPay: SalaryStructure.fields.netPay,
});
export const SalaryStructureSubmitted = Blueprint.event({ salaryStructure: SalaryStructure.fields.id });
export const SalaryStructureCancelled = Blueprint.event({ salaryStructure: SalaryStructure.fields.id });
