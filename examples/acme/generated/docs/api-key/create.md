<!-- Generated from the blueprint. Do not edit. -->
# api-key.create

Create an API key in an organisation. The key itself is shown once.

**Who may call:** the owner of its organization by device or session.

**Budget:** p95 250ms.

## Payload

| field | value |
|---|---|
| organization | api-key.organization |
| name | api-key.name |

## Answer

| field | value |
|---|---|
| apiKey | api-key.id |
| key | Secret (secret) |

## Steps

- `api-key.create.issue` (database)
- `api-key.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its organization by device or session; the handler never runs |

## Worked examples

### an agent passes the owner rule

Starts from the world `founded`.

- **ada's agent can't make a key: that entry is for a person in person.** `ada` (role organization.owner) calls and sends organization the world's organization, name `agent's key`, and is refused with NotAllowed, AR-001.
- **ada, in her own session, makes one.** `ada` (role organization.owner) calls and sends organization the world's organization, name `ci`, and gets back an answer matching `^key_[0-9a-z]+$` and gets back an answer matching `^.+$`.
- **ada's own key can't make another: a key never makes a key.** `ada` (role organization.owner) calls and sends organization the world's organization, name `the key's key`, and is refused with NotAllowed, AR-001.

### an owner makes an api key

Starts from the world `founded`.

- **bob can't make a key in ada's organisation.** `bob` (signed in) calls and sends organization the world's organization, name `bob's key`, and is refused with NotAllowed, AR-001.
- **ada makes a key; the secret is shown once.** `ada` (role organization.owner) calls and sends organization the world's organization, name `ci`, and gets back an answer matching `^key_[0-9a-z]+$` and gets back an answer matching `^.+$`.
- **bob makes a key in his own organisation.** `bob` (signed in) calls and sends organization the last call's organization, name `bob's own key`, and gets back an answer matching `^key_[0-9a-z]+$` and gets back an answer matching `^.+$`.

## How to call

```sh
acme api-key create --organization <organization> --name <name>
```

HTTP: `POST /api-key/create` with the payload as JSON. SDK: `Sdk.api-key.create(payload)`.
