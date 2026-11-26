<!-- Generated from the blueprint. Do not edit. -->
# salary-component.create

Add a part of pay, an earning or a deduction, with its default amount and the ledger it is booked to.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| company | salary-component.company |  |
| salaryComponent | salary-component.salaryComponent |  |
| type | salary-component.type |  |
| amount | salary-component.amount | What a structure line pays when it names no amount of its own, in USDC base units. 0 for none. |
| account | salary-component.account | The company's ledger its pay is booked to: debited for an earning, credited for a deduction. |

## Answer

| field | value |
|---|---|
| salaryComponent | salary-component.id |

## Move

`create`: from nothing (it creates) to active, emitting SalaryComponentCreated.

## Steps

- `salary-component.create.load` (database)
- `salary-component.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ComponentAccountNotInCompany | 41 | SC-001 | declared in errors.ts |
| ComponentAccountIsGroup | 42 | SC-002 | declared in errors.ts |
| SalaryComponentTaken | 43 | SC-003 | another salary component holds this company and salary component; by the rule salary-component.oneNamePerCompany |
| AccountNotFound | 4 | AC-901 | nothing has the id in account; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### assign salary structures

Starts from the world `a payroll outsider`.

- **and Basic for Acme Logistics.** `ada` (role company.owner) calls and sends company the world's otherCompany, salaryComponent `Basic`, type `Earning`, amount `1000000000`, account the last call's account, and is answered.

### run a payroll

Starts from the world `an outside cost center`.

- **Ada adds a deduction for meals of 50 USDC, booked to Salaries.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Cafeteria`, type `Deduction`, amount `50000000`, account the world's salaries, and is answered.
- **Ada adds an earning of 100 USDC booked to Rent.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Night shift`, type `Earning`, amount `100000000`, account the world's rent, and is answered.

### set up salary components

Starts from the world `a salaries ledger`.

- **Bo can't add a component to Acme Trading.** `bo` (signed in) calls and sends company the world's company, salaryComponent `Basic`, type `Earning`, amount `3000000000`, account the world's salaries, and is refused with NotAllowed, AR-001.
- **Ada adds Basic, an earning of 3,000 USDC by default, booked to Salaries.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Basic`, type `Earning`, amount `3000000000`, account the world's salaries, and is answered.
- **Pension, a deduction of 150 USDC, is booked to Pension Payable.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Pension`, type `Deduction`, amount `150000000`, account the world's pension, and is answered.
- **Housing may have no default amount.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Housing`, type `Earning`, amount `0`, account the world's salaries, and is answered.
- **a component booked to a group is refused.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Bonus`, type `Earning`, amount `0`, account the world's operating, and is refused with ComponentAccountIsGroup, SC-002.
- **so is one booked to Liabilities, the group above Payroll Payable.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Tax`, type `Deduction`, amount `10000000`, account the world's liabilities, and is refused with ComponentAccountIsGroup, SC-002.
- **a name already used in the company is refused, whatever its type.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Basic`, type `Deduction`, amount `5000000`, account the world's pension, and is refused with SalaryComponentTaken, SC-003.
- **Acme Trading's component booked to that group is refused for the company, before the group.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Overtime`, type `Earning`, amount `0`, account the last call's account, and is refused with ComponentAccountNotInCompany, SC-001.
- **Acme Trading's component can't be booked to Acme Logistics' ledger.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Overtime`, type `Earning`, amount `0`, account the last call's account, and is refused with ComponentAccountNotInCompany, SC-001.
- **another company's account is refused before a name already taken.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Basic`, type `Earning`, amount `0`, account the last call's account, and is refused with ComponentAccountNotInCompany, SC-001.
- **and a group before a name already taken.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Basic`, type `Earning`, amount `0`, account the world's operating, and is refused with ComponentAccountIsGroup, SC-002.
- **Acme Logistics may have its own Basic, booked to its own ledger.** `ada` (role company.owner) calls and sends company the world's otherCompany, salaryComponent `Basic`, type `Earning`, amount `1000000000`, account the last call's account, and is answered.
- **but not booked to Acme Trading's Salaries.** `ada` (role company.owner) calls and sends company the world's otherCompany, salaryComponent `Housing`, type `Earning`, amount `0`, account the world's salaries, and is refused with ComponentAccountNotInCompany, SC-001.

### set up salary structures

Starts from the world `a pension component`.

- **and gives Acme Logistics its own Basic.** `ada` (role company.owner) calls and sends company the world's otherCompany, salaryComponent `Basic`, type `Earning`, amount `1000000000`, account the last call's account, and is answered.
- **Ada adds an earning with no default.** `ada` (role company.owner) calls and sends company the world's company, salaryComponent `Overtime`, type `Earning`, amount `0`, account the world's salaries, and is answered.

## How to call

```sh
capxul salary-component create --company <company> --salaryComponent <salaryComponent> --type <type> --amount <amount> --account <account>
```

HTTP: `POST /salary-component/create` with the payload as JSON. SDK: `Sdk.salary-component.create(payload)`.
