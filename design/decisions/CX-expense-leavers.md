# CX-expense-leavers: a leaver can't start new HR records, but can finish open ones

**Decided 24 November 2026** by Goal 16's lead, on #937's 🔍 review.

HRMS's `validate_active_employee` (`hrms/hr/utils.py`, at `46b38904`) refuses an expense claim only for an employee whose
status is Inactive, and runs on every save. Capxul's employees have no Inactive state, only active and left (#763, #786).

Capxul's rule, first for expense claims and since extended to attendance (below): `expense-claim.create` refuses
`ClaimantNotActive` for an employee who has left. A claim already open when the employee leaves can still take lines and
be approved, as a final settlement pays a leaver back. So the rule is judged on create only, and `add` and `approve` don't
check the employee.

Why not HRMS's rule as written: without an Inactive state it refuses nothing, and a new claim from someone already gone is
the case a company wants stopped. Payroll (slice 9) revisits this when it brings full and final settlement.

**Extended 24 November 2026** (#964, slice 8d): attendance and attendance requests follow the same rule. `attendance.mark`
refuses `AttendeeHasLeft` and `attendance-request.create` refuses `RequesterHasLeft`, judged on mark and create only, and
a request opened before the employee left can still be approved and mark its days. HRMS's `validate_active_employee` and
`validate_employee_status` refuse only an Inactive employee, so HRMS lets a Left employee be marked; Capxul's rule is
stricter, and payroll revisits it with the rest.
