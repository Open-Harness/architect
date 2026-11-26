<!-- Generated from the blueprint. Do not edit. -->
# job-opening.close

Close a job opening to new applicants.

**Who may call:** the owner of its jobOpening.company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| jobOpening | job-opening.id |

## Answer

| field | value |
|---|---|
| jobOpening | job-opening.id |

## Move

`close`: from open to closed, emitting JobOpeningClosed.

## Steps

- `job-opening.close.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| JobOpeningNotOpen | 40 | JO-900 | the job-opening is in a state close can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its jobOpening.company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### hire from a job opening

Starts from the world `a technical round`.

- **Ada closes the opening Pat applied for, now it is filled.** `ada` (role company.owner) calls and sends jobOpening the last call's jobOpening, and gets back an answer matching `^jop_[0-9a-z]+$`.

### open a job

Starts from the world `a job applicant`.

- **Olga can't close it.** `olga` (signed in) calls and sends jobOpening the world's jobOpening, and is refused with NotAllowed, AR-001.
- **Ada closes it, though it hasn't filled.** `ada` (role company.owner) calls and sends jobOpening the world's jobOpening, and gets back the world's jobOpening.
- **it can't be closed again.** `ada` (role company.owner) calls and sends jobOpening the world's jobOpening, and is refused with JobOpeningNotOpen, JO-900, carrying state `closed`.

## How to call

```sh
capxul job-opening close --jobOpening <jobOpening>
```

HTTP: `POST /job-opening/close` with the payload as JSON. SDK: `Sdk.job-opening.close(payload)`.
