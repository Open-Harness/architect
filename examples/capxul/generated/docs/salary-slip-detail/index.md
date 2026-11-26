<!-- Generated from the blueprint. Do not edit. -->
# salary-slip-detail

One line of a salary slip: a component and what it paid.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| salarySlip | salary-slip.id |
| type | ComponentType |
| line | LineNumber |
| salaryComponent | salary-component.id |
| amount | Amount |

## Operations

- [salary-slip-detail.list](list.md): List salary-slip-details, oldest first, 100 to a page, filtered by salarySlip.
