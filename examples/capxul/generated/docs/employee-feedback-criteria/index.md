<!-- Generated from the blueprint. Do not edit. -->
# employee-feedback-criteria

Something a company rates its people on, in self-appraisals and colleagues' feedback.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| company | company.id |
| criteria | CriteriaName |

## Machine

States: active. A move from the wrong state is refused EmployeeFeedbackCriteriaNotActive (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | active | FeedbackCriteriaCreated |

## Invariants

- `employee-feedback-criteria.oneNamePerCompany`: another employee feedback criteria holds this company and criteria. Unique on company, criteria, in every state; refused CriteriaNameTaken.

## Events

- `FeedbackCriteriaCreated`: carries employeeFeedbackCriteria (employee-feedback-criteria.id), company (employee-feedback-criteria.company); emitted by the move create

## Operations

- [employee-feedback-criteria.create](create.md): Add something a company rates its people on.
- [employee-feedback-criteria.get](get.md): Read one employee-feedback-criteria by its id: company, criteria, state.
