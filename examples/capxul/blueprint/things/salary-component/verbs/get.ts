import { Blueprint } from "orthograph";
import { SalaryComponent } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the component's record.
export default Blueprint.read(SalaryComponent, {
  by: "id",
  fields: ["company", "salaryComponent", "type", "amount", "account", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
