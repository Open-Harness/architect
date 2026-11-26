<!-- Generated from the blueprint. Do not edit. -->
# salary-structure

A company's pay for a kind of role: the earnings and deductions each employee assigned to it is paid.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| company | company.id |  |
| salaryStructureName | StructureName |  |
| totalEarning | Amount |  |
| totalDeduction | Amount |  |
| netPay | Balance | Its earnings less its deductions, in USDC base units. |

## Machine

States: draft, submitted, cancelled. A move from the wrong state is refused SalaryStructureNotDraft (exit 40).

| move | from | to | emits |
|---|---|---|---|
| create | (creates) | draft | SalaryStructureDrafted |
| submit | draft | submitted | SalaryStructureSubmitted |
| cancel | submitted | cancelled | SalaryStructureCancelled |

## Invariants

- `salary-structure.oneNamePerCompany`: another salary structure holds this company and salary structure name. Unique on company, salaryStructureName, in every state; refused SalaryStructureNameTaken.

## Events

- `SalaryStructureCancelled`: carries salaryStructure (salary-structure.id); emitted by the move cancel
- `SalaryStructureDrafted`: carries salaryStructure (salary-structure.id), company (salary-structure.company), netPay (salary-structure.netPay: Its earnings less its deductions, in USDC base units.); emitted by the move create
- `SalaryStructureSubmitted`: carries salaryStructure (salary-structure.id); emitted by the move submit

## Operations

- [salary-structure.cancel](cancel.md): Cancel a submitted salary structure no assignment or salary slip uses.
- [salary-structure.create](create.md): Draft a salary structure with its earnings and deductions.
- [salary-structure.get](get.md): Read one salary-structure by its id: company, salaryStructureName, totalEarning, totalDeduction, netPay, state.
- [salary-structure.submit](submit.md): Submit a salary structure, so it can be assigned.
