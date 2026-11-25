# CX-employee-moves: promotions, transfers and separations, which rules are HRMS's and which are Capxul's own

**Decided 25 November 2026** by Goal 16's lead (thread T-01a2093c-8643-7794-9ce7-5dbc110ce4aa), with slice 8f's checks
author (thread T-01a20fed-5f57-7078-9d75-a10a6bd16fc1), who read HRMS at `46b38904`
(`hrms/hr/doctype/employee_{promotion,transfer,separation}`, `hrms/hr/utils.py`, `hrms/hr/employee_property_update.js`,
`hrms/controllers/employee_boarding_controller.py`). Where the lead's outline and the source differed, the source won;
each difference is listed below.

## What 8f holds

Three things, each in the employee's company, all run by the company's owner:

- **Employee Promotion** (`draft → submitted → cancelled`): the employee, the promotion's day, the job title the
  employee held when it was drafted (`currentDesignation`, copied on create, never typed) and the new one
  (`newDesignation`). Submit sets the employee's job title to the new one; cancel puts the current one back. The owner
  and the employee themselves read it, as HRMS gives the Employee role read.
- **Employee Transfer** (`draft → submitted → cancelled`): the same shape for the department (`currentDepartment`,
  `newDepartment`, `transferDate`).
- **Employee Separation** (`pending → inProcess → completed`, and `pending → completed`): the employee, the resignation
  letter's day and the day it begins (`boardingBeginsOn`). The owner moves it. Only the owner reads it, as HRMS gives it
  to System Manager alone.

HRMS's Employee Property History is folded into each promotion and transfer as two fields, its `current` and its `new`,
for the one property each carries.

## Writes

A promotion's and a transfer's `submit` and `cancel` update a field of the Employee row, the job title or the
department. That is a field update on another thing, not a state move, so #972 doesn't block it. Each step names
`writes: [<its own thing>, Employee]`, because an unset `writes` means the operation's own thing only (CX-takeover).
Because they write Employee, the generated handlers list `EmployeeAlreadyHired` as a refusal the runtime may raise;
no journey reaches it, since neither move touches the company or the person.

## The rules

| Rule | Whose | Where |
|---|---|---|
| No submit before the promotion's day (`PromotionNotYetDue`, carrying the day), by the world's clock in UTC; the day itself is allowed | HRMS, `before_submit` | `employee-promotion.submit` |
| The same for a transfer (`TransferNotYetDue`) | HRMS, `before_submit` | `employee-transfer.submit` |
| Submit sets the job title (department); cancel puts back the current one, whatever the employee holds then | HRMS, `on_submit`, `on_cancel` through `update_employee_work_history`, which sets `current` without comparing | `submit`, `cancel` |
| The employee works for the named company (`PromotedEmployeeNotInCompany`, `TransferredEmployeeNotInCompany`, `SeparatedEmployeeNotInCompany`) | Capxul's own; HRMS copies `company` from the employee (`fetch_from`) | each `create` |
| A leaver gets no new promotion or transfer (`PromotedEmployeeHasLeft`, `TransferredEmployeeHasLeft`), judged on create only; one drafted before they left can still be submitted and cancelled | CX-expense-leavers. HRMS's form offers only Active employees (`employee_property_update.js`); its promotion's `validate_active_employee` refuses only Inactive, and its transfer calls nothing | `create` |
| The new job title (department) is the company's (`NewDesignationNotInCompany`, `NewDepartmentNotInCompany`) | Capxul's own; HRMS's are site-wide. For a transfer this also keeps it inside its company | `create` |
| The new job title (department) isn't the one held (`DesignationUnchanged`, `DepartmentUnchanged`) | HRMS's property dialog, "Nothing to change", in the browser; here on the server | `create` |
| One open (pending or in process) separation per employee (`SeparationAlreadyOpen`) | Capxul's own; HRMS has no such check | unique rule `employee-separation.oneOpenSeparationPerEmployee` |
| A separation may start for an employee who has already left | HRMS: Employee Separation doesn't judge the employee's status | `employee-separation.create` |
| A separation doesn't relieve the employee | HRMS: nothing in Employee Separation sets the employee Left | `employee.relieve` stays its own call |

On create, the order is: the employee's company, then leaving, then the new value's company, then unchanged. Journeys
pin each pair that can both apply. The new value's company and unchanged can't: a value the employee holds is always
the company's. A separation's company check comes before the rule's refusal at commit, and is pinned too.

## Where the source changed the outline

- **No refusal for a promotion or transfer day before joining.** The outline had one. HRMS at `46b38904` has no bound
  between `promotion_date` or `transfer_date` and `date_of_joining`: neither doctype calls `validate_dates`, and
  `before_submit` only compares with today. So none is refused here.
- **No revert-only-if-unchanged check on cancel.** The outline left it out "unless the source makes it simple". HRMS
  has none: `update_employee_work_history(..., cancel=True)` writes each line's `current` back unconditionally. Capxul
  does the same, and the journeys don't settle a cancel after a later change.
- **A transfer's leaver refusal is stricter than HRMS's server.** HRMS's `EmployeeTransfer` doesn't call
  `validate_active_employee`; only its form filters to Active employees. Capxul refuses on create, as the outline asked,
  following CX-expense-leavers.
- **A separation is submittable in HRMS too.** Its document has draft, submitted and cancelled beside `boarding_status`,
  and submit makes its project. Capxul keeps only `boarding_status` as the machine, as the outline asked; the project and
  tasks that HRMS moves it by are out, so the owner moves it.
- **`resignation_letter_date`** is fetched read-only from the employee in HRMS. Capxul's employee has no such field yet
  (#742, item 5), so the separation takes it as typed.

## Time

The submit rules read the world's clock, so they run against Capxul's stepped local clock (CX-recruitment, Time). One
`prove` run shares that clock across every journey, it never goes back (`host-cloudflare`'s clock refuses `BadMove`),
and journeys run in file-name order. So a journey that moves the clock keeps its days after those of the journeys
before it: `give-interview-feedback` 3 December, `promote-an-employee` 7 December, `transfer-an-employee` 8 December. A clock step also stays within seven days of its journey's start: further, and
every call is refused `NotAllowed`, which looks like the cast's sessions expiring (Better Auth's default lasts seven
days).
The end-to-end journey uses days already due on 1 December and never moves the clock. A new journey that moves the
clock picks days after the last of these, or a name that sorts before them.

## Known limits, left out of 8f

- Grade and branch changes on a promotion or transfer: the employee has no grade or branch field yet.
- Pay on a promotion (`current_ctc`, `revised_ctc`): it waits on payroll (slice 9), in USDC base units.
- Other Employee Property History lines, more than one line per document, and Employee Internal Work History.
- A transfer to another company (`new_company`, `create_new_employee_id`), which in HRMS makes a new employee and
  relieves the old one; and `reallocate_leaves`.
- Amending promotions and transfers, and cancelling a draft (Frappe cancels only submitted documents).
- A separation's activities, template, project and tasks, notifications, exit interview, Exit Interview and Full and
  Final, and cancelling a separation.

## What the checks leave open

A hostile pass tried 18 wrong builds, then reran its survivors after new steps. Three still pass every journey:

- A cancel that puts the old value back only if the employee still holds the new one. HRMS writes it back
  unconditionally, but with two job titles (departments) in the company the two builds agree on every reachable step.
  A third title would settle it, and the outline left it out.
- A submit refused when the employee already holds the new value, under another refusal's name. HRMS has no such
  refusal, and only two drafts to one value, submitted one after the other, would reach it.
- A submit that parses the day in local time. The lint bans `new Date`, and the world runs in UTC.

## Supersedes

- `design/decisions/CX-recruitment.md` (dated, noted in place): "No other handler reads the clock." → "a promotion's and a transfer's submit read it too"
- `examples/capxul/blueprint/environments/local.ts`: "Only interview feedback reads it" → "Interview feedback reads it … and so do a promotion's and a transfer's submit"
