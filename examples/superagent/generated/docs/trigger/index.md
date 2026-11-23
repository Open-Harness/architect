<!-- Generated from the blueprint. Do not edit. -->
# trigger

One event that came in from a connection. Never changed once stored.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | id |
| source | text |
| event | text |
| thread | text |
| kind | text |
| text | text |
| url (optional) | text |
| author (optional) | text |
| channel | schema |

## Machine

States: stored. A move from the wrong state is refused TriggerNotStored (exit 83).

| move | from | to | emits |
|---|---|---|---|
| receive | (creates) | stored | TriggerReceived |
| requeue | stored | stored | TriggerRequeued |

## Events

- `TriggerReceived`: carries superagent (trigger.superagent), trigger (trigger.id), thread (trigger.thread), text (trigger.text); emitted by the move receive
- `TriggerRequeued`: carries superagent (trigger.superagent), trigger (trigger.id); emitted by the move requeue

## Operations

- [trigger.handback](handback.md): The executor hands a trigger back: it was not its to answer.
- [trigger.receive](receive.md): Store one event a connection brought, once: a second delivery of the same event is a duplicate, and one the policy filters is not kept.
- [trigger.reevaluate](reevaluate.md): Ask the main agent to judge a trigger again.
- [trigger.requeue](requeue.md): Put a trigger back for evaluation.
