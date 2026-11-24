<!-- Generated from the blueprint. Do not edit. -->
# ticket.report

The executor says how the work stands: progress, waiting, ready, blocked, failed or dropped.

**Who may call:** the itsAgent of the ticket.

## Payload

| field | value |
|---|---|
| ticket | ticket.id |
| kind | schema |
| text | text |

## Answer

(none)

## Steps

- `ticket.report.write` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the itsAgent of the ticket; the handler never runs |

## How to call

```sh
superagent ticket report --ticket <ticket> --kind <kind> --text <text>
```

HTTP: `POST /ticket/report` with the payload as JSON. SDK: `Sdk.ticket.report(payload)`.
