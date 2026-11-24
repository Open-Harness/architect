<!-- Generated from the blueprint. Do not edit. -->
# source.problem

Say a connection has failed three polls in a row: it shows as a problem until a poll succeeds.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| source | source.id |

## Answer

(none)

## Move

`fail`: from ready to error, emitting SourceFailed.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SourceNotSetup | 80 | SO-900 | the source is in a state fail can't start from; carries `state` |
| SourceNotFound | 4 | SO-901 | nothing has the id in source; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent source problem --source <source>
```

HTTP: `POST /source/problem` with the payload as JSON. SDK: `Sdk.source.problem(payload)`.
