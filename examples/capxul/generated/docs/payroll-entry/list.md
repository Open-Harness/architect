<!-- Generated from the blueprint. Do not edit. -->
# payroll-entry.list

List payroll-entrys, oldest first, 50 to a page, filtered by company.

**Who may call:** the owner of its company.

**A read:** answered from the records, with no handler. A page of 50 at a time, oldest first, narrowed by company; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value |
|---|---|
| company (optional) | payroll-entry.company |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the owner of its company; the handler never runs |

## Worked examples

### run a payroll

Starts from the world `an outside cost center`.

- **Bo can't list Acme Trading's payroll entries.** `bo` (signed in) calls and sends company the world's company, and is refused with NotAllowed, AR-001.
- **Acme Trading's payroll entries, oldest first.** `ada` (role company.owner) calls and sends company the world's company, and gets back [[`2026-02-01`, `2026-02-28`, `1`, `accrued`], [`2026-02-02`, `2026-02-28`, `1`, `draft`], [`2026-03-01`, `2026-03-31`, `1`, `draft`], [`2026-03-01`, `2026-03-31`, `2`, `draft`], [`2026-03-02`, `2026-03-31`, `2`, `draft`]].
- **Ada lists the entries again.** `ada` (role company.owner) calls and sends company the world's company, and gets back 5.
- **Ada lists the entries again.** `ada` (role company.owner) calls and sends company the world's company, and gets back 6.
- **Ada lists the entries again.** `ada` (role company.owner) calls and sends company the world's company, and gets back 7.
- **Ada lists the entries again.** `ada` (role company.owner) calls and sends company the world's company, and gets back 8.
- **Ada lists the entries again.** `ada` (role company.owner) calls and sends company the world's company, and gets back 9.
- **Ada lists the entries again.** `ada` (role company.owner) calls and sends company the world's company, and gets back 14.

## How to call

```sh
capxul payroll-entry list [--company <company>] [--cursor <cursor>]
```

HTTP: `POST /payroll-entry/list` with the payload as JSON. SDK: `Sdk.payroll-entry.list(payload)`.
