<!-- Generated from the blueprint. Do not edit. -->
# settings.save

Save a new version of the settings. A save made from an older version is refused, with the current one. A main agent may only propose it.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| base | uint |
| variables | settings.variables |
| blocked | settings.blocked |

## Answer

| field | value |
|---|---|
| settings | settings.id |
| revision | settings.revision |

## Move

`save`: from nothing (it creates) to current, emitting SettingsSaved.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| StaleRevision | 40 | SU-002 | the settings is in a state save can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent settings save --base <base> --variables <variables> --blocked <blocked>
```

HTTP: `POST /settings/save` with the payload as JSON. SDK: `Sdk.settings.save(payload)`.
