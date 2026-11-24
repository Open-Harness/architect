<!-- Generated from the blueprint. Do not edit. -->
# trigger.handback

The executor hands a trigger back: it was not its to answer.

**Who may call:** the itsAgent of its ticket.

## Payload

| field | value |
|---|---|
| ticket | ticket.id |
| trigger | trigger.id |

## Answer

(none)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TriggerNotFound | 4 | TR-901 | nothing has the id in trigger; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the itsAgent of its ticket; the handler never runs |

## How to call

```sh
superagent trigger handback --ticket <ticket> --trigger <trigger>
```

HTTP: `POST /trigger/handback` with the payload as JSON. SDK: `Sdk.trigger.handback(payload)`.
