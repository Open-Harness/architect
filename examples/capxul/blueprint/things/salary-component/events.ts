import { Blueprint } from "orthograph";
import { SalaryComponent } from "./thing.ts";

export const SalaryComponentCreated = Blueprint.event({
  salaryComponent: SalaryComponent.fields.id,
  company: SalaryComponent.fields.company,
  type: SalaryComponent.fields.type,
});
