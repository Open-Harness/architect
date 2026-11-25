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
| KraWeightageNotHundred | 46 | TP-006 | declared in errors.ts |
| CriteriaWeightageNotHundred | 47 | TP-007 | declared in errors.ts |
| TemplateTitleTaken | 48 | TP-008 | another appraisal template holds this company and title; by the rule appraisal-template.oneTitlePerCompany, carrying title |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### run an appraisal cycle

Starts from the world `a three-person cycle`.

- **Ada makes a template in Acme Logistics.** `ada` (role company.owner) calls and sends company the world's otherCompany, title `Drivers`, kras [{ kra: the world's outsideKra, weightage: { value: `100`, scale: 0 } }], criteria [], and gets back an answer matching `^apt_[0-9a-z]+$`.

### set up appraisal templates

Starts from the world `an outside criteria`.

- **Ada makes a template of two KRAs and two criteria.** `ada` (role company.owner) calls and sends company the world's company, title `Engineers`, kras [{ kra: the world's kra, weightage: { value: `30`, scale: 0 } }, { kra: the world's otherKra, weightage: { value: `70`, scale: 0 } }], criteria [{ criteria: the world's criteria, weightage: { value: `70`, scale: 0 } }, { criteria: the world's otherCriteria, weightage: { value: `30`, scale: 0 } }], and gets back an answer matching `^apt_[0-9a-z]+$`.
- **Bo can't make one in Acme Trading.** `bo` (signed in) calls and sends company the world's company, title `Bo's`, kras [{ kra: the world's kra, weightage: { value: `100`, scale: 0 } }], criteria [], and is refused with NotAllowed, AR-001.
- **a template with no criteria and weightages in hundredths is allowed.** `ada` (role company.owner) calls and sends company the world's company, title `Thirds`, kras [{ kra: the world's kra, weightage: { value: `3333`, scale: 2 } }, { kra: the world's otherKra, weightage: { value: `6667`, scale: 2 } }], criteria [], and gets back an answer matching `^apt_[0-9a-z]+$`.
- **one KRA may carry the whole hundred, and criteria in tenths.** `ada` (role company.owner) calls and sends company the world's company, title `Quality only`, kras [{ kra: the world's kra, weightage: { value: `100`, scale: 0 } }], criteria [{ criteria: the world's criteria, weightage: { value: `101`, scale: 1 } }, { criteria: the world's otherCriteria, weightage: { value: `899`, scale: 1 } }], and gets back an answer matching `^apt_[0-9a-z]+$`.
- **KRAs a hundredth short of 100 are refused.** `ada` (role company.owner) calls and sends company the world's company, title `Short`, kras [{ kra: the world's kra, weightage: { value: `30`, scale: 0 } }, { kra: the world's otherKra, weightage: { value: `6999`, scale: 2 } }], criteria [], and is refused with KraWeightageNotHundred, TP-006.
- **and so are KRAs a hundredth over.** `ada` (role company.owner) calls and sends company the world's company, title `Over`, kras [{ kra: the world's kra, weightage: { value: `3001`, scale: 2 } }, { kra: the world's otherKra, weightage: { value: `70`, scale: 0 } }], criteria [], and is refused with KraWeightageNotHundred, TP-006.
- **and one KRA of 50 alone.** `ada` (role company.owner) calls and sends company the world's company, title `Half`, kras [{ kra: the world's kra, weightage: { value: `50`, scale: 0 } }], criteria [], and is refused with KraWeightageNotHundred, TP-006.
- **criteria a hundredth short of 100 are refused, though the KRAs total 100.** `ada` (role company.owner) calls and sends company the world's company, title `Short criteria`, kras [{ kra: the world's kra, weightage: { value: `100`, scale: 0 } }], criteria [{ criteria: the world's criteria, weightage: { value: `70`, scale: 0 } }, { criteria: the world's otherCriteria, weightage: { value: `2999`, scale: 2 } }], and is refused with CriteriaWeightageNotHundred, TP-007.
- **and criteria over 100.** `ada` (role company.owner) calls and sends company the world's company, title `Over criteria`, kras [{ kra: the world's kra, weightage: { value: `100`, scale: 0 } }], criteria [{ criteria: the world's criteria, weightage: { value: `70`, scale: 0 } }, { criteria: the world's otherCriteria, weightage: { value: `40`, scale: 0 } }], and is refused with CriteriaWeightageNotHundred, TP-007.
- **when both totals are off, the KRAs' is judged first.** `ada` (role company.owner) calls and sends company the world's company, title `Both off`, kras [{ kra: the world's kra, weightage: { value: `30`, scale: 0 } }, { kra: the world's otherKra, weightage: { value: `60`, scale: 0 } }], criteria [{ criteria: the world's criteria, weightage: { value: `50`, scale: 0 } }, { criteria: the world's otherCriteria, weightage: { value: `40`, scale: 0 } }], and is refused with KraWeightageNotHundred, TP-006.
- **a line of weightage 0 is refused, though the total is 100.** `ada` (role company.owner) calls and sends company the world's company, title `Zero line`, kras [{ kra: the world's kra, weightage: { value: `0`, scale: 0 } }, { kra: the world's otherKra, weightage: { value: `100`, scale: 0 } }], criteria [], and is refused with TemplateWeightageOutOfRange, TP-005.
- **and so are a line over 100 and a negative one that make 100 between them.** `ada` (role company.owner) calls and sends company the world's company, title `Lopsided`, kras [{ kra: the world's kra, weightage: { value: `150`, scale: 0 } }, { kra: the world's otherKra, weightage: { value: `-50`, scale: 0 } }], criteria [], and is refused with TemplateWeightageOutOfRange, TP-005.
- **and a criteria of weightage 0, before the criteria's total.** `ada` (role company.owner) calls and sends company the world's company, title `Zero criteria`, kras [{ kra: the world's kra, weightage: { value: `100`, scale: 0 } }], criteria [{ criteria: the world's criteria, weightage: { value: `0`, scale: 0 } }, { criteria: the world's otherCriteria, weightage: { value: `90`, scale: 0 } }], and is refused with TemplateWeightageOutOfRange, TP-005.
- **a template with no KRA is refused, even with criteria from another company.** `ada` (role company.owner) calls and sends company the world's company, title `Empty`, kras [], criteria [{ criteria: the world's outsideCriteria, weightage: { value: `100`, scale: 0 } }], and is refused with TemplateWithoutKras, TP-001.
- **a KRA of Acme Logistics is refused, judged before a criteria of Acme Logistics.** `ada` (role company.owner) calls and sends company the world's company, title `Mixed`, kras [{ kra: the world's kra, weightage: { value: `50`, scale: 0 } }, { kra: the world's outsideKra, weightage: { value: `50`, scale: 0 } }], criteria [{ criteria: the world's outsideCriteria, weightage: { value: `100`, scale: 0 } }], and is refused with TemplateKraNotInCompany, TP-002.
- **a criteria of Acme Logistics is refused, judged before a repeated KRA.** `ada` (role company.owner) calls and sends company the world's company, title `Mixed criteria`, kras [{ kra: the world's kra, weightage: { value: `50`, scale: 0 } }, { kra: the world's kra, weightage: { value: `50`, scale: 0 } }], criteria [{ criteria: the world's criteria, weightage: { value: `50`, scale: 0 } }, { criteria: the world's outsideCriteria, weightage: { value: `50`, scale: 0 } }], and is refused with TemplateCriteriaNotInCompany, TP-003.
- **a KRA listed twice is refused, judged before a line of weightage 0.** `ada` (role company.owner) calls and sends company the world's company, title `Twice`, kras [{ kra: the world's kra, weightage: { value: `100`, scale: 0 } }, { kra: the world's kra, weightage: { value: `0`, scale: 0 } }], criteria [], and is refused with TemplateLineRepeated, TP-004.
- **and so is a criteria listed twice.** `ada` (role company.owner) calls and sends company the world's company, title `Twice criteria`, kras [{ kra: the world's kra, weightage: { value: `100`, scale: 0 } }], criteria [{ criteria: the world's criteria, weightage: { value: `50`, scale: 0 } }, { criteria: the world's criteria, weightage: { value: `50`, scale: 0 } }], and is refused with TemplateLineRepeated, TP-004.
- **a title taken in Acme Trading is refused.** `ada` (role company.owner) calls and sends company the world's company, title `Engineers`, kras [{ kra: the world's kra, weightage: { value: `100`, scale: 0 } }], criteria [], and is refused with TemplateTitleTaken, TP-008, carrying title `Engineers`.
- **a taken title is judged after the weightages.** `ada` (role company.owner) calls and sends company the world's company, title `Engineers`, kras [{ kra: the world's kra, weightage: { value: `99`, scale: 0 } }], criteria [], and is refused with KraWeightageNotHundred, TP-006.
- **Acme Logistics may use the title for its own KRA and criteria.** `ada` (role company.owner) calls and sends company the world's otherCompany, title `Engineers`, kras [{ kra: the world's outsideKra, weightage: { value: `100`, scale: 0 } }], criteria [{ criteria: the world's outsideCriteria, weightage: { value: `100`, scale: 0 } }], and gets back an answer matching `^apt_[0-9a-z]+$`.
- **but not with Acme Trading's KRA.** `ada` (role company.owner) calls and sends company the world's otherCompany, title `Borrowed`, kras [{ kra: the world's kra, weightage: { value: `100`, scale: 0 } }], criteria [], and is refused with TemplateKraNotInCompany, TP-002.

## How to call

```sh
capxul appraisal-template create --company <company> --title <title> --kras <kras> --criteria <criteria>
```

HTTP: `POST /appraisal-template/create` with the payload as JSON. SDK: `Sdk.appraisal-template.create(payload)`.
