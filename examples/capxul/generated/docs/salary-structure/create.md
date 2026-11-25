<!-- Generated from the blueprint. Do not edit. -->
# salary-structure.create

Draft a salary structure with its earnings and deductions.

**Who may call:** the owner of its company.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 200ms.

## Payload

| field | value | description |
|---|---|---|
| company | salary-structure.company |  |
| salaryStructureName | salary-structure.salaryStructureName |  |
| earnings | schema | Its earnings, in order: each a component and its amount, 0 for the component's own. At most 50. |
| deductions | schema | Its deductions, in order: each a component and its amount, 0 for the component's own. At most 50. |

## Answer

| field | value | description |
|---|---|---|
| salaryStructure | salary-structure.id |  |
| totalEarning | salary-structure.totalEarning |  |
| totalDeduction | salary-structure.totalDeduction |  |
| netPay | salary-structure.netPay | Its earnings less its deductions, in USDC base units. |

## Move

`create`: from nothing (it creates) to draft, emitting SalaryStructureDrafted.

## Steps

- `salary-structure.create.load` (database)
- `salary-structure.create.insert` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| StructureWithoutEarnings | 41 | SS-001 | declared in errors.ts |
| StructureComponentNotInCompany | 42 | SS-002 | declared in errors.ts, carrying salaryComponent |
| StructureComponentWrongType | 43 | SS-003 | declared in errors.ts, carrying salaryComponent |
| StructureLineWithoutAmount | 44 | SS-004 | declared in errors.ts, carrying salaryComponent |
| StructureComponentRepeated | 45 | SS-005 | declared in errors.ts, carrying salaryComponent |
| SalaryStructureNameTaken | 48 | SS-008 | another salary structure holds this company and salary structure name; by the rule salary-structure.oneNamePerCompany |
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### assign salary structures

Starts from the world `a payroll outsider`.

- **Ada drafts a second structure: Basic at its own 3,000.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Leads`, earnings [{ salaryComponent: the world's basic, amount: `0` }], deductions [], and is answered.
- **and drafts a structure there.** `ada` (role company.owner) calls and sends company the world's otherCompany, salaryStructureName `Drivers`, earnings [{ salaryComponent: the last call's salaryComponent, amount: `0` }], deductions [], and is answered.
- **Ada drafts a seniors' structure: Basic at 5,000.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Seniors`, earnings [{ salaryComponent: the world's basic, amount: `5000000000` }], deductions [], and is answered.
- **Ada drafts a structure for temporary staff: Basic at its own 3,000.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Temps`, earnings [{ salaryComponent: the world's basic, amount: `0` }], deductions [], and is answered.

### pay a month

Starts from the world `a pension component`.

- **Ada drafts the engineers' structure: Basic and Pension at their own amounts, Housing at 500 USDC.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Engineers`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the world's housing, amount: `500000000` }], deductions [{ salaryComponent: the world's pensionComponent, amount: `0` }], and gets back [`3500000000`, `150000000`, `3350000000`].

### run a payroll

Starts from the world `an outside cost center`.

- **Ada drafts a seniors' structure: Basic at 5,000, nothing deducted.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Seniors`, earnings [{ salaryComponent: the world's basic, amount: `5000000000` }], deductions [], and is answered.
- **Ada drafts a structure paying nothing net: Basic at 150, less Pension at its own 150.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Volunteers`, earnings [{ salaryComponent: the world's basic, amount: `150000000` }], deductions [{ salaryComponent: the world's pensionComponent, amount: `0` }], and is answered.
- **she drafts a structure: Basic, less the meals deduction, then Pension.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Meal plan one`, earnings [{ salaryComponent: the world's basic, amount: `0` }], deductions [{ salaryComponent: the last call's salaryComponent, amount: `0` }, { salaryComponent: the world's pensionComponent, amount: `0` }], and is answered.
- **she drafts another with the deductions the other way round.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Meal plan two`, earnings [{ salaryComponent: the world's basic, amount: `0` }], deductions [{ salaryComponent: the world's pensionComponent, amount: `0` }, { salaryComponent: the last call's items 1 salaryComponent, amount: `0` }], and is answered.
- **she drafts a structure paying it before Basic.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Shift plan one`, earnings [{ salaryComponent: the last call's salaryComponent, amount: `0` }, { salaryComponent: the world's basic, amount: `0` }], deductions [], and is answered.
- **she drafts another paying Basic first.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Shift plan two`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the last call's items 0 salaryComponent, amount: `0` }], deductions [], and is answered.

### set up salary structures

Starts from the world `a pension component`.

- **Bo can't draft a structure for Acme Trading.** `bo` (signed in) calls and sends company the world's company, salaryStructureName `Engineers`, earnings [{ salaryComponent: the world's basic, amount: `0` }], deductions [], and is refused with NotAllowed, AR-001.
- **a structure with no earning is refused.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Deductions only`, earnings [], deductions [{ salaryComponent: the world's pensionComponent, amount: `0` }], and is refused with StructureWithoutEarnings, SS-001.
- **so is one with no line at all.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Empty`, earnings [], deductions [], and is refused with StructureWithoutEarnings, SS-001.
- **Pension among the earnings is refused, naming it.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Wrong way round`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the world's pensionComponent, amount: `0` }], deductions [], and is refused with StructureComponentWrongType, SS-003, carrying salaryComponent the world's pensionComponent.
- **Housing among the deductions too.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Wrong way round`, earnings [{ salaryComponent: the world's basic, amount: `0` }], deductions [{ salaryComponent: the world's pensionComponent, amount: `0` }, { salaryComponent: the world's housing, amount: `9000000` }], and is refused with StructureComponentWrongType, SS-003, carrying salaryComponent the world's housing.
- **a line that pays nothing is refused, naming it: Housing has no default.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Unpaid housing`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the world's housing, amount: `0` }], deductions [{ salaryComponent: the world's pensionComponent, amount: `0` }], and is refused with StructureLineWithoutAmount, SS-004, carrying salaryComponent the world's housing.
- **the wrong type is judged before a line that pays nothing, even on a later line.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Unpaid housing`, earnings [{ salaryComponent: the world's housing, amount: `0` }, { salaryComponent: the world's pensionComponent, amount: `0` }], deductions [], and is refused with StructureComponentWrongType, SS-003, carrying salaryComponent the world's pensionComponent.
- **a component on two lines is refused, naming it.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Double basic`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the world's housing, amount: `500000000` }, { salaryComponent: the world's basic, amount: `100000000` }], deductions [], and is refused with StructureComponentRepeated, SS-005, carrying salaryComponent the world's basic.
- **a line that pays nothing is judged before a repeat.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Double basic`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the world's basic, amount: `100000000` }, { salaryComponent: the world's housing, amount: `0` }], deductions [], and is refused with StructureLineWithoutAmount, SS-004, carrying salaryComponent the world's housing.
- **no earning is judged before a component of the wrong type.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Deductions only`, earnings [], deductions [{ salaryComponent: the world's basic, amount: `0` }], and is refused with StructureWithoutEarnings, SS-001.
- **Acme Trading's structure can't pay Acme Logistics' Basic.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Borrowed`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the last call's salaryComponent, amount: `0` }], deductions [], and is refused with StructureComponentNotInCompany, SS-002, carrying salaryComponent the last call's salaryComponent.
- **another company's component is judged line by line: before a later line of the wrong type.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Borrowed`, earnings [{ salaryComponent: the last call's salaryComponent, amount: `0` }, { salaryComponent: the world's pensionComponent, amount: `0` }], deductions [], and is refused with StructureComponentNotInCompany, SS-002, carrying salaryComponent the last call's salaryComponent.
- **and after an earlier one.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Borrowed`, earnings [{ salaryComponent: the world's pensionComponent, amount: `0` }, { salaryComponent: the last call's salaryComponent, amount: `0` }], deductions [], and is refused with StructureComponentWrongType, SS-003, carrying salaryComponent the world's pensionComponent.
- **in the deductions too, after every earning.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Borrowed`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the world's housing, amount: `0` }], deductions [{ salaryComponent: the last call's salaryComponent, amount: `0` }], and is refused with StructureComponentNotInCompany, SS-002, carrying salaryComponent the last call's salaryComponent.
- **Acme Logistics can't pay Acme Trading's Pension either.** `ada` (role company.owner) calls and sends company the world's otherCompany, salaryStructureName `Drivers`, earnings [{ salaryComponent: the last call's salaryComponent, amount: `0` }], deductions [{ salaryComponent: the world's pensionComponent, amount: `0` }], and is refused with StructureComponentNotInCompany, SS-002, carrying salaryComponent the world's pensionComponent.
- **Acme Logistics may have its own structure of that name, from its own Basic.** `ada` (role company.owner) calls and sends company the world's otherCompany, salaryStructureName `Engineers`, earnings [{ salaryComponent: the last call's salaryComponent, amount: `0` }], deductions [], and gets back [`1000000000`, `0`, `1000000000`].
- **Ada drafts a structure: Basic at its own 3,000, Housing at 500, less Pension at 200, not its own 150.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Engineers`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the world's housing, amount: `500000000` }], deductions [{ salaryComponent: the world's pensionComponent, amount: `200000000` }], and gets back [`3500000000`, `200000000`, `3300000000`].
- **a name already used in the company is refused, though Acme Logistics has one too.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Engineers`, earnings [{ salaryComponent: the world's basic, amount: `0` }], deductions [], and is refused with SalaryStructureNameTaken, SS-008.
- **and judged after the lines.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Engineers`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the world's basic, amount: `1` }], deductions [], and is refused with StructureComponentRepeated, SS-005, carrying salaryComponent the world's basic.
- **Ada drafts another: Basic at 100 less Pension at its own 150, a net pay below nothing.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Interns`, earnings [{ salaryComponent: the world's basic, amount: `100000000` }], deductions [{ salaryComponent: the world's pensionComponent, amount: `0` }], and gets back [`100000000`, `150000000`, `-50000000`].
- **Ada drafts another: Basic at 150 less Pension at 150, a net pay of nothing.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Apprentices`, earnings [{ salaryComponent: the world's basic, amount: `150000000` }], deductions [{ salaryComponent: the world's pensionComponent, amount: `150000000` }], and gets back [`150000000`, `150000000`, `0`].
- **Ada drafts another with no deduction: Housing at 1 base unit.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Leads`, earnings [{ salaryComponent: the world's housing, amount: `1` }, { salaryComponent: the world's basic, amount: `4000000000` }], deductions [], and gets back [`4000000001`, `0`, `4000000001`].
- **with three lines paying nothing, the first is named.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Unpaid`, earnings [{ salaryComponent: the last call's salaryComponent, amount: `0` }, { salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the world's housing, amount: `0` }], deductions [], and is refused with StructureLineWithoutAmount, SS-004, carrying salaryComponent the last call's salaryComponent.
- **with two components repeated, the one on the first line repeating an earlier one is named.** `ada` (role company.owner) calls and sends company the world's company, salaryStructureName `Doubled`, earnings [{ salaryComponent: the world's basic, amount: `0` }, { salaryComponent: the world's housing, amount: `500000000` }, { salaryComponent: the world's housing, amount: `1` }, { salaryComponent: the world's basic, amount: `1` }], deductions [], and is refused with StructureComponentRepeated, SS-005, carrying salaryComponent the world's housing.

## How to call

```sh
capxul salary-structure create --company <company> --salaryStructureName <salaryStructureName> --earnings <earnings> --deductions <deductions>
```

HTTP: `POST /salary-structure/create` with the payload as JSON. SDK: `Sdk.salary-structure.create(payload)`.
