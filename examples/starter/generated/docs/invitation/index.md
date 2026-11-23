<!-- Generated from the blueprint. Do not edit. -->
# invitation

An offer to join an organisation, sent to an email address.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| organization | organization.id |
| email | person.email |
| invitedBy | person.id |

## Machine

States: pending, accepted, revoked. A move from the wrong state is refused InvitationNotPending (exit 40).

| move | from | to | emits |
|---|---|---|---|
| send | (creates) | pending | InvitationSent |
| accept | pending | accepted | InvitationAccepted |
| revoke | pending | revoked | InvitationRevoked |

## Events

- `InvitationAccepted`: carries invitation (invitation.id), membership (membership.id); emitted by the move accept
- `InvitationRevoked`: carries invitation (invitation.id); emitted by the move revoke
- `InvitationSent`: carries invitation (invitation.id), email (invitation.email); emitted by the move send

## Roles

- invitee

## Operations

- [invitation.accept](accept.md): Accept an invitation and become a member of its organisation.
- [invitation.revoke](revoke.md): Withdraw an invitation that hasn't been accepted.
- [invitation.send](send.md): Invite someone to an organisation by email.
