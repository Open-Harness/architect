<!-- Generated from the blueprint. Do not edit. -->
# appraisal-template.get

Read one appraisal-template by its id: company, title, kras, criteria, state.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | appraisal-template.id |

## Answer

| field | value |
|---|---|
| company | appraisal-template.company |
| title | appraisal-template.title |
| kras | appraisal-template.kras |
| criteria | appraisal-template.criteria |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### set up appraisal templates

Starts from the world `an outside criteria`.

- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's appraisalTemplate, and is refused with NotAllowed, AR-001.
- **it reads back with each line in the order given.** `ada` (role company.owner) calls and sends id the last call's appraisalTemplate, and gets back [the world's company, `Engineers`, `active`, [[the world's kra, `30`], [the world's otherKra, `70`]], [[the world's criteria, `70`], [the world's otherCriteria, `30`]]].
- **it reads back with its hundredths and no criteria.** `ada` (role company.owner) calls and sends id the last call's appraisalTemplate, and gets back [`Thirds`, [[the world's kra, `33.33`], [the world's otherKra, `66.67`]], []].
- **it reads back as typed.** `ada` (role company.owner) calls and sends id the last call's appraisalTemplate, and gets back [`Quality only`, [[the world's kra, `100`]], [[the world's criteria, `10.1`], [the world's otherCriteria, `89.9`]]].

## How to call

```sh
capxul appraisal-template get --id <id>
```

HTTP: `POST /appraisal-template/get` with the payload as JSON. SDK: `Sdk.appraisal-template.get(payload)`.
