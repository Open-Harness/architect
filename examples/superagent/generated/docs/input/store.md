<!-- Generated from the blueprint. Do not edit. -->
# input.store

Store a message for a ticket's executor: a person's, or a followed thread's trigger.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | input.superagent |
| ticket (optional) | id |
| thread | text |
| from | input.from |
| text | input.text |

## Answer

| field | value |
|---|---|
| input | input.id |

## Move

`stored`: from nothing (it creates) to waiting, emitting InputStored.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent input store --superagent <superagent> [--ticket <ticket>] --thread <thread> --from <from> --text <text>
```

HTTP: `POST /input/store` with the payload as JSON. SDK: `Sdk.input.store(payload)`.
