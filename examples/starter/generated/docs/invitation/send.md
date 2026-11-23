<!-- Generated from the blueprint. Do not edit. -->
# invitation.send

Invite someone to an organisation by email.

**Who may call:** the owner of its organization.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| organization | invitation.organization |
| email | invitation.email |

## Answer

| field | value |
|---|---|
| invitation | invitation.id |

## Move

`send`: from nothing (it creates) to pending, emitting InvitationSent.

## Steps

- `invitation.send.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its organization; the handler never runs |

## Worked examples

### invite and accept

Starts from the world `founded`.

- **bob can't invite anyone to it.** `bob` (signed in) calls and sends organization the world's organization, email the cast's olga email, and is refused with NotAllowed, AR-001.
- **ada invites olga by her email.** `ada` (role organization.owner) calls and sends organization the world's organization, email the cast's olga email, and gets back an answer matching `^inv_[0-9a-z]+$`.
- **ada sends a second invitation.** `ada` (role organization.owner) calls and sends organization the world's organization, email the cast's bob email, and gets back an answer matching `^inv_[0-9a-z]+$`.

## How to call

```sh
starter invitation send --organization <organization> --email <email>
```

HTTP: `POST /invitation/send` with the payload as JSON. SDK: `Sdk.invitation.send(payload)`.
