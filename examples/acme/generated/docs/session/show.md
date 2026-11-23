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

### a key and a session are the same person

Starts from an empty world.

- **ada's session says who she is and how she got in.** `ada` (signed in) calls and sends nothing, and gets back the cast's ada person and gets back the cast's ada email and gets back `session`.
- **ada's key says the same person, and that it is a key.** `ada` (signed in) calls and sends nothing, and gets back the cast's ada person and gets back the cast's ada email and gets back `key`.
- **an agent key made for ada says the same person, and that it is an agent.** `ada` (signed in) calls and sends nothing, and gets back the cast's ada person and gets back the cast's ada email and gets back `agent`.

### invite and accept

Starts from the world `founded`.

- **ada sees who she is signed in as.** `ada` (role organization.owner) calls and sends nothing, and gets back the cast's ada person and gets back the cast's ada email.

### sign up and sign in

Starts from an empty world.

- **before signing up the newcomer is nobody.** `newcomer` (anyone) calls and sends nothing, and is refused with NotAllowed, AR-001.

### the system is nobody signed in

Starts from the world `founded`.

- **the system can't ask who is signed in: nobody is.** `clock` (system) calls and sends nothing, and is refused with NotAllowed, AR-001.
- **ada, a person, is let through where the system was refused.** `ada` (role organization.owner) calls and sends nothing, and gets back the cast's ada person.

## How to call

```sh
acme session show
```

HTTP: `POST /session/show` with the payload as JSON. SDK: `Sdk.session.show(payload)`.
