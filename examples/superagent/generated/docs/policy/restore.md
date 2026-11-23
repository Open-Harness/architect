<!-- Generated from the blueprint. Do not edit. -->
# policy.restore

Save an earlier version again, as a new one.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | policy.superagent |
| revision | policy.revision |
| base | uint |

## Answer

| field | value |
|---|---|
| revision | policy.revision |

## Move

`restore`: from nothing (it creates) to current, emitting PolicyChanged.

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| StaleRevision | 87 | SU-002 | the policy is in a state restore can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent policy restore --superagent <superagent> --revision <revision> --base <base>
```

HTTP: `POST /policy/restore` with the payload as JSON. SDK: `Sdk.policy.restore(payload)`.
