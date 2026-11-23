# Capxul's journeys

The journey author writes these files and the starting worlds in `blueprint/starting-worlds/`. The builder never
edits them, the evals or the runner's generic checks (`AGENTS.md`, "Journeys and checks come first"). Each part's
record types are listed in `../doctypes.md`.

## Starting worlds

- `a company`: Ada (signed in) sets up Acme Trading (`AT`, Kenya, USD). It gives `company`.
- `kyb started`, from `a company`: Ada starts Acme Trading's KYB with Bridge. It gives `company`, `business`, `kybLink`
  and `tosLink`.
- `kyb approved`, from `kyb started`: Bridge (the system) approves it. It gives `company` and `business`.
- `a bank account`, from `kyb approved`: Ada opens Operating, a US dollar account. It gives `company`, `business`,
  `account`, `bankName`, `accountNumber` and `routingNumber`.

## Journeys

| Journey | World | Cast | What it proves |
|---|---|---|---|
| `set-up-a-company` | none | Ada, Bo (signed in) | `company.create` answers a `com_` id, emits `CompanyCreated` with the caller as owner and leaves it `active`, with the `company.create.insert` span. Each reads back exactly the values they typed (two companies, every field different), and neither can read the other's (`NotAllowed`) |
| `companies-are-kept-apart` | `a company` | Ada (owner), Bo (signed in) | Ada can't reuse her own company's name (`CompanyNameTaken`) or abbreviation (`CompanyAbbrTaken`), and her second company, under other names, reads back as she typed it. Bo may use both for his own, and Ada's company is left as it was, hers |
| `bridge-start-a-kyb` | `a company` | Ada (owner), Bo (signed in) | `bridge-business.start` answers a `kyb_` id and two `https://` pages, Bridge's KYB form and its terms, which differ; emits `KybStarted` with the company, leaves it `started`, with the `insert` span. Bo can't start one for Ada's company or read hers (`NotAllowed`). A second start is refused `KybAlreadyStarted`. It reads back as she typed it |
| `bridge-kyb-is-decided-by-bridge` | `kyb started` | Ada (owner), Bo (signed in), Bridge (the system) | Only Bridge decides: Ada can't approve her own, Bo can't turn his down (`NotAllowed`). Before approval no account opens (`KybNotApproved`, after `load`, before `insert`). Bridge approves (`KybApproved`, `approved`); an approved KYB can't be approved or turned down again (`notFrom`). Bridge turns Bo's down with its reason (`KybRejected`, `rejected`), which can't then be approved and opens no account. Ada's stays approved |
| `bridge-a-person-is-checked` | none | Ada, Bo (signed in), Bridge (the system) | The system can't start a KYC. `bridge-individual.start` answers a `kyc_` id and two differing `https://` pages, emits `KycStarted` with the caller as the person, `started`. Bo can't read Ada's, Ada can't approve herself (`NotAllowed`), a second start is `KycAlreadyStarted`. Bridge approves her (`KycApproved`) and she reads it back as typed; Bridge turns Bo down with its reason (`KycRejected`), which can't then be approved |
| `bridge-open-a-bank-account` | `kyb approved` | Ada (owner), Bo (signed in) | Bo can't open an account on Ada's company. `bank-account.open` answers a `bac_` id and the deposit details: for USD an account number and a nine-digit routing number, for EUR an IBAN and a BIC. It emits `BankAccountOpened` with the company, the KYB and the currency, `open`, with the `load` and `insert` spans. Bo can't read it. A second open account by the same name is `BankAccountNameTaken`. The second account reads back as itself |
| `bridge-a-bank-account-closes` | `a bank account` | Ada (owner), Bo (signed in) | The account reads back with every detail `open` answered. Bo can't close it. Ada closes it (`BankAccountClosed`, `closed`, the `update` span), not twice (`notFrom`). Its name is then free for a new account, and the old one stays closed |

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
  fixed values, since the stand-in or Bridge chooses them.
- **Bridge, part two.** Not checked yet, each waiting on the adapter (#739 for its generator gaps): the call to Bridge
  as a step in each operation, Bridge's webhooks as events (deposits landing as Bank Transactions, transfers), Bridge's
  other KYC states, a business's associated persons, transfers out, and help with incorporation. Those checks come with
  the adapter, in a later author pull request on this slice.
