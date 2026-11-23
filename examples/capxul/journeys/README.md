# Capxul's journeys

The journey author writes these files and the starting worlds in `blueprint/starting-worlds/`. The builder never
edits them, the evals or the runner's generic checks (`AGENTS.md`, "Journeys and checks come first"). Each part's
record types are listed in `../doctypes.md`.

## Starting worlds

- `a company`: Ada (signed in) sets up Acme Trading (`AT`, Kenya, USD). It gives `company`.
- `a department`, from `a company`: Ada adds Engineering. It gives `company` and `department`.
- `a team`, from `a department`: Ada adds the job title Engineer. It gives `company`, `department` and `designation`.
- `an employee`, from `a team`: Ada hires Olga (signed in) as an engineer in Engineering, joining 2026-01-05. It gives
  those and `employee`.

Each world adds one record, because a world can hand on only the answer of its latest call (`s.last`).

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
