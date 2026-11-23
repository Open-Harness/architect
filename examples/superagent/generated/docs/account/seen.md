<!-- Generated from the blueprint. Do not edit. -->
# account.seen

Record an account an event came from: a new one is seen, a known one keeps its state.

**Who may call:** the system.

## Payload

| field | value |
|---|---|
| superagent | account.superagent |
| source | account.source |
| external | account.external |
| login | account.login |
| bot | account.bot |

## Answer

| field | value |
|---|---|
| account | account.id |

## Move

`seen`: from nothing (it creates) to seen, emitting AccountSeen.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| AccountExists | 82 | AC-001 | another account holds this superagent, source and external; by the rule account.oneAccountPerExternalId, carrying superagent, source, external |
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent account seen --superagent <superagent> --source <source> --external <external> --login <login> --bot <bot>
```

HTTP: `POST /account/seen` with the payload as JSON. SDK: `Sdk.account.seen(payload)`.
