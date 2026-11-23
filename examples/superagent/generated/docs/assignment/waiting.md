<!-- Generated from the blueprint. Do not edit. -->
# assignment.waiting

List assignments, oldest first, 255 to a page, filtered by superagent, the rows with why person ahead of the rest.

**Who may call:** the system.

**A read:** answered from the records, with no handler. A page of 255 at a time, oldest first, narrowed by superagent; pass the answer's `next` as `cursor` for the page after it.

## Payload

| field | value |
|---|---|
| superagent (optional) | assignment.superagent |
| cursor (optional) | text |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## How to call

```sh
superagent assignment waiting [--superagent <superagent>] [--cursor <cursor>]
```

HTTP: `POST /assignment/waiting` with the payload as JSON. SDK: `Sdk.assignment.waiting(payload)`.
