<!-- Generated from the blueprint. Do not edit. -->
# allowance

Money a member may spend from their organisation, up to a limit each month.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| organization | organization.id |
| member | person.id |
| limit | Amount |
| spent | Amount |

## Machine

States: active, exhausted, revoked. A move from the wrong state is refused AllowanceNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| grant | (creates) | active | AllowanceGranted |
| spend | active | active, exhausted | AllowanceSpent |
| revoke | active, exhausted | revoked | AllowanceRevoked |

## Events

- `AllowanceGranted`: carries allowance (allowance.id), limit (Amount); emitted by the move grant
- `AllowanceRevoked`: carries allowance (allowance.id); emitted by the move revoke
- `AllowanceSpent`: carries allowance (allowance.id), amount (Amount), memo (Memo), remaining (Amount); emitted by the move spend

## Roles

- grantee

## Operations

- [allowance.get](get.md): Read one allowance by its id: organization, member, limit, spent, state.
- [allowance.grant](grant.md): Let a member spend from the organisation, up to a limit each month.
- [allowance.revoke](revoke.md): Stop an allowance. Nothing more can be spent from it.
- [allowance.spend](spend.md): Spend from what is left of this month's allowance.
