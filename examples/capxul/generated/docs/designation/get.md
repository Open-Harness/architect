<!-- Generated from the blueprint. Do not edit. -->
# designation.get

Read one designation by its id: company, designationName, state.

**Who may call:** the owner of its designation.company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | designation.id |

## Answer

| field | value |
|---|---|
| company | designation.company |
| designationName | designation.designationName |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its designation.company; the handler never runs |

## Worked examples

### set up departments and job titles

Starts from the world `a company`.

- **Bo can't read Ada's job title.** `bo` (signed in) calls and sends id the last call's designation, and is refused with NotAllowed, AR-001.
- **Ada reads Engineer back.** `ada` (role company.owner) calls and sends id the last call's designation, and gets back [the world's company, `Engineer`, `active`].

## How to call

```sh
capxul designation get --id <id>
```

HTTP: `POST /designation/get` with the payload as JSON. SDK: `Sdk.designation.get(payload)`.
