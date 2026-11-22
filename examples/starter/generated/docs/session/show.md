<!-- Generated from the blueprint. Do not edit. -->
# session.show

Who is signed in.

**Who may call:** anyone signed in.

**Budget:** p95 100ms.

## Payload

(none)

## Answer

| field | value |
|---|---|
| person | person.id |
| email | person.email |
| via | Way |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## Worked examples

### invite and accept

Starts from the world `founded`.

- **ada sees who she is signed in as.** `ada` (role organization.owner) calls and sends nothing, and gets back the cast's ada person and gets back the cast's ada email.

### sign up and sign in

Starts from an empty world.

- **before signing up the newcomer is nobody.** `newcomer` (anyone) calls and sends nothing, and is refused with NotAllowed, AR-001.

## How to call

```sh
starter session show
```

HTTP: `POST /session/show` with the payload as JSON. SDK: `Sdk.session.show(payload)`.
