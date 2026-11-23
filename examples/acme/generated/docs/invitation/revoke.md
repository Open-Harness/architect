<!-- Generated from the blueprint. Do not edit. -->
# invitation.revoke

Withdraw an invitation that hasn't been accepted.

**Who may call:** the owner of its invitation.organization.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| invitation | invitation.id |

## Answer

(none)

## Move

`revoke`: from pending to revoked, emitting InvitationRevoked.

## Steps

- `invitation.revoke.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| InvitationNotPending | 40 | IN-900 | the invitation is in a state revoke can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its invitation.organization; the handler never runs |

## Worked examples

### an invitation is used once

Starts from the world `invited`.

- **ada can't revoke an invitation that has been accepted.** `ada` (role organization.owner) calls and sends invitation the world's invitation, and is refused with InvitationNotPending, IN-900, carrying state `accepted`.

### invite and accept

Starts from the world `founded`.

- **olga, a member but not the owner, can't revoke it.** `olga` (signed in) calls and sends invitation the last call's invitation, and is refused with NotAllowed, AR-001.
- **ada revokes it.** `ada` (role organization.owner) calls and sends invitation the last call's invitation, and is answered.

## How to call

```sh
acme invitation revoke --invitation <invitation>
```

HTTP: `POST /invitation/revoke` with the payload as JSON. SDK: `Sdk.invitation.revoke(payload)`.
