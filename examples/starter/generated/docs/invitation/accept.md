<!-- Generated from the blueprint. Do not edit. -->
# invitation.accept

Accept an invitation and become a member of its organisation.

**Who may call:** the invitee of the invitation by device or key or session.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| invitation | invitation.id |

## Answer

| field | value |
|---|---|
| organization | invitation.organization |
| membership | membership.id |

## Move

`accept`: from pending to accepted, emitting InvitationAccepted.

## Steps

- `invitation.accept.join` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| InvitationNotPending | 40 | IN-900 | the invitation is in a state accept can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the invitee of the invitation by device or key or session; the handler never runs |

## Worked examples

### an invitation is used once

Starts from the world `invited`.

- **olga accepts the invitation ada sent her.** `olga` (signed in) calls and sends invitation the world's invitation, and gets back the world's organization and gets back an answer matching `^mem_[0-9a-z]+$`.
- **accepting it again is refused.** `olga` (signed in) calls and sends invitation the world's invitation, and is refused with InvitationNotPending, IN-900, carrying state `accepted`.

### invite and accept

Starts from the world `founded`.

- **bob can't accept olga's invitation.** `bob` (signed in) calls and sends invitation the last call's invitation, and is refused with NotAllowed, AR-001.
- **olga accepts and joins ada's organisation.** `olga` (signed in) calls and sends invitation the last call's invitation, and gets back the world's organization and gets back an answer matching `^mem_[0-9a-z]+$`.

## How to call

```sh
starter invitation accept --invitation <invitation>
```

HTTP: `POST /invitation/accept` with the payload as JSON. SDK: `Sdk.invitation.accept(payload)`.
