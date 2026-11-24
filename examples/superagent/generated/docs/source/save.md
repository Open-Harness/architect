<!-- Generated from the blueprint. Do not edit. -->
# source.save

Save a connection: its kind and its configuration.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | source.superagent |
| name | source.name |
| kind | source.kind |
| config | source.config |

## Answer

| field | value |
|---|---|
| source | source.id |

## Move

`save`: from nothing (it creates) to setup, emitting SourceSaved.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent source save --superagent <superagent> --name <name> --kind <kind> --config <config>
```

HTTP: `POST /source/save` with the payload as JSON. SDK: `Sdk.source.save(payload)`.
