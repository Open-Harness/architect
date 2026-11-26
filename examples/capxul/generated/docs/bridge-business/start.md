<!-- Generated from the blueprint. Do not edit. -->
# bridge-business.start

Start a company's KYB with Bridge: answers the form the business fills in, and Bridge's terms.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 800ms.

## Payload

| field | value | description |
|---|---|---|
| company | bridge-business.company |  |
| legalName | bridge-business.legalName | The company's name as it is registered, which Bridge checks. |
| email | bridge-business.email | Where Bridge writes to the business about its KYB. |

## Answer

| field | value | description |
|---|---|---|
| business | bridge-business.id |  |
| kybLink | bridge-business.kybLink | Bridge's hosted KYB form for this business. |
| tosLink | bridge-business.tosLink | Bridge's terms of service, which the business accepts before it is approved. |

## Move

`start`: from nothing (it creates) to started, emitting KybStarted.

## Steps

- `bridge-business.start.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| KybAlreadyStarted | 41 | KB-001 | another bridge business holds this company; by the rule bridge-business.oneKybPerCompany, carrying company |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a bank account, end to end

Starts from an empty world.

- **she starts its KYB.** `ada` (signed in) calls and sends company the last call's company, legalName `Acme Trading Limited`, email `finance@acme-trading.test`, with the request key `acme-kyb`, and gets back an answer matching `^kyb_[0-9a-z]+$`.

### bridge: start a kyb

Starts from the world `a company`.

- **Bo can't start KYB for a company he doesn't run.** `bo` (signed in) calls and sends company the world's company, legalName `Acme Trading Limited`, email `bo@elsewhere.test`, and is refused with NotAllowed, AR-001.
- **Ada starts her company's KYB and gets Bridge's form and terms.** `ada` (role company.owner) calls and sends company the world's company, legalName `Acme Trading Limited`, email `finance@acme-trading.test`, with the request key `acme-kyb`, and gets back an answer matching `^kyb_[0-9a-z]+$` and gets back an answer matching `^https:\/\/\S+$` and gets back an answer matching `^https:\/\/\S+$`.
- **a company has one KYB, so a second start is refused.** `ada` (role company.owner) calls and sends company the world's company, legalName `Acme Trading Ltd`, email `ops@acme-trading.test`, and is refused with KybAlreadyStarted, KB-001, carrying company the world's company.

## How to call

```sh
capxul bridge-business start --company <company> --legalName <legalName> --email <email>
```

HTTP: `POST /bridge-business/start` with the payload as JSON. SDK: `Sdk.bridge-business.start(payload)`.
