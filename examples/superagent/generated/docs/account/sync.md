<!-- Generated from the blueprint. Do not edit. -->
# account.sync

List the accounts a connection's own roster names: a repository's collaborators, a user group.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | account.superagent |
| source | account.source |

## Answer

(none)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent account sync --superagent <superagent> --source <source>
```

HTTP: `POST /account/sync` with the payload as JSON. SDK: `Sdk.account.sync(payload)`.
