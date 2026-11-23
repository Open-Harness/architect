<!-- Generated from the blueprint. Do not edit. -->
# policy.sync

List the accounts a connection's roster names.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | policy.superagent |
| source | text |

## Answer

(none)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent policy sync --superagent <superagent> --source <source>
```

HTTP: `POST /policy/sync` with the payload as JSON. SDK: `Sdk.policy.sync(payload)`.
