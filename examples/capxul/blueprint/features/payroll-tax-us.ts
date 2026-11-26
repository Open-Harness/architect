import { Blueprint } from "orthograph";
import payrollTaxUs from "@capxul/payroll-tax-us";

// Mounted early, filling nothing: payroll's slips carry no tax lines until gap 3 lands (design/goals/16-lane-payroll-tax.md).
export default Blueprint.use(payrollTaxUs);
