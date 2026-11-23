<!-- Generated from the blueprint. Do not edit. -->
# session.sign-in

Sign in with email and password. The token is the bearer for every later call.

**Who may call:** anyone.

**Budget:** p95 400ms.

## Payload

| field | value |
|---|---|
| email | person.email |
| password | Password (secret) |

## Answer

| field | value |
|---|---|
| session | session.id (secret) |
| token | Secret (secret) |

## Steps

- `session.sign-in.verify` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SessionCredentialsWrong | 10 | SE-001 | declared in errors.ts |

## Worked examples

### sign up and sign in

Starts from an empty world.

- **a wrong password is refused.** `newcomer` (anyone) calls and sends email the cast's newcomer email, password { redacted: true }, and is refused with SessionCredentialsWrong, SE-001.
- **the right password answers a session and a token.** `newcomer` (anyone) calls and sends email the cast's newcomer email, password the cast's newcomer password, and gets back an answer matching `^ses_[0-9a-z]+$` and gets back an answer matching `^.+$`.

## How to call

```sh
acme session sign-in --email <email> --password <password>
```

HTTP: `POST /session/sign-in` with the payload as JSON. SDK: `Sdk.session.sign-in(payload)`.
