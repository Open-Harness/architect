<!-- Generated from the blueprint. Do not edit. -->
# bridge-individual.start

Start your own KYC with Bridge: answers the form you fill in, and Bridge's terms.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 800ms.

## Payload

| field | value | description |
|---|---|---|
| fullName | bridge-individual.fullName | The person's name as their documents give it, which Bridge checks. |
| email | bridge-individual.email | Where Bridge writes to the person about their KYC. |

## Answer

| field | value | description |
|---|---|---|
| individual | bridge-individual.id |  |
| kycLink | bridge-individual.kycLink | Bridge's hosted KYC form for this person. |
| tosLink | bridge-individual.tosLink | Bridge's terms of service, which the person accepts before they are approved. |

## Move

`start`: from nothing (it creates) to started, emitting KycStarted.

## Steps

- `bridge-individual.start.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| KycAlreadyStarted | 41 | KC-001 | another bridge individual holds this person; by the rule bridge-individual.oneKycPerPerson, carrying person |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### bridge: a person is checked

Starts from an empty world.

- **the system can't start a KYC: it is nobody.** `bridge` (system) calls and sends fullName `Nobody At All`, email `nobody@capxul.test`, and is refused with NotAllowed, AR-001.
- **Ada starts her own KYC and gets Bridge's form and terms.** `ada` (signed in) calls and sends fullName `Ada Wanjiru Kamau`, email `ada@acme-trading.test`, with the request key `ada-kyc`, and gets back an answer matching `^kyc_[0-9a-z]+$` and gets back an answer matching `^https:\/\/\S+$` and gets back an answer matching `^https:\/\/\S+$`.
- **a person has one KYC, so a second start is refused.** `ada` (signed in) calls and sends fullName `Ada W. Kamau`, email `ada.k@acme-trading.test`, and is refused with KycAlreadyStarted, KC-001, carrying person the cast's ada person.
- **Bo starts his own, which Ada's doesn't block.** `bo` (signed in) calls and sends fullName `Bo Otieno`, email `bo@bo-ltd.test`, and gets back an answer matching `^kyc_[0-9a-z]+$`.

## How to call

```sh
capxul bridge-individual start --fullName <fullName> --email <email>
```

HTTP: `POST /bridge-individual/start` with the payload as JSON. SDK: `Sdk.bridge-individual.start(payload)`.
