<!-- Generated from the blueprint. Do not edit. -->
# prompt-set.compose

Make the prompt for one agent's model request, from the current version.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | prompt-set.superagent |
| role | text |

## Answer

| field | value |
|---|---|
| text | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent prompt-set compose --superagent <superagent> --role <role>
```

HTTP: `POST /prompt-set/compose` with the payload as JSON. SDK: `Sdk.prompt-set.compose(payload)`.
