<!-- Generated from the blueprint. Do not edit. -->
# bridge-individual.get

Read one bridge-individual by its id: person, fullName, email, kycLink, tosLink, state.

**Who may call:** the self of the bridge-individual.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | bridge-individual.id |

## Answer

| field | value | description |
|---|---|---|
| person | bridge-individual.person | The person checked, who started it. |
| fullName | bridge-individual.fullName | The person's name as their documents give it, which Bridge checks. |
| email | bridge-individual.email | Where Bridge writes to the person about their KYC. |
| kycLink | bridge-individual.kycLink | Bridge's hosted KYC form for this person. |
| tosLink | bridge-individual.tosLink | Bridge's terms of service, which the person accepts before they are approved. |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of the bridge-individual; the handler never runs |

## Worked examples

### bridge: a kyc keeps what bridge gave

Starts from the world `kyc started`.

- **Ada reads her KYC back with the form and terms she was given.** `ada` (role bridge-individual.self) calls and sends id the world's individual, and gets back [the cast's ada person, `Ada Wanjiru Kamau`, `ada@acme-trading.test`, the world's kycLink, the world's tosLink, `started`].
- **the decision changes nothing else she was given.** `ada` (role bridge-individual.self) calls and sends id the world's individual, and gets back [the cast's ada person, `Ada Wanjiru Kamau`, `ada@acme-trading.test`, the world's kycLink, the world's tosLink, `rejected`].

### bridge: a person is checked

Starts from an empty world.

- **Bo can't read Ada's KYC.** `bo` (signed in) calls and sends id the last call's individual, and is refused with NotAllowed, AR-001.
- **she reads it back as she typed it, approved, with a form and terms that differ.** `ada` (signed in) calls and sends id the last call's individual, and gets back [the cast's ada person, `Ada Wanjiru Kamau`, `ada@acme-trading.test`, `approved`] and gets back false.
- **Bo reads his own back, turned down.** `bo` (signed in) calls and sends id the last call's individual, and gets back [the cast's bo person, `Bo Otieno`, `bo@bo-ltd.test`, `rejected`].

### bridge: an approved kyc keeps what bridge gave

Starts from the world `kyc started`.

- **the approval changes nothing else she was given.** `ada` (role bridge-individual.self) calls and sends id the world's individual, and gets back [the cast's ada person, `Ada Wanjiru Kamau`, `ada@acme-trading.test`, the world's kycLink, the world's tosLink, `approved`].

## How to call

```sh
capxul bridge-individual get --id <id>
```

HTTP: `POST /bridge-individual/get` with the payload as JSON. SDK: `Sdk.bridge-individual.get(payload)`.
