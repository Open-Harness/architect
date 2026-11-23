# Capxul's journeys

The journey author writes these files and the starting worlds in `blueprint/starting-worlds/`. The builder never
edits them, the evals or the runner's generic checks (`AGENTS.md`, "Journeys and checks come first"). Each part's
record types are listed in `../doctypes.md`.

## Starting worlds

- `a company`: Ada (signed in) sets up Acme Trading (`AT`, Kenya, USD). It gives `company`.

## Journeys

| Journey | World | Cast | What it proves |
|---|---|---|---|
| `set-up-a-company` | none | Ada, Bo (signed in) | `company.create` answers a `com_` id, emits `CompanyCreated` with the caller as owner and leaves it `active`, with the `company.create.insert` span. Each reads back exactly the values they typed (two companies, every field different), and neither can read the other's (`NotAllowed`) |
| `companies-are-kept-apart` | `a company` | Ada (owner), Bo (signed in) | Ada can't reuse her own company's name (`CompanyNameTaken`) or abbreviation (`CompanyAbbrTaken`). Bo may use both for his own, and Ada's company is left as it was, hers |

## Where the docs were silent

- **Who runs a company.** ERPNext gives company-wide rights to roles such as HR Manager. Until Capxul has its own seats, the person who
  set the company up holds them as the `owner` role on Company, and other things admit it through `owner.of("company")`.
- **Currency.** `defaultCurrency` is three capital letters, an ISO 4217 code by shape only, held as text until a company's currency is an asset in
  Orthograph's money (`decisions/CX-grill.md`, section 3).
- **Unique names.** ERPNext keeps a company's name and abbreviation unique across a site, which is one customer. Capxul's
  companies are separate organisations (K42, call 10), so both rules hold among one owner's companies: nobody can block
  another's name, and a refusal never tells anyone another company exists.
- **Country.** `country` is free text until Capxul takes ERPNext's Country list in.
- **What a journey can't see.** A call that writes a row it shouldn't, such as a second company, passes every journey
  here, because no answer carries its id. That needs a generic check in `prove` (snag #759).
