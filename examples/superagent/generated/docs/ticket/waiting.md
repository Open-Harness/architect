<!-- Generated from the blueprint. Do not edit. -->
# ticket.waiting

List tickets, newest first, 50 to a page, filtered by superagent, stage.

**Who may call:** anyone signed in, or the itsMain of its superagent.

**A read:** answered from the records, with no handler. A page of 50 at a time, newest first, narrowed by superagent; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 150ms.

## Payload

| field | value |
|---|---|
| superagent (optional) | ticket.superagent |
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
superagent ticket waiting [--superagent <superagent>] [--cursor <cursor>]
```

HTTP: `POST /ticket/waiting` with the payload as JSON. SDK: `Sdk.ticket.waiting(payload)`.
