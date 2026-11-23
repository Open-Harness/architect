<!-- Generated from the blueprint. Do not edit. -->
# allowance.get

Read one allowance by its id: organization, member, limit, spent, state.

**Who may call:** the grantee of the allowance, or the owner of its organization.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | allowance.id |

## Answer

| field | value |
|---|---|
| organization | allowance.organization |
| member | allowance.member |
| limit | allowance.limit |
| spent | allowance.spent |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the grantee of the allowance, or the owner of its organization; the handler never runs |

## Worked examples

### read an allowance

Starts from the world `funded`.

- **olga reads her allowance.** `olga` (role allowance.grantee) calls and sends id the world's allowance, and gets back `active` and gets back `500` and gets back `0`.
- **ada, the owner, reads it too.** `ada` (role organization.owner) calls and sends id the world's allowance, and gets back the cast's olga person and gets back [`active`, `500`, `0`].
- **bob is refused.** `bob` (signed in) calls and sends id the world's allowance, and is refused with NotAllowed, AR-001.

### spend twice with one request

Starts from the world `funded`.

- **only 100 was spent.** `olga` (role allowance.grantee) calls and sends id the world's allowance, and gets back `100`.

## How to call

```sh
acme allowance get --id <id>
```

HTTP: `POST /allowance/get` with the payload as JSON. SDK: `Sdk.allowance.get(payload)`.
