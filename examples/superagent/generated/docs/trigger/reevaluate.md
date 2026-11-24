<!-- Generated from the blueprint. Do not edit. -->
# trigger.reevaluate

Ask the main agent to judge a trigger again.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| trigger | trigger.id |

## Answer

(none)

## Steps

- `trigger.reevaluate.release` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| TriggerNotFound | 4 | TR-901 | nothing has the id in trigger; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent trigger reevaluate --trigger <trigger>
```

HTTP: `POST /trigger/reevaluate` with the payload as JSON. SDK: `Sdk.trigger.reevaluate(payload)`.
