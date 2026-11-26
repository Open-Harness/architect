<!-- Generated from the blueprint. Do not edit. -->
# salary-component.get

Read one salary-component by its id: company, salaryComponent, type, amount, account, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | salary-component.id |

## Answer

| field | value | description |
|---|---|---|
| company | salary-component.company |  |
| salaryComponent | salary-component.salaryComponent |  |
| type | salary-component.type |  |
| amount | salary-component.amount | What a structure line pays when it names no amount of its own, in USDC base units. 0 for none. |
| account | salary-component.account | The company's ledger its pay is booked to: debited for an earning, credited for a deduction. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up salary components

Starts from the world `a salaries ledger`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's salaryComponent, and is refused with NotAllowed, AR-001.
- **it reads back as added.** `ada` (role company.owner) calls and sends id the last call's salaryComponent, and gets back [the world's company, `Basic`, `Earning`, `3000000000`, the world's salaries, `active`].
- **and reads back a deduction.** `ada` (role company.owner) calls and sends id the last call's salaryComponent, and gets back [`Pension`, `Deduction`, `150000000`, the world's pension].
- **and reads back 0.** `ada` (role company.owner) calls and sends id the last call's salaryComponent, and gets back [`Housing`, `0`].

## How to call

```sh
capxul salary-component get --id <id>
```

HTTP: `POST /salary-component/get` with the payload as JSON. SDK: `Sdk.salary-component.get(payload)`.
