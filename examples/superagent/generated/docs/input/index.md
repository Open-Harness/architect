<!-- Generated from the blueprint. Do not edit. -->
# input

One message for a ticket's executor, waiting for a seat, routed, delivered or failed.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | superagent.id |
| ticket | ticket.id |
| from | schema |
| text | text |
| seq | uint |
| retryAt | uint |
| refusals | uint |

## Machine

States: waiting, routed, delivered, failed. A move from the wrong state is refused InputNotWaiting (exit 98).

| move | from | to | emits |
|---|---|---|---|
| stored | (creates) | waiting | InputStored |
| routed | waiting | routed | InputRouted |
| requeued | routed, failed | waiting | InputStored |
| delivered | routed | delivered | InputDelivered |
| failed | routed | failed | InputFailed |

## Events

- `InputDelivered`: carries superagent (input.superagent), input (input.id); emitted by the move delivered
- `InputFailed`: carries superagent (input.superagent), input (input.id); emitted by the move failed
- `InputRouted`: carries superagent (input.superagent), input (input.id), ticket (input.ticket), agent (agent.id), assignment (id), text (input.text); emitted by the move routed
- `InputStored`: carries superagent (input.superagent), input (input.id), ticket (input.ticket); emitted by the move stored, requeued

## Operations

- [input.delivered](delivered.md): The executor took the Input.
- [input.delivery-failed](delivery-failed.md): The outbox gave up telling the executor.
- [input.read](read.md): Read one Input's text.
- [input.requeue](requeue.md): Put a refused or failed Input back to waiting, after a short wait that grows with each refusal.
- [input.route](route.md): Send a waiting Input to its running executor, or queue the Assignment that will start one.
- [input.store](store.md): Store a message for a ticket's executor: a person's, or a followed thread's trigger.
