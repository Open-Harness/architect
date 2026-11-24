<!-- Generated from the blueprint. Do not edit. -->
# report

How the executor says a ticket stands. Its state is its kind.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | superagent.id |
| ticket | ticket.id |
| text | text |
| seq | uint |

## Machine

States: progress, waiting, ready, blocked, failed, dropped. A move from the wrong state is refused ReportNotProgress (exit 99).

| move | from | to | emits |
|---|---|---|---|
| made | (creates) | progress, waiting, ready, blocked, failed, dropped | ReportMade |

## Events

- `ReportMade`: carries superagent (report.superagent), report (report.id), ticket (report.ticket); emitted by the move made

## Operations

(none yet)
