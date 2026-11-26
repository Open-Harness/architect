import { Blueprint } from "orthograph";
import { PayrollEntry } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A company's payroll entries, oldest first, whatever their state (HRMS's Payroll Entry list). A read changes nothing,
// so it has no handler.
export default Blueprint.read(PayrollEntry, {
  where: ["company"],
  order: "oldest",
  page: 50,
  allowed: [owner.of("company")],
  budget: { p95: "80 millis" },
});
