<!-- Generated from the blueprint. Do not edit. -->
# employee-promotion

A change of an employee's job title, from one day.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| employee | employee.id |  |
| promotionDate | Day |  |
| currentDesignation | designation.id | The job title the employee held when the promotion was drafted. |
| newDesignation | designation.id | The job title the employee holds once it is submitted. |

## Machine

States: draft, submitted, cancelled. A move from the wrong state is refused EmployeePromotionNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | EmployeePromotionDrafted |
| submit | draft | submitted | EmployeePromoted |
| cancel | submitted | cancelled | EmployeePromotionCancelled |

## Events

- `EmployeePromoted`: carries employeePromotion (employee-promotion.id), employee (employee-promotion.employee), designation (employee-promotion.newDesignation: The job title the employee holds once it is submitted.); emitted by the move submit
- `EmployeePromotionCancelled`: carries employeePromotion (employee-promotion.id), employee (employee-promotion.employee), designation (employee-promotion.currentDesignation: The job title the employee held when the promotion was drafted.); emitted by the move cancel
- `EmployeePromotionDrafted`: carries employeePromotion (employee-promotion.id), employee (employee-promotion.employee); emitted by the move create

## Operations

- [employee-promotion.cancel](cancel.md): Cancel a submitted promotion, putting back the job title it replaced.
- [employee-promotion.create](create.md): Draft a promotion: an employee's new job title, from a day.
- [employee-promotion.get](get.md): Read one employee-promotion by its id: company, employee, promotionDate, currentDesignation, newDesignation, state.
- [employee-promotion.submit](submit.md): Submit a promotion on or after its day, giving the employee the new job title.
