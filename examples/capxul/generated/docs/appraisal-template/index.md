<!-- Generated from the blueprint. Do not edit. -->
# appraisal-template

The KRAs and criteria a company appraises a kind of job by, each with its share.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| title | TemplateTitle |
| kras | TemplateKras |
| criteria | TemplateCriteria |

## Machine

States: active. A move from the wrong state is refused AppraisalTemplateNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | AppraisalTemplateCreated |

## Invariants

- `appraisal-template.oneTitlePerCompany`: another appraisal template holds this company and title. Unique on company, title, in every state; refused TemplateTitleTaken.

## Events

- `AppraisalTemplateCreated`: carries appraisalTemplate (appraisal-template.id), company (appraisal-template.company); emitted by the move create

## Operations

- [appraisal-template.create](create.md): Make an appraisal template: KRAs and rating criteria, each with its weightage.
- [appraisal-template.get](get.md): Read one appraisal-template by its id: company, title, kras, criteria, state.
