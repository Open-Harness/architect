<!-- Generated from the blueprint. Do not edit. -->
# leave-application.get

Read one leave-application by its id: company, employee, leaveType, fromDate, toDate, reason, totalLeaveDays, state.

**Who may call:** the self of its employee, or the owner of its company.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | leave-application.id |

## Answer

| field | value |
|---|---|
| company | leave-application.company |
| employee | leave-application.employee |
| leaveType | leave-application.leaveType |
| fromDate | leave-application.fromDate |
| toDate | leave-application.toDate |
| reason | leave-application.reason |
| totalLeaveDays | leave-application.totalLeaveDays |
| state | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the self of its employee, or the owner of its company; the handler never runs |

## Worked examples

### leave stays in its company

Starts from the world `a leave application`.

- **Olga reads it back approved.** `olga` (signed in) calls and sends id the world's leaveApplication, and gets back [the world's employee, `2027-03-01`, `2027-03-03`, `approved`].

### take leave

Starts from the world `a leave allocation`.

- **it reads back open, as she asked it.** `olga` (signed in) calls and sends id the last call's leaveApplication, and gets back [the world's company, the world's employee, the world's leaveType, `2027-03-01`, `2027-03-04`, `Family visit`, `4`, `open`].
- **Bo can't read it.** `bo` (signed in) calls and sends id the last call's leaveApplication, and is refused with NotAllowed, AR-001.
- **it reads back approved.** `ada` (role company.owner) calls and sends id the last call's leaveApplication, and gets back [`2027-03-01`, `2027-03-04`, `4`, `approved`].

## How to call

```sh
capxul leave-application get --id <id>
```

HTTP: `POST /leave-application/get` with the payload as JSON. SDK: `Sdk.leave-application.get(payload)`.
