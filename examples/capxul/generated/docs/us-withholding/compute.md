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
| AmountNegative | 41 | UW-001 | declared in errors.ts, carrying figure |
| AmountFractional | 42 | UW-002 | declared in errors.ts, carrying figure |
| AmountNotANumber | 43 | UW-003 | declared in errors.ts, carrying figure |
| WorkStateUnknown | 44 | UW-004 | declared in errors.ts, carrying workState |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## Worked examples

### tax-us: the piece's footing

Starts from an empty world.

- **a negative wage is refused, naming the wage.** `ada` (signed in) calls and sends wage `-1`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountNegative, UW-001, carrying figure `wage`.
- **a wage that isn't whole base units is refused, naming the wage.** `ada` (signed in) calls and sends wage `1500000000.5`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountFractional, UW-002, carrying figure `wage`.
- **a wage that isn't a number is refused, naming the wage.** `ada` (signed in) calls and sends wage `abc`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountNotANumber, UW-003, carrying figure `wage`.
- **a negative year to date is refused, naming the year to date.** `ada` (signed in) calls and sends wage `1500000000`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `-1`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountNegative, UW-001, carrying figure `yearToDate`.
- **a year to date that isn't whole base units is refused, naming the year to date.** `ada` (signed in) calls and sends wage `1500000000`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `3000000000.25`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountFractional, UW-002, carrying figure `yearToDate`.
- **a year to date that isn't a number is refused, naming the year to date.** `ada` (signed in) calls and sends wage `0`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `ten`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountNotANumber, UW-003, carrying figure `yearToDate`.
- **a work state that isn't one of the fifty or DC is refused, naming it.** `ada` (signed in) calls and sends wage `1500000000`, frequency `biweekly`, payDate `2026-12-04`, workState `PR`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with WorkStateUnknown, UW-004, carrying workState `PR`.
- **a wage of nothing, with no Step 4(c) extra withholding, gives no lines: a line of nothing is left out.** `ada` (signed in) calls and sends wage `0`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **a wage of " " isn't a number, and is refused, naming the wage.** `ada` (signed in) calls and sends wage ` `, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountNotANumber, UW-003, carrying figure `wage`.
- **a wage of "12abc" isn't a number, and is refused, naming the wage.** `ada` (signed in) calls and sends wage `12abc`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountNotANumber, UW-003, carrying figure `wage`.
- **a wage of "-" isn't a number, and is refused, naming the wage.** `ada` (signed in) calls and sends wage `-`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountNotANumber, UW-003, carrying figure `wage`.
- **any wage below nothing is refused, not only one base unit below.** `ada` (signed in) calls and sends wage `-5`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountNegative, UW-001, carrying figure `wage`.
- **any fraction of a base unit is refused.** `ada` (signed in) calls and sends wage `1.75`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountFractional, UW-002, carrying figure `wage`.
- **the year to date is read whole, as the wage is.** `ada` (signed in) calls and sends wage `1500000000`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `12abc`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and is refused with AmountNotANumber, UW-003, carrying figure `yearToDate`.
- **a pay of 1,500 dollars gives no lines yet: no rows, so every tax is nothing and left out.** `ada` (signed in) calls and sends wage `1500000000`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **a wage past 2^53 base units is taken, not refused or rounded.** `ada` (signed in) calls and sends wage `9007199254740993`, frequency `biweekly`, payDate `2026-12-04`, workState `TX`, yearToDate `9007199254740993`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **California is a work state as Texas is.** `ada` (signed in) calls and sends wage `0`, frequency `biweekly`, payDate `2026-12-04`, workState `CA`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **a weekly pay is taken.** `ada` (signed in) calls and sends wage `0`, frequency `weekly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **a semimonthly pay is taken.** `ada` (signed in) calls and sends wage `0`, frequency `semimonthly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **a monthly pay is taken.** `ada` (signed in) calls and sends wage `0`, frequency `monthly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **a quarterly pay is taken.** `ada` (signed in) calls and sends wage `0`, frequency `quarterly`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **a semiannual pay is taken.** `ada` (signed in) calls and sends wage `0`, frequency `semiannual`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **a annual pay is taken.** `ada` (signed in) calls and sends wage `0`, frequency `annual`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **a daily pay is taken.** `ada` (signed in) calls and sends wage `0`, frequency `daily`, payDate `2026-12-04`, workState `TX`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].
- **DC is a work state as the fifty are.** `ada` (signed in) calls and sends wage `0`, frequency `biweekly`, payDate `2026-12-04`, workState `DC`, yearToDate `0`, w4 { filingStatus: `single`, step2: false, step3Credits: `0`, step4aOtherIncome: `0`, step4bDeductions: `0`, step4cExtraWithholding: `0` }, and gets back [].

## How to call

```sh
capxul us-withholding compute --wage <wage> --frequency <frequency> --payDate <payDate> --workState <workState> --yearToDate <yearToDate> --w4 <w4>
```

HTTP: `POST /us-withholding/compute` with the payload as JSON. SDK: `Sdk.us-withholding.compute(payload)`.
