<!-- Generated from the blueprint. Do not edit. -->
# us-withholding.compute

Work out one pay's US tax lines from its wage, frequency, pay date, work state, wages so far this year and W-4.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| wage | text |
| frequency | schema |
| payDate | day |
| workState | text |
| yearToDate | text |
| w4 | schema |

## Answer

| field | value |
|---|---|
| lines | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## Worked examples

### tax-us: the piece's footing

Starts from an empty world.

- **a negative wage is refused, naming the wage.** `ada` (signed in) calls and sends wage `-1`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountNegative, UW-001, carrying figure `wage`.
- **a wage that isn't whole base units is refused, naming the wage.** `ada` (signed in) calls and sends wage `1500000000.5`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountFractional, UW-002, carrying figure `wage`.
- **a work state that isn't one of the fifty or DC is refused, naming it.** `ada` (signed in) calls and sends wage `1500000000`, frequency `biweekly`, payDate `2026-12-04`, workState `PR`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with WorkStateUnknown, UW-004, carrying workState `PR`.
- **a wage of nothing, with no Step 4(c) extra withholding, gives no lines: a line of nothing is left out.** `ada` (signed in) calls and sends wage `0`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].

## How to call

```sh
capxul us-withholding compute --wage <wage> --frequency <frequency> --payDate <payDate> --workState <workState> --yearToDate <yearToDate> --w4 <w4>
```

HTTP: `POST /us-withholding/compute` with the payload as JSON. SDK: `Sdk.us-withholding.compute(payload)`.
