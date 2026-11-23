<!-- Generated from the blueprint. Do not edit. -->
# policy.history

Every saved version, newest first, each row its number, when, by whom, and the one it was made from.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | policy.superagent |

## Answer

| field | value |
|---|---|
| entries | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent policy history --superagent <superagent>
```

HTTP: `POST /policy/history` with the payload as JSON. SDK: `Sdk.policy.history(payload)`.
