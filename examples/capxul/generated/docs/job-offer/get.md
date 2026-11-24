<!-- Generated from the blueprint. Do not edit. -->
# job-offer.get

Read one job-offer by its id: company, jobApplicant, designation, offerDate, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | job-offer.id |

## Answer

| field | value |
|---|---|
| company | job-offer.company |
| jobApplicant | job-offer.jobApplicant |
| designation | job-offer.designation |
| offerDate | job-offer.offerDate |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### make a job offer

Starts from the world `an outside employee`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's jobOffer, and is refused with NotAllowed, AR-001.
- **the offer reads back in Acme Trading, accepted.** `ada` (role company.owner) calls and sends id the last call's jobOffer, and gets back [the world's company, the world's jobApplicant, the world's designation, `2026-12-01`, `accepted`].

## How to call

```sh
capxul job-offer get --id <id>
```

HTTP: `POST /job-offer/get` with the payload as JSON. SDK: `Sdk.job-offer.get(payload)`.
