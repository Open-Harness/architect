<!-- Generated from the blueprint. Do not edit. -->
# proposal.waiting

List proposals, oldest first, 25 to a page, filtered by superagent.

**Who may call:** anyone signed in, or the itsMain of its superagent.

**A read:** answered from the records, with no handler. A page of 25 at a time, oldest first, narrowed by superagent; pass the answer's `next` as `cursor` for the page after it.

## Payload

| field | value |
|---|---|
| superagent (optional) | proposal.superagent |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in, or the itsMain of its superagent; the handler never runs |

## How to call

```sh
superagent proposal waiting [--superagent <superagent>] [--cursor <cursor>]
```

HTTP: `POST /proposal/waiting` with the payload as JSON. SDK: `Sdk.proposal.waiting(payload)`.
