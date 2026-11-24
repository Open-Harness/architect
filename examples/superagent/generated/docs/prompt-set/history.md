<!-- Generated from the blueprint. Do not edit. -->
# prompt-set.history

Every saved version, newest first, each row its number, when, by whom, and the one it was made from.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | prompt-set.superagent |

## Answer

| field | value |
|---|---|
| entries | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent prompt-set history --superagent <superagent>
```

HTTP: `POST /prompt-set/history` with the payload as JSON. SDK: `Sdk.prompt-set.history(payload)`.
