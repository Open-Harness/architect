<!-- Generated from the blueprint. Do not edit. -->
# account.unlist

Stop letting an account ask.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| account | account.id |

## Answer

(none)

## Move

`unlist`: from listed to unlisted, emitting AccountUnlisted.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AccountExists | 82 | AC-001 | another account holds this superagent, source and external; by the rule account.oneAccountPerExternalId, carrying superagent, source, external |
| AccountNotSeen | 81 | AC-900 | the account is in a state unlist can't start from; carries `state` |
| AccountNotFound | 4 | AC-901 | nothing has the id in account; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent account unlist --account <account>
```

HTTP: `POST /account/unlist` with the payload as JSON. SDK: `Sdk.account.unlist(payload)`.
