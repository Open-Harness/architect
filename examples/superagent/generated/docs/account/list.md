<!-- Generated from the blueprint. Do not edit. -->
# account.list

Let an account ask: its person's words may then start work.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| account | account.id |

## Answer

(none)

## Move

`list`: from seen or unlisted to listed, emitting AccountListed.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AccountExists | 82 | AC-001 | another account holds this superagent, source and external; by the rule account.oneAccountPerExternalId, carrying superagent, source, external |
| AccountNotSeen | 81 | AC-900 | the account is in a state list can't start from; carries `state` |
| AccountNotFound | 4 | AC-901 | nothing has the id in account; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent account list --account <account>
```

HTTP: `POST /account/list` with the payload as JSON. SDK: `Sdk.account.list(payload)`.
