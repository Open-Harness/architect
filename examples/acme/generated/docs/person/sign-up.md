<!-- Generated from the blueprint. Do not edit. -->
# person.sign-up

Sign up with an email address and a password.

**Who may call:** anyone.

**Budget:** p95 400ms.

## Payload

| field | value |
|---|---|
| email | person.email |
| password | Password (secret) |
| name | person.name |

## Answer

| field | value |
|---|---|
| person | person.id |

## Steps

- `person.sign-up.create` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| PersonEmailTaken | 11 | PE-001 | declared in errors.ts |

## Worked examples

### sign up and sign in

Starts from an empty world.

- **the newcomer signs up.** `newcomer` (anyone) calls and sends email the cast's newcomer email, password the cast's newcomer password, name `Newcomer`, and gets back an answer matching `^per_[0-9a-z]+$`.
- **signing up again with the same email is refused.** `newcomer` (anyone) calls and sends email the cast's newcomer email, password the cast's newcomer password, name `Newcomer again`, and is refused with PersonEmailTaken, PE-001.

## How to call

```sh
acme person sign-up --email <email> --password <password> --name <name>
```

HTTP: `POST /person/sign-up` with the payload as JSON. SDK: `Sdk.person.sign-up(payload)`.
