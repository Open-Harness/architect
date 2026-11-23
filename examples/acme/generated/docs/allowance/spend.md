<!-- Generated from the blueprint. Do not edit. -->
# allowance.spend

Spend from what is left of this month's allowance.

**Who may call:** the grantee of the allowance.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| allowance | allowance.id |
| amount | Amount |
| memo | Memo |

## Answer

| field | value |
|---|---|
| remaining | Amount |

## Move

`spend`: from active to active or exhausted, emitting AllowanceSpent.

## Steps

- `allowance.spend.load` (database)
- `allowance.spend.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AllowanceExceeded | 41 | AL-001 | declared in errors.ts, carrying remaining |
| AllowanceNotActive | 40 | AL-900 | the allowance is in a state spend can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the grantee of the allowance; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### revoke then spend

Starts from the world `funded`.

- **olga can't spend.** `olga` (role allowance.grantee) calls and sends allowance the world's allowance, amount `1`, memo `coffee`, and is refused with AllowanceNotActive, AL-900, carrying state `revoked`.

### spend twice with one request

Starts from the world `funded`.

- **olga spends 100.** `olga` (role allowance.grantee) calls and sends allowance the world's allowance, amount `100`, memo `coffee`, with the request key `coffee-1`, and gets back `400`.
- **the same request again gives the same answer and spends nothing.** `olga` (role allowance.grantee) calls and sends allowance the world's allowance, amount `100`, memo `coffee`, with the request key `coffee-1`, and gets back `400`.

### spend within an allowance

Starts from the world `funded`.

- **olga spends some.** `olga` (role allowance.grantee) calls and sends allowance the world's allowance, amount `120`, memo `train`, and gets back `380`.
- **olga can't spend more than is left.** `olga` (role allowance.grantee) calls and sends allowance the world's allowance, amount `400`, memo `hotel`, and is refused with AllowanceExceeded, AL-001, carrying remaining `380`.
- **olga spends the rest.** `olga` (role allowance.grantee) calls and sends allowance the world's allowance, amount `380`, memo `hotel`, and gets back `0`.
- **nothing is left this month.** `olga` (role allowance.grantee) calls and sends allowance the world's allowance, amount `1`, memo `coffee`, and is refused with AllowanceNotActive, AL-900, carrying state `exhausted`.

## How to call

```sh
acme allowance spend --allowance <allowance> --amount <amount> --memo <memo>
```

HTTP: `POST /allowance/spend` with the payload as JSON. SDK: `Sdk.allowance.spend(payload)`.
