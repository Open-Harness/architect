<!-- Generated from the blueprint. Do not edit. -->
# designation.create

Add a job title to a company.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| company | designation.company |
| designationName | designation.designationName |

## Answer

| field | value |
|---|---|
| designation | designation.id |

## Move

`create`: from nothing (it creates) to active, emitting DesignationCreated.

## Steps

- `designation.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| DesignationNameTaken | 41 | DS-001 | another designation holds this company and designation name; by the rule designation.oneNamePerCompany, carrying designationName |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### another company's job title is refused

Starts from the world `a team`.

- **Bo adds a job title to it.** `bo` (signed in) calls and sends company the last call's company, designationName `Clerk`, and gets back an answer matching `^dsg_[0-9a-z]+$`.

### make a job offer

Starts from the world `a second job title`.

- **Ada adds a dispatcher's job title to Acme Logistics.** `ada` (role company.owner) calls and sends company the world's otherCompany, designationName `Dispatcher`, and gets back an answer matching `^dsg_[0-9a-z]+$`.

### set up departments and job titles

Starts from the world `a company`.

- **Ada adds a job title.** `ada` (role company.owner) calls and sends company the world's company, designationName `Engineer`, and gets back an answer matching `^dsg_[0-9a-z]+$`.
- **Ada can't add the same job title twice.** `ada` (role company.owner) calls and sends company the world's company, designationName `Engineer`, and is refused with DesignationNameTaken, DS-001, carrying designationName `Engineer`.
- **Ada adds a second job title.** `ada` (role company.owner) calls and sends company the world's company, designationName `Senior Accountant`, and gets back an answer matching `^dsg_[0-9a-z]+$`.

## How to call

```sh
capxul designation create --company <company> --designationName <designationName>
```

HTTP: `POST /designation/create` with the payload as JSON. SDK: `Sdk.designation.create(payload)`.
