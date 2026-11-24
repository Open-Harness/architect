<!-- Generated from the blueprint. Do not edit. -->
# bridge-business.get

Read one bridge-business by its id: company, legalName, email, kybLink, tosLink, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | bridge-business.id |

## Answer

| field | value | description |
|---|---|---|
| company | bridge-business.company |  |
| legalName | bridge-business.legalName | The company's name as it is registered, which Bridge checks. |
| email | bridge-business.email | Where Bridge writes to the business about its KYB. |
| kybLink | bridge-business.kybLink | Bridge's hosted KYB form for this business. |
| tosLink | bridge-business.tosLink | Bridge's terms of service, which the business accepts before it is approved. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### bridge: a rejected kyb keeps what bridge gave

Starts from the world `kyb started`.

- **the decision changes nothing else Ada was given.** `ada` (role company.owner) calls and sends id the world's business, and gets back [the world's company, `Acme Trading Limited`, `finance@acme-trading.test`, the world's kybLink, the world's tosLink, `rejected`].

### bridge: kyb is decided by bridge

Starts from the world `two kybs started`.

- **Ada reads it back approved, with everything else as it was started.** `ada` (role company.owner) calls and sends id the world's business, and gets back [the world's company, `Acme Trading Limited`, `finance@acme-trading.test`, the world's kybLink, the world's tosLink, `approved`].
- **Bo reads his back turned down, as he typed it.** `bo` (signed in) calls and sends id the world's boBusiness, and gets back [`Bo Limited`, `bo@bo-ltd.test`, the world's boKybLink, the world's boTosLink, `rejected`] and gets back false.
- **Ada's approval is untouched by Bo's refusal.** `ada` (role company.owner) calls and sends id the world's business, and gets back `approved`.

### bridge: start a kyb

Starts from the world `a company`.

- **Bo can't read Ada's KYB.** `bo` (signed in) calls and sends id the last call's business, and is refused with NotAllowed, AR-001.
- **reading it back shows what she typed, still started, with a form and terms that differ.** `ada` (role company.owner) calls and sends id the last call's business, and gets back [the world's company, `Acme Trading Limited`, `finance@acme-trading.test`, `started`] and gets back false.

## How to call

```sh
capxul bridge-business get --id <id>
```

HTTP: `POST /bridge-business/get` with the payload as JSON. SDK: `Sdk.bridge-business.get(payload)`.
