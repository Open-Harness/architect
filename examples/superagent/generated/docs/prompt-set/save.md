<!-- Generated from the blueprint. Do not edit. -->
# prompt-set.save

Save a new version of the prompts. A save made from an older version is refused, with the current one.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | prompt-set.superagent |
| base | uint |
| sections | prompt-set.sections |
| skills | prompt-set.skills |
| overrides | prompt-set.overrides |
| why (optional) | text |

## Answer

| field | value |
|---|---|
| revision | prompt-set.revision |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| StaleRevision | ? | SU-002 | the prompt-set is in a state this can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent prompt-set save --superagent <superagent> --base <base> --sections <sections> --skills <skills> --overrides <overrides> [--why <why>]
```

HTTP: `POST /prompt-set/save` with the payload as JSON. SDK: `Sdk.prompt-set.save(payload)`.
