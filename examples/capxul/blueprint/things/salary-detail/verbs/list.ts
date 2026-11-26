import { Blueprint } from "orthograph";
import { SalaryDetail } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A structure's lines, in the order they were written: its earnings in the order given, then its deductions. A read
// changes nothing, so it has no handler.
export default Blueprint.read(SalaryDetail, {
  where: ["salaryStructure"],
  order: "oldest",
  page: 100,
  allowed: [owner.of("salaryStructure.company")],
  budget: { p95: "80 millis" },
});
