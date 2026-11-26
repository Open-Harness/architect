# CX-leave: Capxul's leave (HR slice 8b), checked against HRMS at `46b38904`

**Decided 24 November 2026** by Goal 16's checks author for slice 8b, with Goal 16's lead (Goal 16 Capxul core,
thread T-01a2093c-8643-7794-9ce7-5dbc110ce4aa), who agreed every call below that day. Core's scope named the things,
their states and the refusals; each was read against Frappe HRMS at `46b38904` (`hrms/hr/doctype/leave_type`,
`leave_allocation`, `leave_application`, `attendance`, `attendance_request`). Where HRMS was silent or doesn't fit
Capxul, the call is marked **Capxul's own**; where it follows HRMS, the HRMS function is named.

## What is built

- **Leave Type**, per company: `leaveTypeName` (unique per company, `LeaveTypeNameTaken`), `maxContinuousDaysAllowed`
  (a whole number, 0 for no limit), `isLwp` and `includeHoliday` (yes or no). `active` only.
- **Leave Allocation**: `employee`, `leaveType`, `fromDate`, `toDate`, `newLeavesAllocated` (`Blueprint.decimal({ places: 2 })`),
  and its `company`. `draft → submitted`.
- **Leave Application**: `employee`, `leaveType`, `fromDate`, `toDate`, `reason`, its `company`, and `totalLeaveDays` (a
  decimal: the days it takes once holidays are skipped). `open → approved | rejected | cancelled`.
- **Attendance** gains the status On Leave, which only a leave's approval marks: `attendance.mark` takes every status
  but On Leave. `attendance.mark` refuses `AttendanceOnLeave`, and an approved attendance request skips leave days.
- **Attendance Request** gains `AttendanceRequestOverlaps`.

Every rule that reads other records reads them with `Records.list` (#764, #968), never a store-wide scan, and the list
guard refuses a commit whose list changed under it.

## The calls

Numbered as they were put to the lead.

1. **The holiday list. Capxul's own, for now.** HRMS takes the employee's `holiday_list`, else the company's
   `default_holiday_list` (`get_holiday_list_for_employee`). Capxul has neither: each needs an optional reference
   (#967). A day is a holiday when **any** of the company's own holiday lists holds it; a company with no list has
   none, and another company's lists never count. A list holds only days inside its own range (slice 8c's
   `HolidayOutsideList`), so a day counts only inside the range of a list that holds it. *Known limit:* this differs
   from HRMS for a company that keeps several lists for different places; the employee's and the company's default list
   wait on #967.
2. **Approve judges again. HRMS's.** HRMS saves the application as Approved and runs `validate` again, so
   `leave-application.approve` refuses `InsufficientLeaveBalance` (counting the approved days as they are then) and
   `LeaveDayAttended`. Without it, two open applications that each fit the balance could both be approved, since the
   balance counts approved days only (`get_leave_balance_on(..., for_consumption=True)` reads the ledger, which holds
   submitted applications only). HRMS's `validate` also counts `total_leave_days` again; Capxul keeps the count made at
   create, so a holiday added between create and approve doesn't change it (**Capxul's own**, a known limit).
3. **HRMS rules core's scope didn't list, added:**
   - Allocation: `LeaveWithoutPayNotAllocated` (`validate_lwp`); `NoLeavesAllocated` for 0 (`set_total_leaves_allocated`:
     "Total leaves allocated is mandatory"), and **Capxul's own** for below 0; `AllocationExceedsPeriod`, more leaves
     than the days from the first to the last, both counted (`validate_total_leaves_allocated`; `allow_over_allocation`
     is out of scope).
   - Application: `LeaveAllHolidays`, when every day asked for is a holiday (`validate_balance_leaves`,
     `total_leave_days <= 0`); `LeaveDayAttended`, when the employee is marked Present or Work From Home on a day asked
     for, carrying the first such day (`validate_attendance`).
   - `NoAllocationCovers`, unless one submitted allocation of the employee and type holds both the first and the last
     day (`validate_dates_across_allocation`). HRMS has two messages, "outside leave allocation period" and "across two
     allocation records"; Capxul has one refusal. Leave without pay skips it (`if not is_lwp`).
   - `LeaveTooLong` counts the open or approved applications of the same type that run on from this one day after day
     (`validate_max_days`, `get_consecutive_leave_details`), counting leave days, so holidays the type doesn't count
     don't count toward the run. It carries the type's limit.
4. **Allocation overlap. HRMS's** `validate_allocation_overlap`: against **submitted** allocations of the same employee
   and type (`docstatus=1`), sharing any day (`to_date >= from and from_date <= to`). Judged on create and again on
   submit, so two overlapping drafts can't both be submitted.
5. **`check_leave_record` refuses. Capxul's own.** HRMS doesn't refuse: it rewrites the attendance's status to On Leave.
   Core's scope has `attendance.mark` refuse `AttendanceOnLeave` (carrying the application) for any day an approved
   application covers, holidays inside it included, so On Leave is only ever marked by a leave's approval.
6. **Attendance request overlap. HRMS's** `validate_request_overlap`, which exists at `46b38904`:
   `AttendanceRequestOverlaps` on create, against the employee's draft or approved requests. HRMS's Attendance Request
   has no rejected state: a request it drops is a deleted draft or cancelled (`docstatus` 2), and neither overlaps.
   Capxul's rejected request (its own move, from 8d) follows that and doesn't overlap. The shift filter waits on shifts
   on requests.
7. **Not before joining. Capxul's own.** HRMS's leave application checks the joining day only through
   `applicable_after`, which is out of scope. `LeaveBeforeJoining` (carrying the joining day, which is allowed) follows
   attendance's `AttendanceBeforeJoining`.
8. **Leave types are per company. Capxul's own.** HRMS's types are site-wide. Capxul's companies are separate
   organisations (K42, call 10), so an allocation or application naming another company's type is refused
   (`AllocationTypeNotInCompany`, `ApplicationTypeNotInCompany`).
9. **Leave days are decimals. HRMS's Float, held exactly; the decimal type is Capxul's own.** `newLeavesAllocated` and
   `totalLeaveDays` are `Blueprint.decimal({ places: 2 })`, which admits HRMS's earned-leave rounding of 0.25. Half days
   are out of scope, so today `totalLeaveDays` is always whole. The decimals travel the generated API (#959, through
   #973); the generated CLI's printing of them is #969's.
10. **A holiday already marked. Capxul's own, a known limit.** HRMS's `update_attendance` cancels and deletes an
    attendance on a holiday inside an approved leave that doesn't count holidays. Capxul can't delete an attendance yet,
    so approve leaves that day as it is.
11. **Cancel and reject. HRMS's permissions, with one Capxul call.** Cancel is by the owner only, from open or approved;
    reject from open only. That follows HRMS, where an employee can't submit or cancel. HRMS cancels a submitted
    application and deletes a draft. Its status has a Cancelled option, but `on_submit` refuses to submit one, so
    cancelling an open application as a move is **Capxul's own**. Cancelling an approved application gives its days back
    to the balance and leaves the days it marked On Leave as they are (HRMS's `cancel_attendance` cancels them; that
    waits on cancelling an attendance). *Known limit.*

## Who does what

The company's owner runs everything: types, allocations, approving, rejecting and cancelling. An employee may apply for
their own leave (`self.of("employee")`), as 8d's attendance request lets them, and reads their own allocations and
applications. Only the owner approves; HRMS's `prevent_self_leave_approval` follows, since an employee can't approve at
all.

## The order of refusals

- `leave-allocation.create`: `AllocateeNotInCompany`, `AllocateeHasLeft`, `AllocationTypeNotInCompany`,
  `AllocationEndsBeforeStart`, `AllocationOverlaps`, `LeaveWithoutPayNotAllocated`, `NoLeavesAllocated`,
  `AllocationExceedsPeriod`: Capxul's own checks first, then HRMS's `validate` order.
- `leave-application.create`: `ApplicantNotInCompany`, `ApplicantHasLeft`, `ApplicationTypeNotInCompany`,
  `LeaveEndsBeforeStart`, `LeaveBeforeJoining`, `NoAllocationCovers`, `LeaveAllHolidays`, `InsufficientLeaveBalance`,
  `LeaveOverlaps`, `LeaveTooLong`, `LeaveDayAttended`, following HRMS's `validate` (`validate_dates`,
  `validate_balance_leaves`, `validate_leave_overlap`, `validate_max_days`, `validate_attendance`).
- `leave-application.approve`: `InsufficientLeaveBalance`, then `LeaveDayAttended`.
- Leavers follow `CX-expense-leavers`: a new allocation or application is refused for an employee who has left; a draft
  allocation or an open application made before they left can still be submitted or approved.

## Out of scope, as known limits

Leave Policy and Policy Assignment, Leave Period, Leave Ledger Entry (the balance is computed from lists), Encashment,
Compensatory Leave, Block List, half days, carry-forward and expiry, `applicable_after`, `max_leaves_allowed`,
`allow_negative`, optional leave, the leave approver, back-dated restrictions and salary-processed days. Shift overlap
waits on optional references (#967). An attendance's leave type and application wait on #967 too. The three limits in
calls 1, 10 and 11 above, and the count kept from create in call 2.
