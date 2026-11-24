<!-- Generated from the blueprint. Do not edit. -->
# attention

A question a person must answer, made by a report; a person's next message answers it.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | superagent.id |
| ticket | ticket.id |
| question | text |

## Machine

States: open. A move from the wrong state is refused AttentionNotOpen (exit 100).

| move | from | to | emits |
|---|---|---|---|
| raise | (creates) | open | AttentionRaised |

## Events

- `AttentionRaised`: carries superagent (attention.superagent), attention (attention.id), ticket (attention.ticket); emitted by the move raise

## Operations

(none yet)
