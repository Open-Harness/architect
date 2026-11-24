<!-- Generated from the blueprint. Do not edit. -->
# prompt-set.preview

Show the prompt an agent of one kind would get, with a draft applied.

**Who may call:** anyone signed in.

## Payload

| field | value |
|---|---|
| superagent | prompt-set.superagent |
| role | text |
| sections | prompt-set.sections |

## Answer

| field | value |
|---|---|
| text | text |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SuperagentNotFound | 4 | SU-901 | nothing has the id in superagent; the handler never runs; carries `id` |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |

## How to call

```sh
superagent prompt-set preview --superagent <superagent> --role <role> --sections <sections>
```

HTTP: `POST /prompt-set/preview` with the payload as JSON. SDK: `Sdk.prompt-set.preview(payload)`.
