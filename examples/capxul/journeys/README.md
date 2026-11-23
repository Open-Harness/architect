# Capxul's journeys

The journey author writes these files and the starting worlds in `blueprint/starting-worlds/`. The builder never
edits them, the evals or the runner's generic checks (`AGENTS.md`, "Journeys and checks come first"). Each part's
record types are listed in `../doctypes.md`.

## Starting worlds

- `a company`: Ada (signed in) sets up Acme Trading (`AT`, Kenya, USD). It gives `company`.

## Journeys

| Journey | World | Cast | What it proves |
|---|---|---|---|
| `set-up-a-company` | none | Ada, Bo (signed in) | `company.create` answers a `com_` id, emits `CompanyCreated` with Ada as owner and leaves it `active`, with the `company.create.insert` span. Bo, who doesn't run it, is refused `NotAllowed` on `company.get`. Ada reads back every field she typed, herself as owner, and `active` |

## Where the docs were silent

- **Who runs a company.** ERPNext gives company-wide rights to roles such as HR Manager. Until Capxul has its own seats, the person who
  set the company up holds them as the `owner` role on Company, and other things admit it through `owner.of("company")`.
- **Currency.** `defaultCurrency` is an ISO 4217 code held as text until a company's currency is an asset in
  Orthograph's money (`decisions/CX-grill.md`, section 3).
