<!-- Generated from the blueprint. Do not edit. -->
# allowance.revoke

Stop an allowance. Nothing more can be spent from it.

**Who may call:** the owner of its allowance.organization.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| allowance | allowance.id |

## Answer

(none)

## Move

`revoke`: from active or exhausted to revoked, emitting AllowanceRevoked.

## Steps

- `allowance.revoke.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AllowanceNotActive | 40 | AL-900 | the allowance is in a state revoke can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its allowance.organization; the handler never runs |

## Worked examples

### an outsider cannot revoke

Starts from the world `funded`.

- **bob is refused and the handler never runs.** `bob` (signed in) calls and sends allowance the world's allowance, and is refused with NotAllowed, AR-001.

### revoke then spend

Starts from the world `funded`.

- **ada revokes it.** `ada` (role organization.owner) calls and sends allowance the world's allowance, and is answered.
- **olga can't revoke it either.** `olga` (role allowance.grantee) calls and sends allowance the world's allowance, and is refused with NotAllowed, AR-001.

## How to call

```sh
acme allowance revoke --allowance <allowance>
```

HTTP: `POST /allowance/revoke` with the payload as JSON. SDK: `Sdk.allowance.revoke(payload)`.
