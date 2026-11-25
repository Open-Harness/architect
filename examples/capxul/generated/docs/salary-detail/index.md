<!-- Generated from the blueprint. Do not edit. -->
# salary-detail

One line of a salary structure: a component and what it pays.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| salaryStructure | salary-structure.id |
| type | ComponentType |
| line | LineNumber |
| salaryComponent | salary-component.id |
| amount | Amount |

## Operations

- [salary-detail.list](list.md): List salary-details, oldest first, 100 to a page, filtered by salaryStructure.
