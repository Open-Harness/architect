<!-- Generated from the blueprint. Do not edit. -->
# trigger.receive

Store one event a connection brought, once: a second delivery of the same event is a duplicate, and one the policy filters is not kept.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | trigger.superagent |
| source | trigger.source |
| event | trigger.event |
| thread | trigger.thread |
| kind | trigger.kind |
| text | trigger.text |
| url (optional) | trigger.url |
| author (optional) | trigger.author |
| channel | trigger.channel |

## Answer

| field | value |
|---|---|
| trigger | trigger.id |
| outcome | schema |

## Move

`receive`: from nothing (it creates) to stored, emitting TriggerReceived.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent trigger receive --superagent <superagent> --source <source> --event <event> --thread <thread> --kind <kind> --text <text> [--url <url>] [--author <author>] --channel <channel>
```

HTTP: `POST /trigger/receive` with the payload as JSON. SDK: `Sdk.trigger.receive(payload)`.
