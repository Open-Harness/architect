<!-- Generated from the blueprint. Do not edit. -->
# safe.list

List safes, oldest first, 50 to a page, filtered by company.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler. A page of 50 at a time, oldest first, narrowed by company; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value | description |
|---|---|---|
| company (optional) | safe.company | The company it is for, when it is a company's. |
| cursor (optional) | text |  |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### safe: a company records its safe

Starts from the world `three company safes`.

- **nor list Acme Trading's Safes.** `bo` (signed in) calls and sends company the world's company, and is refused with NotAllowed, AR-001.
- **Acme Trading has that one Safe and no other.** `ada` (signed in) calls and sends company the world's company, and gets back [[the world's tradingSafe, `company`, the world's company, the world's tradingAccount]].
- **Acme Logistics has that one Safe and no other.** `ada` (signed in) calls and sends company the world's otherCompany, and gets back [[the world's logisticsSafe, `company`, the world's otherCompany, the world's logisticsAccount]].
- **Bo Ltd has that one Safe and no other.** `bo` (signed in) calls and sends company the world's boCompany, and gets back [[the world's boLtdSafe, `company`, the world's boCompany, the world's boLtdAccount]].

### safe: a founder without a safe is refused

Starts from the world `ada has a safe`.

- **Bo Ltd has that one Safe and no other.** `bo` (signed in) calls and sends company the world's boCompany, and gets back 1 and gets back `company`.

## How to call

```sh
capxul safe list [--company <company>] [--cursor <cursor>]
```

HTTP: `POST /safe/list` with the payload as JSON. SDK: `Sdk.safe.list(payload)`.
