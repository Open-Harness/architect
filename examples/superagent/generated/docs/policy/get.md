<!-- Generated from the blueprint. Do not edit. -->
# policy.get

Read the policy: the current version, or the one named.

**Who may call:** anyone signed in, or the itsMain of its superagent.

## Payload

| field | value |
|---|---|
| superagent | policy.superagent |
| revision (optional) | uint |

## Answer

| field | value |
|---|---|
| revision | policy.revision |
| mode | policy.mode |
| allowed | policy.allowed |
| bots | policy.bots |
| admission | policy.admission |
| rules | policy.rules |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in, or the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent policy get --superagent <superagent> [--revision <revision>]
```

HTTP: `POST /policy/get` with the payload as JSON. SDK: `Sdk.policy.get(payload)`.
