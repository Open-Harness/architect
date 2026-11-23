<!-- Generated from the blueprint. Do not edit. -->
# allowance.grant

Let a member spend from the organisation, up to a limit each month.

**Who may call:** the owner of its organization.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| organization | allowance.organization |
| member | allowance.member |
| limit | allowance.limit |

## Answer

| field | value |
|---|---|
| allowance | allowance.id |

## Move

`grant`: from nothing (it creates) to active, emitting AllowanceGranted.

## Steps

- `allowance.grant.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AllowanceLimitTooHigh | 44 | AL-003 | declared in errors.ts, carrying cap |
| PersonNotFound | 4 | PE-901 | nothing has the id in member; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its organization; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### grant an allowance

Starts from the world `founded`.

- **ada grants olga 500.** `ada` (role organization.owner) calls and sends organization the world's organization, member the cast's olga person, limit `500`, and gets back an answer matching `^alw_[0-9a-z]+$`.
- **bob is refused and the handler never runs.** `bob` (signed in) calls and sends organization the world's organization, member the cast's bob person, limit `500`, and is refused with NotAllowed, AR-001.
- **a limit over the cap is refused.** `ada` (role organization.owner) calls and sends organization the world's organization, member the cast's olga person, limit `1001`, and is refused with AllowanceLimitTooHigh, AL-003, carrying cap `1000`.
- **a member who is no one is refused PersonNotFound and the handler never runs.** `ada` (role organization.owner) calls and sends organization the world's organization, member `per_nobody`, limit `500`, and is refused with PersonNotFound, PE-901, carrying id `per_nobody`.

## How to call

```sh
acme allowance grant --organization <organization> --member <member> --limit <limit>
```

HTTP: `POST /allowance/grant` with the payload as JSON. SDK: `Sdk.allowance.grant(payload)`.
