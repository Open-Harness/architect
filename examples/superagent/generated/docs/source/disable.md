<!-- Generated from the blueprint. Do not edit. -->
# source.disable

Stop listening on a connection; its triggers already recorded stay.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| source | source.id |

## Answer

(none)

## Move

`disable`: from setup or ready or paused or error to paused or off, emitting SourceDisabled.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SourceNotSetup | 80 | SO-900 | the source is in a state disable can't start from; carries `state` |
| SourceNotFound | 4 | SO-901 | nothing has the id in source; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent source disable --source <source>
```

HTTP: `POST /source/disable` with the payload as JSON. SDK: `Sdk.source.disable(payload)`.
