# CX-expense-leavers: a leaver can't start an expense claim, but can finish one

**Decided 24 November 2026** by Goal 16's lead, on #937's 🔍 review.

HRMS's `validate_active_employee` (`hrms/hr/utils.py`, at `46b38904`) refuses an expense claim only for an employee whose
status is Inactive, and runs on every save. Capxul's employees have no Inactive state, only active and left (#763, #786).

Capxul's rule: `expense-claim.create` refuses `ClaimantNotActive` for an employee who has left. A claim already open when
the employee leaves can still take lines and be approved, as a final settlement pays a leaver back. So the rule is judged on
create only, and `add` and `approve` don't check the employee.

Why not HRMS's rule as written: without an Inactive state it refuses nothing, and a new claim from someone already gone is
the case a company wants stopped. Payroll (slice 9) revisits this when it brings full and final settlement.
