<!-- Generated from the blueprint. Do not edit. -->
# source.position-advanced

Record how far a connection has read, after a poll.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| source | source.id |
| position | source.position |

## Answer

(none)

## Move

`advance`: from ready to ready, emitting SourcePositionAdvanced.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SourceNotSetup | 80 | SO-900 | the source is in a state advance can't start from; carries `state` |
| SourceNotFound | 4 | SO-901 | nothing has the id in source; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent source position-advanced --source <source> --position <position>
```

HTTP: `POST /source/position-advanced` with the payload as JSON. SDK: `Sdk.source.position-advanced(payload)`.
