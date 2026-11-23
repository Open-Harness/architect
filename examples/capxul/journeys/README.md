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
- `kyb started`, from `a company`: Ada starts Acme Trading's KYB with Bridge. It gives `company`, `business`, `kybLink`
  and `tosLink`.
- `kyb approved`, from `kyb started`: Bridge (the system) approves it. It gives `company` and `business`.
- `a bank account`, from `kyb approved`: Ada opens Operating, a US dollar account. It gives `company`, `business`,
  `account`, `bankName`, `accountNumber` and `routingNumber`.
- `two bank accounts`, from `a bank account`: Ada opens Payroll, a euro account, too. It gives those and `payroll`,
  `payrollBankName`, `payrollAccountNumber` and `payrollRoutingNumber`.
- `a reopened account`, from `two bank accounts`: Ada closes Operating and opens a new US dollar account under its name.
  It gives `company`, `business`, `old`, `oldAccountNumber`, and the new `account` with its three details.
- `two kybs started`, from `kyb started`: Bo sets up Bo Ltd and starts its KYB. It gives Ada's four and `boBusiness`,
  `boKybLink` and `boTosLink`.
- `kyc started`: Ada (signed in) starts her own KYC with Bridge. It gives `individual`, `kycLink` and `tosLink`.
- `two kycs started`, from `kyc started`: Bo starts his own KYC. It gives Ada's three and `boIndividual`, `boKycLink`
  and `boTosLink`.

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
| `bridge-start-a-kyb` | `a company` | Ada (owner), Bo (signed in) | `bridge-business.start` answers a `kyb_` id and two `https://` pages, Bridge's KYB form and its terms, which differ; emits `KybStarted` with the company, leaves it `started`, with the `insert` span. Bo can't start one for Ada's company or read hers (`NotAllowed`). A second start is refused `KybAlreadyStarted`. It reads back as she typed it |
| `bridge-kyb-is-decided-by-bridge` | `two kybs started` | Ada (owner), Bo (signed in), Bridge (the system) | Only Bridge decides: Ada can't approve her own, Bo can't turn his down (`NotAllowed`). Before approval no account opens (`KybNotApproved`, after `load`, before `insert`). Bridge approves (`KybApproved`, `approved`); an approved KYB can't be approved or turned down again (`notFrom`). Bridge turns Bo's down with its reason (`KybRejected`, `rejected`), which can't then be approved and opens no account; Bo reads his back whole against the world, his form and terms differing. Ada's reads back approved, every field as it was started, the links as `start` gave them |
| `bridge-a-rejected-kyb-keeps-what-bridge-gave` | `kyb started` | Ada (owner), Bridge (the system) | Bridge turning the KYB down (`KybRejected`, with its reason) changes no field but the state |
| `bridge-a-person-is-checked` | none | Ada, Bo (signed in), Bridge (the system) | The system can't start a KYC. `bridge-individual.start` answers a `kyc_` id and two differing `https://` pages, emits `KycStarted` with the caller as the person, `started`. Bo can't read Ada's, Ada can't approve herself (`NotAllowed`), a second start is `KycAlreadyStarted`. Bridge approves her (`KycApproved`) and she reads it back as typed; Bridge turns Bo down with its reason (`KycRejected`), which can't then be approved, and he reads his back as he typed it |
| `bridge-a-kyc-keeps-what-bridge-gave` | `kyc started` | Ada (the person checked), Bridge (the system) | Ada's KYC reads back with the form and terms `start` gave her, and Bridge's decision (`KycRejected`) changes no other field |
| `bridge-an-approved-kyc-keeps-what-bridge-gave` | `kyc started` | Ada (the person checked), Bridge (the system) | Bridge's approval (`KycApproved`) changes no field but the state: every field reads back as `start` gave it |
| `bridge-two-kycs-are-each-their-own` | `two kycs started` | Ada, Bo (each the person checked) | Bo's KYC reads back whole against what his `start` answered, form and terms differing, and Ada's is unchanged by his. Ada can't read his (`NotAllowed`) |
| `bridge-open-a-bank-account` | `kyb approved` | Ada (owner), Bo (signed in) | Bo can't open an account on Ada's company. `bank-account.open` answers a `bac_` id and the deposit details: for USD an account number and a nine-digit routing number, for EUR an IBAN and a BIC. It emits `BankAccountOpened` with the company, the KYB and the currency, `open`, with the `load` and `insert` spans. Bo can't read it. A second open account by the same name is `BankAccountNameTaken`. The second account reads back as itself |
| `bridge-a-bank-account-closes` | `two bank accounts` | Ada (owner), Bo (signed in) | The account reads back with every detail `open` answered. Bo can't close it. Ada closes it (`BankAccountClosed`, `closed`, the `update` span), not twice (`notFrom`). Its name is then free for a new account, and the old one stays closed with its details. The euro account reads back with the IBAN and BIC it was opened with |
| `bridge-a-reopened-account-is-its-own` | `a reopened account` | Ada (owner) | An account opened under a closed one's name reads back with every detail its own opening answered, and the old one stays closed with its own number |

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
- **Bridge is Capxul's.** Every company's KYB, every person's KYC and every bank account go through Capxul's own Bridge
  account; no company connects its own (CX-grill, section 4). No ERPNext doctype has KYC or KYB, so `BridgeBusiness`
  and `BridgeIndividual` are Capxul's. `BankAccount` is ERPNext's Bank Account, opened as a Bridge virtual account.
  Which parts are paid is decided later and gates nothing here.
- **Who speaks for Bridge.** Only Bridge approves or turns down a KYC or a KYB. Until Capxul mounts the Bridge adapter
  and its webhook door, its reports arrive as the system's calls (`Blueprint.system`, the cast's `bridge`), and nobody
  else may make them. When the door lands, the journeys keep their steps and the door's events take the system's place.
- **Bridge's states.** Bridge's `kyc_status` has ten values; Capxul keeps `started`, `approved` and `rejected`, the three a
  company acts on. A virtual account is `activated` or `deactivated`, here `open` and `closed`.
- **Deposit details.** Bridge gives them per currency (`source_deposit_instructions`). The journeys judge their shape
  for USD (account and routing numbers) and EUR (IBAN and BIC), and that a read gives back what `open` answered, never
  fixed values, since the stand-in or Bridge chooses them. No two accounts, open or closed, share them
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
- **Bridge, part two.** Not checked yet, each waiting on the adapter (#739 for its generator gaps): the call to Bridge
  as a step in each operation, Bridge's webhooks as events (deposits landing as Bank Transactions, transfers), Bridge's
  other KYC states, a business's associated persons, transfers out, and help with incorporation. Those checks come with
  the adapter, in a later author pull request on this slice.
