<!-- Generated from the blueprint. Do not edit. -->
# appraisal-template.create

Make an appraisal template: KRAs and rating criteria, each with its weightage.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value |
|---|---|
| company | appraisal-template.company |
| title | appraisal-template.title |
| kras | appraisal-template.kras |
| criteria | appraisal-template.criteria |

## Answer

| field | value |
|---|---|
| appraisalTemplate | appraisal-template.id |

## Move

`create`: from nothing (it creates) to active, emitting AppraisalTemplateCreated.

## Steps

- `appraisal-template.create.load` (database)
- `appraisal-template.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TemplateWithoutKras | 41 | TP-001 | declared in errors.ts |
| TemplateKraNotInCompany | 42 | TP-002 | declared in errors.ts |
| TemplateCriteriaNotInCompany | 43 | TP-003 | declared in errors.ts |
| TemplateLineRepeated | 44 | TP-004 | declared in errors.ts |
| TemplateWeightageOutOfRange | 45 | TP-005 | declared in errors.ts |
| KraWeightageNotHundred | 46 | TP-006 | declared in errors.ts, carrying total |
| CriteriaWeightageNotHundred | 47 | TP-007 | declared in errors.ts, carrying total |
| TemplateTitleTaken | 48 | TP-008 | another appraisal template holds this company and title; by the rule appraisal-template.oneTitlePerCompany, carrying title |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
capxul appraisal-template create --company <company> --title <title> --kras <kras> --criteria <criteria>
```

HTTP: `POST /appraisal-template/create` with the payload as JSON. SDK: `Sdk.appraisal-template.create(payload)`.
