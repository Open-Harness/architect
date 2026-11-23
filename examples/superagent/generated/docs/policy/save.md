<!-- Generated from the blueprint. Do not edit. -->
# policy.save

Save a new version of the policy. A save made from an older version is refused, with the current one.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | policy.superagent |
| base | uint |
| mode | policy.mode |
| allowed | policy.allowed |
| bots | policy.bots |
| admission | policy.admission |
| rules | policy.rules |

## Answer

| field | value |
|---|---|
| revision | policy.revision |

## Move

`save`: from nothing (it creates) to current, emitting PolicyChanged.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| StaleRevision | 87 | SU-002 | the policy is in a state save can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent policy save --superagent <superagent> --base <base> --mode <mode> --allowed <allowed> --bots <bots> --admission <admission> --rules <rules>
```

HTTP: `POST /policy/save` with the payload as JSON. SDK: `Sdk.policy.save(payload)`.
