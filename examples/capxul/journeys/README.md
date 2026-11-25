# Capxul's journeys

The journey author writes these files and the starting worlds in `blueprint/starting-worlds/`. The builder never
edits them, the evals or the runner's generic checks (`AGENTS.md`, "Journeys and checks come first"). Each part's
record types are listed in `../doctypes.md`.

## Starting worlds

- `a company`: Ada (signed in) sets up Acme Trading (`AT`, Kenya, USD). It gives `company`.
- `a department`, from `a company`: Ada adds Engineering. It gives `company` and `department`.
- `a team`, from `a department`: Ada adds the job title Engineer. It gives `company`, `department` and `designation`.
- `two companies`, from `a company`: Ada sets up Acme Logistics (`AL`, Uganda, UGX) too. It gives `company` and
  `otherCompany`.
- `three companies`, from `two companies`: Bo sets up Bo Ltd (`BL`, Tanzania, TZS). It gives those and `boCompany`.
- `a branch`, from `three companies`: Ada adds the branch Nairobi to Acme Trading. It gives those and `branch`.
- `two branches`, `three branches` and `four branches`, each from the one before: Ada adds a branch with all 140
  letters a name allows to Acme Trading (`longBranch`), then Nairobi (`otherBranch`) and a name with a lower-case
  start, straight and curly apostrophes, an accent, a slash, two spaces in a row, a word in capitals and Ethiopic
  letters (`oddBranch`) to Acme Logistics. The names, with the digits-only one Bo gives his first
  branch in the journey, are in `blueprint/values/branches-names.ts`.
- `a grade` to `four grades`: the same for grades, from Senior (`grade`, `longGrade`, `otherGrade`, `oddGrade`).
- `an employee`, from `a team`: Ada hires Olga (signed in) as an engineer in Engineering, joining 2026-01-05. It gives
  those and `employee`.
- `kyb started`, from `a company`: Ada starts Acme Trading's KYB with Bridge. It gives `company`, `business`, `kybLink`
  and `tosLink`.
- `kyb approved`, from `kyb started`: Bridge (the system) approves it. It gives `company` and `business`.
- `a bank account`, from `kyb approved`: Ada opens Operating, a US dollar account. It gives `company`, `business`,
  `account`, `bankName`, `accountNumber` and `routingNumber`.
- `two bank accounts`, from `a bank account`: Ada opens Payroll, a euro account, too. It gives those and `payroll`,
  `payrollBankName`, `payrollAccountNumber` and `payrollRoutingNumber`.
- `a reopened account`, from `two bank accounts`: Ada closes Operating and opens a new US dollar account under its name.
  It gives `company`, `business`, `old`, `oldAccountNumber`, and the new `account` with its three details, and `payroll`, the euro account, still open.
- `a transfer sent`, from `a reopened account`: Ada sends 300.25 dollars from the new Operating to `ea_landlord`, under
  the request `rent-december`. It gives `company`, `account`, `payroll`, `transfer` and `transferReference`.
- `bo has an account`, from `two kybs started`: Bridge approves both KYBs and Bo opens Bo Main, a US dollar account,
  the world's first. It gives `company`, `business`, `boBusiness` and `boAccount`.
- `two companies' accounts`, from `bo has an account`: Ada opens Acme Trading's Operating after it. It gives `company`,
  `account` and `boAccount`.
- `two kybs started`, from `kyb started`: Bo sets up Bo Ltd and starts its KYB. It gives Ada's four and `boBusiness`,
  `boKybLink` and `boTosLink`.
- `kyc started`: Ada (signed in) starts her own KYC with Bridge. It gives `individual`, `kycLink` and `tosLink`.
- `two kycs started`, from `kyc started`: Bo starts his own KYC. It gives Ada's three and `boIndividual`, `boKycLink`
  and `boTosLink`.
- `a holiday list`, from `a company`: Ada starts Kenya 2027, from 2027-01-01 to 2027-12-31. It gives `company` and
  `holidayList`.
- `a one-day list`, from `a company`: Ada starts Shutdown, only Monday 2028-08-14. It gives `company` and `holidayList`.
- `a leap fortnight`, from `a company`: Ada starts Leap fortnight, 2028-02-22 to 2028-03-07, across a leap day. It gives
  `company` and `holidayList`.
- `a sunday holiday`, from `a holiday list`: Ada makes Sunday 2027-01-03 a holiday, Founders' Day. It gives `company`,
  `holidayList` and `holiday`.
- `an attendance`, from `an employee`: Ada marks Olga absent on Tuesday 2026-11-24. It gives `company`, `employee` and
  `attendance`.
- `an attendance request`, from `an attendance`: Olga asks to work from home from Monday 2026-11-23 to Friday 2026-11-27.
  It gives those and `attendanceRequest`.

- `a job opening`, from `an employee`: Ada opens Backend Engineer, under Engineer, for two. It adds `jobOpening`.
- `a job applicant`, from `a job opening`: Pat Mwangi applies, as pat@example.com. It adds `jobApplicant`.
- `an interview round`, from `a job applicant`: Ada adds the round Technical, with Olga. It adds `interviewRound`.
- `a second employee`, from `an interview round`: Ada hires Cy (signed in) as an engineer, joining 2026-06-01. It adds
  `secondEmployee`.
- `an outside company`, `an outside department` and `an outside employee`, each from the one before: Ada sets up Acme
  Logistics, adds Logistics to it, and hires Bo (signed in) there as a driver. They add `otherCompany`,
  `otherDepartment` and `outsider`: an employee of Ada's, but not at Acme Trading.
- `an interview`, from `an outside employee`: Ada schedules Pat's Technical with Olga and Cy on Thursday 2026-12-03, ten
  to eleven. It adds `interview`.
- `a second job title`, from `an outside employee`: Ada adds the job title Lead Engineer to Acme Trading. It adds
  `otherDesignation`.
- `a technical round`, from `an employee`: Ada adds the round Technical, with Olga, before any job is open. It adds
  `interviewRound`.
- `a second department`, from `a second job title`: Ada adds Platform to Acme Trading. It adds `secondDepartment`.
- `a new hire`, from `a second department`: Ada hires Dee Otieno (signed in) as an engineer in Engineering, joining
  2026-02-02. It adds `newHire`.
- `a promotion`, from `a second department`: Ada drafts Olga's promotion from Engineer to Lead Engineer, from Monday
  2026-12-07. It adds `employeePromotion`.
- `a transfer`, from `a promotion`: Ada drafts Olga's transfer from Engineering to Platform, from Tuesday 2026-12-08. It
  adds `employeeTransfer`.
- `a second promotion` and `a second transfer`, each from the one before: the same for Cy, from 2026-12-01, the day the
  world's clock starts. They add `secondPromotion` and `secondTransfer`.
- `a separation`, from `a second transfer`: Ada starts Olga's separation, from her letter of 2026-11-20, beginning
  2026-12-01. It adds `employeeSeparation`.
- `a kra`, from `a new hire`, then `a second kra`, `a feedback criteria`, `a second feedback criteria`, `an outside kra`,
  `an outside criteria`, each from the one before: Ada adds the KRAs Quality and Development and the criteria Problem
  Solving and Excellence to Acme Trading, and a KRA and a criteria to Acme Logistics, her other company. They add `kra`,
  `otherKra`, `criteria`, `otherCriteria`, `outsideKra` and `outsideCriteria`.
- `an appraisal template`, from `an outside criteria`: Engineers, Quality 30 and Development 70, rated on Problem
  Solving 70 and Excellence 30. It adds `appraisalTemplate`.
- `an appraisal cycle`, from `an appraisal template`: H2 2026, scored from goals, appraising Olga then Cy by Engineers;
  not started. It adds `appraisalCycle`. `a three-person cycle`, from it: Q1 2027, rated by hand, adding Dee; not
  started. It adds `threePersonCycle`.
- `a started cycle`, from `an appraisal cycle`: Ada starts H2 2026. It adds `appraisal` (Olga's) and `secondAppraisal`
  (Cy's).
- `a goal`, from `a started cycle`: Olga's Quality goal at 0. It adds `goal`. `a feedback draft`, from it: Cy's draft on
  Olga's appraisal, 0.8 and 0.7. It adds `feedbackDraft`. `a colleague's goal`, from it: Cy's Development goal at 50.
  It adds `secondGoal`.
- `a manual cycle` and `a started manual cycle`, from `a colleague's goal`: H1 2027, rated by hand, started. They add
  `manualCycle`, `manualAppraisal` (Olga's) and `secondManualAppraisal` (Cy's).
- `an outside template`, from `a started manual cycle`: Ada's Drivers, in Acme Logistics. It adds `outsideTemplate`.
- `a newcomer's draft`, from `an outside template`: Dee's draft on Cy's H2 2026 appraisal, 0.5 and 0.5. It adds
  `deeDraft`. `a manual cycle draft`, from it: Cy's draft on Olga's H1 2027 appraisal, 0.4 and 0.9. It adds
  `manualDraft`.

Capxul's local world's clock stands at Tuesday 2026-12-01 09:00 UTC until a journey moves it. One `prove` run shares
that clock across every journey, it never goes back, and journeys run in file-name order, so a journey that moves it
keeps its days after those of the journeys before it (`give-interview-feedback` 3 December, `promote-an-employee`
7 December, `transfer-an-employee` 8 December; a clock step stays within seven days of its journey's start, as the cast's
sessions seem to last seven days (snag #1001); `decisions/CX-employee-moves.md`); a world adds its keys to
what the worlds before it gave.

A world can hand on only the answer of its latest call (`s.last`), so most add one record; `two kybs started` and
`a reopened account` make two calls and hand on what the first gave through the second's payload or the world.

## Journeys

| Journey | World | Cast | What it proves |
|---|---|---|---|
| `set-up-a-company` | none | Ada, Bo (signed in) | `company.create` answers a `com_` id, emits `CompanyCreated` with the caller as owner and leaves it `active`, with the `company.create.insert` span. Each reads back exactly the values they typed (two companies, every field different), and neither can read the other's (`NotAllowed`) |
| `companies-are-kept-apart` | `a company` | Ada (owner), Bo (signed in) | Ada can't reuse her own company's name (`CompanyNameTaken`) or abbreviation (`CompanyAbbrTaken`), and her second company, under other names, reads back as she typed it. Bo may use both for his own, and Ada's company is left as it was, hers |
| `set-up-departments-and-job-titles` | `a company` | Ada (owner), Bo (signed in) | `department.create` and `designation.create` answer `dep_` and `dsg_` ids, emit `DepartmentCreated` and `DesignationCreated` with the company, and leave each `active`. Two of each read back under their own names. A name taken in the company is refused (`DepartmentNameTaken`, `DesignationNameTaken`). Bo can't add to Ada's company or read hers (`NotAllowed`), but his own company may reuse her department's name |
| `hire-an-employee` | `a team` | Ada (owner), Olga, Bo (signed in) | `employee.hire` answers an `emp_` id, emits `EmployeeHired` with the company and the person hired, and leaves it `active`, with the `load` and `insert` spans. Hiring Olga twice is refused `EmployeeAlreadyHired`, and a joining day before the birthday `JoinedBeforeBorn`, neither reaching `insert`. Bo can't hire into Ada's company or read Olga's record. Olga reads every field Ada typed. Ada may hire Bo on his birthday itself (ERPNext v15 allows the same day), and reads back every field she typed for him |
| `another-companys-department-is-refused` | `a team` | Ada (owner), Olga, Bo (signed in) | Bo's own company's department can't be used to place Olga in Ada's company (`DepartmentNotInCompany`, after `load`, before `insert`) |
| `another-companys-job-title-is-refused` | `a team` | Ada (owner), Olga, Bo (signed in) | The same for a job title (`DesignationNotInCompany`) |
| `an-employee-leaves` | `an employee` | Ada (owner), Olga (signed in) | Ada reads Olga's record as the company's owner. Olga can't relieve herself (`NotAllowed`). A relieving day before the joining day is refused `RelievedBeforeJoined`, and she stays `active`. `employee.relieve` answers and emits `EmployeeRelieved` with the day, and leaves her `left`. A second relieve is refused by the machine (`state: left`). Olga still reads her old record, every field unchanged but its state. Ada may hire her again as a new employee while the old one stays `left`. The new one can't be relieved the day before rejoining (`RelievedBeforeJoined`, carrying the new joining day) but can on that day itself |
| `set-up-branches` | `a company` | Ada (owner), Bo (signed in) | `branch.create` answers a `brn_` id, emits `BranchCreated` with the company and leaves it `active`, with the `insert` span; it reads back as typed. Bo can't add to Ada's company or read hers (`NotAllowed`) |
| `branch-names-are-the-companys` | `four branches` | Ada (owner of two), Bo (owner of one) | A name taken in either of Ada's companies is refused (`BranchNameTaken`). Bo can't add to Ada's company. Bo adds his company's first branch, named with digits alone; it reads back whole, Ada can't read it, and he can't read hers. Then every branch the worlds made reads back exactly, in its own company, and all three companies read back unchanged: a create that changes any earlier record or company fails here |
| `set-up-grades` | `a company` | Ada (owner), Bo (signed in) | The same for `employee-grade.create`: an `egr_` id, `EmployeeGradeCreated` with the company, `active` |
| `grade-names-are-the-companys` | `four grades` | Ada (owner of two), Bo (owner of one) | The same for grades (`EmployeeGradeNameTaken`) |
| `bridge-start-a-kyb` | `a company` | Ada (owner), Bo (signed in) | `bridge-business.start` answers a `kyb_` id and two `https://` pages, Bridge's KYB form and its terms, which differ; emits `KybStarted` with the company, leaves it `started`, with the `insert` span. Bo can't start one for Ada's company or read hers (`NotAllowed`). A second start is refused `KybAlreadyStarted`. It reads back as she typed it |
| `bridge-kyb-is-decided-by-bridge` | `two kybs started` | Ada (owner), Bo (signed in), Bridge (the system) | Only Bridge decides: Ada can't approve her own, Bo can't turn his down (`NotAllowed`). Before approval no account opens (`KybNotApproved`, after `load`, before `insert`). Bridge approves (`KybApproved`, `approved`); an approved KYB can't be approved or turned down again (`notFrom`). Bridge turns Bo's down with its reason (`KybRejected`, `rejected`), which can't then be approved and opens no account; Bo reads his back whole against the world, his form and terms differing. Ada's reads back approved, every field as it was started, the links as `start` gave them |
| `bridge-a-rejected-kyb-keeps-what-bridge-gave` | `kyb started` | Ada (owner), Bridge (the system) | Bridge turning the KYB down (`KybRejected`, with its reason) changes no field but the state |
| `bridge-a-person-is-checked` | none | Ada, Bo (signed in), Bridge (the system) | The system can't start a KYC. `bridge-individual.start` answers a `kyc_` id and two differing `https://` pages, emits `KycStarted` with the caller as the person, `started`. Bo can't read Ada's, Ada can't approve herself (`NotAllowed`), a second start is `KycAlreadyStarted`. Bridge approves her (`KycApproved`) and she reads it back as typed; Bridge turns Bo down with its reason (`KycRejected`), which can't then be approved, and he reads his back as he typed it |
| `bridge-a-kyc-keeps-what-bridge-gave` | `kyc started` | Ada (the person checked), Bridge (the system) | Ada's KYC reads back with the form and terms `start` gave her, and Bridge's decision (`KycRejected`) changes no other field |
| `bridge-an-approved-kyc-keeps-what-bridge-gave` | `kyc started` | Ada (the person checked), Bridge (the system) | Bridge's approval (`KycApproved`) changes no field but the state: every field reads back as `start` gave it |
| `bridge-two-kycs-are-each-their-own` | `two kycs started` | Ada, Bo (each the person checked) | Bo's KYC reads back whole against what his `start` answered, form and terms differing, and Ada's is unchanged by his. Ada can't read his (`NotAllowed`) |
| `bridge-open-a-bank-account` | `kyb approved` | Ada (owner), Bo (signed in) | Bo can't open an account on Ada's company. `bank-account.open` answers a `bac_` id and a bank's own deposit details: for USD an account number and an ABA routing number passing 3-7-1, for EUR an IBAN passing mod 97 and a BIC of its country. It emits `BankAccountOpened` with the company, the KYB and the currency, `open`, with the `load` and `insert` spans. Bo can't read it. A second open account by the same name is `BankAccountNameTaken`. The second account reads back as itself |
| `bridge-a-bank-account-closes` | `two bank accounts` | Ada (owner), Bo (signed in) | The account reads back with every detail `open` answered. Bo can't close it. Ada closes it (`BankAccountClosed`, `closed`, the `update` span), not twice (`notFrom`). Its name is then free for a new account, and the old one stays closed with its details. The euro account reads back with the IBAN and BIC it was opened with |
| `bridge-a-reopened-account-is-its-own` | `a reopened account` | Ada (owner) | An account opened under a closed one's name reads back with every detail its own opening answered, and the old one stays closed with its own number |
| `bridge-a-deposit-lands` | `two bank accounts` | Ada (owner), Bo (signed in), Bridge (the system) | Only Bridge reports a deposit (`NotAllowed` for Ada). `bank-transaction.land` answers a `btx_` id and emits `DepositLanded` with the deposit in USDC base units (1,250.50 dollars is 1250500000), `settled`. It reads back with the account's company and currency, nothing withdrawn; Bo can't read it. The same deposit reported again, or a day later, is `AlreadyRecorded`. One millionth of a dollar is 1 and reads back as itself; 1.005 is exactly 1005000 and 9007199254.740993 exactly 9007199254740993, which a float gets wrong; six places on Payroll read back in EUR. Each account lists only its own deposits, each once |
| `bridge-send-money-out` | `a reopened account` | Ada (owner), Bo (signed in) | Bo can't send. The closed account is `AccountClosed`, judged first; a currency the account doesn't hold is `CurrencyNotHeld`, judged before the amount; 0 and less are `NothingToSend`, but one millionth is sent. `bank-transaction.send` emits `TransferSent` with the withdrawal in exact base units, `pending`; a second transfer has its own reference, and the account lists both. Payroll pays in euros with six places |
| `bridge-a-transfer-is-paid-or-returned` | `a transfer sent` | Ada (owner), Bo (signed in), Bridge (the system) | The transfer reads back pending with the reference it was given; the same request again is the same transfer and inserts nothing. Only Bridge settles or fails one, and it moves that one alone: failing the refund leaves the rent pending, and paying the rent leaves three others as they were. Failed or paid once, it can't move again. A transfer is dated by the world's clock in UTC: at 23:30 the same day, after midnight the next. Paid a day later, the rent keeps the day it was sent. This is the one Bridge journey that moves the clock (CX-bridge) |
| `bridge-each-companys-money-is-its-own` | `two companies' accounts` | Ada, Bo (each an owner), Bridge (the system) | A deposit and a transfer on Acme Trading's account, opened after Bo's, are Acme Trading's: Ada reads them, Bo can't; Bo's deposit is his, and Ada can't read it |
| `bridge-a-bank-account-end-to-end` | none | Ada, Bridge (the system) | K42 §6's bank account journey: Ada's KYC through Bridge's link, Bridge's approval, read back; her company, its KYB, approved; a US dollar account with a bank's own details; a deposit landing, read back; a transfer out, Bridge's word it was paid, read back; the account listing both, each once |
| `set-up-a-holiday-list` | `a company` | Ada (owner), Bo (signed in) | `holiday-list.create` answers an `hls_` id, emits `HolidayListCreated` with the company, leaves it `active`, with the `insert` span. It reads back as typed with no holidays. An end before its start, one day back across a year's end and one inside a month, is `HolidayListEndsBeforeStart` (carrying `fromDate`, before `insert`); a name taken in the company is `HolidayListNameTaken`. Bo can't read it or start one in Ada's company (`NotAllowed`). A one-day list is allowed and reads back as itself |
| `add-holidays` | `a holiday list` | Ada (owner), Bo (signed in) | `holiday.add` answers a `hol_` id and the list's new count, emits `HolidayAdded`, `active`, with the `load` and `insert` spans. The list's first and last days may be holidays; the day before and the day after are `HolidayOutsideList` (carrying both ends, after `load`, before `insert`). A day held already is `HolidayDateTaken`. Bo can't read or add (`NotAllowed`). Each reads back as typed, and the list counts two |
| `weekly-offs` | `a sunday holiday` | Ada (owner), Bo (signed in) | `holiday-list.add-weekly-off` makes every given weekday between the list's ends a holiday: Sunday adds 51 (2027 has 52, one held already, which keeps its name), Friday 53 (2027 starts and ends on one), and Friday again adds 0, each with `WeeklyOffAdded` and the exact total. The days it added are then taken, first, middle and last; another weekday's day isn't. Bo can't run it (`NotAllowed`) |
| `a-one-day-list` | `a one-day list` | Ada (owner) | On a list of one day, the day before and the day after are `HolidayOutsideList`; Sunday adds 0 and Monday adds its one day, total 1; that day is then `HolidayDateTaken`, and the list counts one. A check on the year alone, or a walk past `toDate`, fails here |
| `every-weekday` | `a leap fortnight` | Ada (owner) | Each of the seven weekdays is made a weekly off once on a fifteen-day list across 29 February: Tuesday adds 3 (the leap day among them), every other weekday 2, totals 3, 5, 7, 9, 11, 13 and 15. The leap day and the first, second and fourth of March are then taken. A wrong weekday table or a walk that skips the leap day fails here |
| `set-up-employment-types` | `three companies` | Ada (owner of two), Bo (owner of one) | `employment-type.create` answers an `ety_` id, emits `EmploymentTypeCreated` with the company, `active`, with the `insert` span. Two read back under their own names, one in lower case as typed; a name taken in the company is `EmploymentTypeNameTaken`. Bo can't add to Ada's company or read hers, and each company may reuse the name |
| `set-up-shift-types` | `three companies` | Ada (owner of two), Bo (owner of one) | `shift-type.create` answers an `sht_` id, emits `ShiftTypeCreated`, `active`. Each reads back with its times: a night shift ending at six, one a minute long, one exactly twelve hours long, ones ending and starting at midnight, a sixteen-hour shift, a fourteen-hour one overnight, and a name in lower case kept as typed. HRMS's check-in buffers, which refuse a shift of 22 hours or more at their defaults, come with check-ins. A start equal to its end, midnight too, is `ShiftStartsWhenItEnds` (before `insert`, and before a taken name); a taken name is `ShiftTypeNameTaken`. Bo can't add to Ada's company |
| `mark-attendance` | `an employee` | Ada (owner), Olga, Bo (signed in) | `attendance.mark` answers an `att_` id and emits `AttendanceMarked` with the employee, day and status, `marked`, with the `load` and `insert` spans. Each of the four statuses reads back. A day marked already is `AttendanceAlreadyMarked`, even with another status. The day before joining, a year's last day and a day later in its month a year earlier are `AttendanceBeforeJoining` (carrying the joining day), whatever the status; the joining day and a day still to come are allowed. Only the owner marks. The list holds every day as marked. A second employee joining later is judged by his own joining day, and may be marked on a day Olga was |
| `request-attendance` | `an employee` | Ada (owner), Olga, Bo (signed in) | `attendance-request.create`, by the employee or the owner, answers an `arq_` id, emits `AttendanceRequested`, `draft`, and reads back as typed. An end before the start, across a day, a month and a year, is `RequestEndsBeforeStart` (carrying `fromDate`); a start before joining is `RequestBeforeJoining`, for either reason, judged after the dates' order. The joining day and days still to come are allowed. A draft marks nothing |
| `approve-an-attendance-request` | `an attendance request` | Ada (owner), Olga, Bo (signed in, then hired) | Only the owner approves. Approving marks every day of the request, Work From Home or Present by its reason: new days are `marked`, a day with another status is `changed` (the same attendance), whatever its status, under either reason; a day with the same status is left, Present under On Duty too; days outside the request stay as they were. It can't be approved or rejected again, and its days can't be marked again. A coworker's attendance on a day the request covers is left alone. Requests across a weekend (for either reason), a month's end, a year's end, a February with no leap day and a leap day mark exactly their days, and a forty-day request marks all forty |
| `reject-an-attendance-request` | `an attendance request` | Ada (owner), Olga, Bo (signed in) | Only the owner rejects (`AttendanceRequestRejected`, `rejected`, the `update` span). A rejected request can't be approved or rejected again, marks nothing, and leaves every day in its range as it was, one already working from home too |
| `attendance-stays-in-its-company` | `an attendance request` | Ada (owner), Olga, Bo (signed in) | Ada's own second company can't mark Olga or take a request for her, and neither can Bo's company (`AttendeeNotInCompany`, `RequesterNotInCompany`, judged first), whatever the status or reason. Once she has left, a new attendance or request is `AttendeeHasLeft` or `RequesterHasLeft`, judged before the dates; the request she made before leaving is still approved, and every day it marks is hers, in Ada's company |
| `open-a-job` | `a job applicant` | Ada (owner), Olga, Bo (signed in) | `job-opening.create` takes its company from the job title, answers a `jop_` id, emits `JobOpeningCreated` with the vacancies, `open`, and reads back as typed; only the owner opens or reads one, and none is opened for nobody (`OpeningWithoutVacancies`); one person is enough. An email may apply again, to the same opening or another, and an applicant takes the opening's company; only the owner adds or reads one. The owner closes an opening that hasn't filled (`JobOpeningClosed`, `closed`); it can't be closed again, takes no new applicant (`OpeningClosed`), and those already in stay open, and may still be offered the job and accepted |
| `make-a-job-offer` | `a second job title` | Ada (owner), Bo, Olga (signed in) | An applicant is accepted only once their own offer is accepted (`OfferNotAccepted` with none, one awaiting, one rejected, or another applicant's accepted). Only the owner offers; a job title of Ada's other company is `OfferDesignationNotInCompany`. One offer per applicant in every state (`OfferAlreadyMade`). Accepting or rejecting an offer answers its applicant, and can't be done twice, nor by anyone but the owner; the applicant's accept (from hold) and reject (from hold, and by the owner only) follow as a second call (#972). An offer may be any job title of the applicant's company, and an applicant on hold may accept one. Offers and applicants read back as made |
| `set-up-interview-rounds` | `an outside employee` | Ada (owner), Bo, Olga, Dee (signed in) | `interview-round.create` answers an `irn_` id, emits `InterviewRoundCreated`, and reads back with its interviewers in the order given, none too. Its name is the company's (`RoundNameTaken`); Acme Logistics and Dee's company may reuse it. An interviewer from Ada's other company is `RoundInterviewerNotInCompany` wherever they stand; a leaver is `RoundInterviewerHasLeft` wherever they stand, after the company check; a round made before she left keeps her |
| `schedule-an-interview` | `an outside employee` | Ada (owner), Bo, Olga (signed in) | `interview.create` answers an `ivw_` id, emits `InterviewScheduled`, `pending`, and reads back with its interviewers in order. Refusals, each pinned before the next: `ApplicantRejected`, `RoundNotInCompany` (a round of Ada's other company), `InterviewEndsBeforeStart` (the same minute, a quarter hour back within an hour, past midnight), `InterviewerNotInCompany` and `InterviewerHasLeft` wherever they stand. One interview per applicant per round, also once it is rejected (`InterviewAlreadyScheduled`). An applicant on hold may be interviewed. A leaver is refused on a day already past, and at a round that lists her. A rejected applicant is refused before a round of another company. Only the owner clears or rejects, once; a minute-long interview, a day already past and one still to come are allowed |
| `give-interview-feedback` | `an interview` | Ada (owner), Olga, Cy, Bo (signed in) | Only an interviewer gives feedback, as themselves (`NotAllowed` for Ada and Bo; `FeedbackGiverNotInterviewer` for an employee not on it, judged before the day). Nothing before the interview's own day by the world's clock, to the last second of the eve (`FeedbackBeforeInterview`, carrying that interview's day); the day itself is allowed. One per interviewer per interview (`FeedbackAlreadyGiven`), but one on another interview is allowed. Feedback doesn't decide the interview. A leaver still gives feedback on a pending interview she was on, and feedback may be given on an interview already cleared. Each reads back as given, by the giver or the owner |
| `hire-from-a-job-opening` | `a technical round` | Ada (owner), Olga, Pat (signed in) | The whole way: an opening, Pat's application, an interview the same day, Olga's feedback, the interview cleared, an offer, its acceptance, Pat accepted (the second call, #972), the opening closed and Pat hired. Each step reaches the record the one before it made or read |
| `promote-an-employee` | `a second transfer` | Ada (owner), Olga, Cy, Bo (signed in) | A promotion copies the employee's job title as its current one and reads back a draft, to the owner and the employee only. It isn't submitted before its day by the world's clock, to the last second of the eve (`PromotionNotYetDue`); on the day itself it is, and the employee reads back the new title, in the same department. It can't be submitted twice or cancelled as a draft. A new draft copies the title held now, and the title held is refused (`DesignationUnchanged`). Cancelling puts the old title back. The refusals on create, in order: `PromotedEmployeeNotInCompany`, `PromotedEmployeeHasLeft`, `NewDesignationNotInCompany`, `DesignationUnchanged`. A promotion drafted before the employee left is still submitted |
| `transfer-an-employee` | `a second transfer` | Ada (owner), Olga, Cy, Bo (signed in) | The same for a department, from 8 December (`TransferNotYetDue`, `DepartmentUnchanged`, `TransferredEmployeeNotInCompany`, `TransferredEmployeeHasLeft`, `NewDepartmentNotInCompany`); another company's department is refused, so a transfer stays in its company |
| `run-a-separation` | `a separation` | Ada (owner), Olga, Bo (signed in) | A separation reads back pending, to the owner only, and the owner marks it in process, then completed, or completes it straight from pending; none of those twice. One open separation per employee (`SeparationAlreadyOpen`), judged after `SeparatedEmployeeNotInCompany`; once completed, another may start. Completing one doesn't relieve the employee, and one may start for an employee who has already left. Only the owner moves one |
| `move-an-employee-through-the-company` | `a new hire` | Ada (owner), Dee (signed in) | End to end: Dee is hired, promoted, transferred, separated and then relieved, and reads herself back after each step |
| `set-up-kras-and-criteria` | `three companies` | Ada (owner of two), Bo (owner of one) | `kra.create` and `employee-feedback-criteria.create` answer `kra_` and `efc_` ids, emit their events with the company, `active`. Each reads back as typed. A title taken in the company is `KraTitleTaken` or `CriteriaNameTaken`; another company may reuse it. Bo can't add to Ada's company or read hers |
| `set-up-appraisal-templates` | `an outside criteria` | Ada (owner), Bo (signed in) | `appraisal-template.create` answers an `apt_` id and reads back with its lines in order. Every refusal, and the order between each pair: no KRA lines, a KRA or criteria of another company, a line repeated, a weightage of 0 or over 100, KRA weightages not totalling 100 (99.99 and 100.01), criteria not totalling 100; none is allowed. A title taken is `TemplateTitleTaken`. Bo can't make or read one |
| `run-an-appraisal-cycle` | `a three-person cycle` | Ada (owner), Olga, Bo (signed in) | A cycle's create refusals in order (end before start, an appraisee outside the company, one who has left, a template outside, one listed twice; one day allowed; `CycleNameTaken`). Start refuses a cycle without appraisees, makes one appraisal per appraisee with the template's lines and the cycle's method, skips one that exists and a leaver. Complete waits on every appraisal (`AppraisalsNotSubmitted`, carrying the drafts); reopen goes back. Olga reads only her own; Bo and Olga move nothing |
| `set-and-track-goals` | `a started manual cycle` | Ada (owner), Olga, Cy, Dee, Bo (signed in) | Goals by the employee or the owner, their status from progress, archive, close, unarchive, reopen and complete. A group's progress follows its children two levels up, archived children left out, closed ones kept; its status follows only by `goal.roll-up` (#972), which refuses a goal that isn't a group and a completed cycle. Under the automated method the appraisal's KRA scores and total follow top-level goals; under manual rating they don't. Every refusal and its order, a leaver's old goal still moving, a completed cycle refusing every move |
| `rate-an-appraisal` | `a manual cycle draft` | Ada (owner), Olga, Cy, Dee, Bo (signed in) | Rating by hand: the owner only, not an automated appraisal, each KRA once, 0 to 5, half-up rounding (1.275 → 1.28). Self-rating by the employee only, each criteria once, 0 to 1. Scores against HRMS's own test numbers. A second appraisal in a cycle is `AppraisalAlreadyExists`; create's refusals in order. Submit by the owner, then nothing moves. A leaver's open appraisal is still rated and submitted, but no new one is made |
| `give-performance-feedback` | `a manual cycle draft` | Ada (owner), Olga, Cy, Dee, Bo (signed in) | Feedback by the reviewer only, never on oneself, never from another company, each criteria once, 0 to 1. The average covers submitted feedback only (3.025 → 3.03) and moves the final score; one reviewer may give two. A cycle not started takes feedback. A leaver submits her draft but starts none. A completed cycle refuses submit and create, judged first |
| `appraise-a-year` | `a second feedback criteria` | Ada (owner), Olga, Cy, Bo (signed in) | End to end: a template, a cycle scored from goals, its start, a goal tree whose group's progress follows its children and whose status follows by `roll-up`, feedback, a self rating, submit, `AppraisalsNotSubmitted` while one is a draft, complete, and every score read back. Goals no longer move |

## Where the docs were silent

- **Who runs a company.** ERPNext splits company-wide rights among roles (System Manager, Accounts
  Manager, HR Manager and the rest). Until Capxul has its own seats, the person who set the company up holds them all as
  the `owner` role on Company. Other things admit it through `owner.of("company")` on a create or a read, and
  `owner.of("<thing>.company")` on an operation that names the thing.
- **Currency.** `defaultCurrency` is three capital letters, an ISO 4217 code by shape only, held as text until a company's currency is an asset in
  Orthograph's money (`decisions/CX-grill.md`, section 3).
- **Unique names.** ERPNext keeps a company's name and abbreviation unique across a site, which is one customer. Capxul's
  companies are separate organisations (K42, call 10), so both rules hold among one owner's companies: nobody can block
  another's name, and a refusal never tells anyone another company exists.
- **Country.** `country` is free text until Capxul takes ERPNext's Country list in.
- **What a journey can't see.** A call that writes a row it shouldn't, such as a second company, passes every journey
  here, because no answer carries its id. That needs a generic check in `prove` (snag #759).
  The same holds across journeys: a handler that keeps state in memory between calls can change a record an earlier
  journey made, which no later step reads (the Branch and Grade hostile pass, round 3). That too needs `prove`.
- **Department and Designation per company.** ERPNext shares one list of job titles across a site. Capxul's companies
  are separate organisations, so each keeps its own, unique by name within the company. ERPNext's tree of departments
  (`parent_department`) waits on optional references (#742, item 5).
- **Employee.** ERPNext's `user_id` is `person`, the account the employee signs in with. ERPNext leaves it, the
  department and the designation optional; they are required here until things have optional fields (#742). The
  states are `active` and `left`; Inactive and Suspended come with the moves that reach them. The relieving day travels
  in `EmployeeRelieved`, because an employee still at work has none to store. Days are `YYYY-MM-DD` text until
  Orthograph has a day value (#742, item 5).
- **A read's role path.** On a read, `owner.of(...)` walks from the record itself, so it is `owner.of("company")`, not
  `owner.of("employee.company")`, which admits nobody (snag #761).
- **Step titles.** A title never repeats text the step's payload sends, because the title is a span attribute and the
  answer-shape eval refuses untraced payload text there.
- **The day rules.** ERPNext v15 checks `validate_from_to_dates` from birthday to joining day and from joining day to
  relieving day. It refuses only a later day before an earlier one, so the same day is allowed both times. Its
  "Date of Birth cannot be greater than today" waits until a handler can read today's day.
- **One active place per company.** ERPNext lets a person hold one active Employee per site (its `user_id` is unique).
  Capxul's companies are separate organisations, so it's one per company: someone may work for two Capxul companies.
- **Names.** `firstName` is ERPNext's one required name. The journeys put a whole name in it ("Olga Petrova") so that no
  step title, which names the cast, repeats it. Middle and last names come with optional fields (#742).
- **Bridge is Capxul's.** Every company's KYB, every person's KYC and every bank account go through Capxul's own Bridge
  account; no company connects its own (CX-grill, section 4). No ERPNext doctype has KYC or KYB, so `BridgeBusiness`
  and `BridgeIndividual` are Capxul's. `BankAccount` is ERPNext's Bank Account, opened as a Bridge virtual account.
  Which parts are paid is decided later and gates nothing here.
- **Who speaks for Bridge.** Only Bridge approves or turns down a KYC or a KYB. Until Capxul mounts the Bridge adapter
  and its webhook door, its reports arrive as the system's calls (`Blueprint.system`, the cast's `bridge`), and nobody
  else may make them. When the door lands, the journeys keep their steps and the door's events take the system's place.
- **Bridge's states.** Bridge's `kyc_status` has ten values; Capxul keeps `started`, `approved` and `rejected`, the three a
  company acts on. A virtual account is `activated` or `deactivated`, here `open` and `closed`.
- **Deposit details.** Bridge gives them per currency (`source_deposit_instructions`). The journeys judge that they are a
  bank's (#912, `support/deposit-details.ts`): for USD a 4 to 17 digit account and an ABA routing number (an assigned
  prefix, the 3-7-1 checksum); for EUR an IBAN of a registry country, of its length, passing mod 97, and a BIC in that
  country. And a read gives back what `open` answered, never fixed values, since the stand-in or Bridge chooses them;
  that they equal what Bridge issued waits on #995. No two accounts, open or closed, share them
  (`oneAccountPerNumber`: the account number or IBAN alone), since Bridge routes a deposit by it. A clash is the handler's bug, so the rule names no
  refusal. Only USD and EUR are declared until a check judges each other currency Bridge takes.
- **A decision changes only the state.** After every move (approve, reject, close) a journey reads the whole record
  back against what `start` or `open` answered, kept in a starting world, because `s.last` holds only the latest answer.
- **One form per customer.** Bridge's hosted form belongs to one customer, so no two KYBs or KYCs share one
  (`oneKybPerForm`, `oneKycPerForm`, with no refusal: a clash is the handler's bug).
- **Where the Bridge things live.** CX-grill section 4 puts Bridge's features in their own plugin folder, so gating them
  later is a mount. They are in `blueprint/things/` until Capxul can mount a plugin of its own (the adapter's pull request
  and slice 11's mounting); moving them there is part of that work.
- **A turned-down KYB or KYC stays turned down.** One per company or person holds in every state, so a rejected one
  can't be started again. Retrying comes with Bridge's other states, in part two.
- **Holiday lists.** ERPNext's Holiday List names a list by its name, so it is unique per company here. Its child table
  Holiday is its own thing, one row per day, unique within the list (`validate_duplicate_date`); `total_holidays` is
  the count of those rows. `get_weekly_off_dates` adds one weekday's days between the ends and skips days already held.
  ERPNext's `weekly_off` flag waits on booleans that round-trip (#742, item 2); colours and a country's public holidays
  wait on optional fields and a holiday source. A weekly off's description (its weekday) isn't checked until a list's
  holidays can be listed (#764). Deleting a day comes with a move that ends one.
  A list's span has no upper limit, as in ERPNext; a weekly off costs at least a store read or two per day it adds (snag #920, at commit), plus a lookup per day of the
  span when the list already holds days, so a
  list of many years is slow until that lands. A weekly off emits one `WeeklyOffAdded` with its count and total, not a
  `HolidayAdded` per day, as ERPNext saves those rows in one go.
- **Bridge, part two.** Not checked yet, each waiting on #995 (`decisions/CX-bridge.md`, last section): the call to
  Bridge as a step in each operation, Bridge's webhooks arriving signed through its door and moving the records, the
  relay of the deposit details the stand-in issued, a transfer's `Idempotency-Key` held across a retry, a deposit's
  later activity events leaving its one Bank Transaction settled and none refused, and Bridge's other KYC states. A
  business's associated persons wait on #992. Help with incorporation is left out. Those checks come in a second author
  pull request on this slice.
- **Bank Transaction.** ERPNext's Bank Transaction, one movement on a company's bank account: a deposit Bridge lands
  (`land`, `settled`) or a transfer out (`send`, `pending`, then Bridge's `settle` or `fail`). `deposit` and `withdrawal`
  are USDC base units, one of them 0; Bridge's amounts are dollars with up to six places (`Dollars`), turned into base
  units exactly. One transaction per `reference`, Bridge's id for the movement (a deposit's `deposit_id`, a transfer's
  `id`), so a report made again is `AlreadyRecorded`: keyed on the webhook's `event_id`, one deposit's three activity
  events would count three times (CX-bridge). `send` refuses `AccountClosed`, then `CurrencyNotHeld`, then
  `NothingToSend`, and dates a transfer by the world's clock, in UTC. A read's answer carries no id, so `a transfer sent` hands
  on the transfer for the journey that settles and fails it.
- **Branch and Employee Grade.** ERPNext's Branch is one name (`branch`) and HRMS's Employee Grade is named by the user,
  each unique across a site; here each is unique within a company, as departments and job titles are, so one owner's
  two companies may share one. A grade's three fields (`default_salary_structure`, `default_base_pay` and its
  `currency`, fetched from the structure) come with Salary Structure in payroll (slice 9), so neither needs record
  listing (#764) or the company's currency (#882). Employee's own `branch` and `grade` links wait on optional
  references (#742); until then no employee names either. A journey hands on only its latest answer, so the records
  read back after a later create come from starting worlds, each name journey makes its one create (Bo's) after them,
  and each set-up journey makes only one.
- **Attendance and leavers.** HRMS's `validate_active_employee` and `validate_employee_status` refuse only an Inactive
  employee, which Capxul's employees can't be, so HRMS lets a Left employee be marked. Attendance follows
  `decisions/CX-expense-leavers.md`, stricter than HRMS: a new attendance or request for an employee who has left is
  refused (`AttendeeHasLeft`, `RequesterHasLeft`), even for a day they were at work, and a request opened before they
  left can still be approved and mark its days. Payroll (slice 9) revisits it. HRMS's relieving-day bound on a request waits on a stored
  relieving day (#742, item 5).
- **A day still to come.** HRMS at `46b38904` has no future-day check on Attendance (`validate_attendance_date` checks
  only the joining day), and calls `validate_dates` on a request with `restrict_future_dates` off. So neither refuses a
  day still to come, and no check here needs the clock.
- **A request marks a range in one call.** Approving marks every day from `fromDate` to `toDate` in its `mark` step, as
  `holiday-list.add-weekly-off` does, finding each day's attendance through the unique rule (`findBy`); it needs no
  workflow and no list. The journeys read the result back with `attendance.list`, a read by `employee` and
  `attendanceDate`.
