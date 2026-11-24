<!-- Generated from the blueprint. Do not edit. -->
# source.enable

Start listening on a connection.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| source | source.id |

## Answer

(none)

## Move

`enable`: from setup or paused or off or error to ready, emitting SourceEnabled.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SourceNotSetup | 80 | SO-900 | the source is in a state enable can't start from; carries `state` |
| SourceNotFound | 4 | SO-901 | nothing has the id in source; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent source enable --source <source>
```

HTTP: `POST /source/enable` with the payload as JSON. SDK: `Sdk.source.enable(payload)`.
