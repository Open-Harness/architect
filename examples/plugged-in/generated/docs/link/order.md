<!-- Generated from the blueprint. Do not edit. -->
# link.order

Move a link to a zero-based position. A position past the end puts it last.

**Who may call:** the linkOwner of the link.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| link | link.id | The link's own id. |
| position | LinkPosition | Its place in the page's list of links: 0 is first. |

## Answer

(none)

## Steps

- `link.order.load` (database)
- `link.order.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| LinkAlreadyRemoved | 32 | LN-002 | declared in errors.ts |
| NotAllowed | 3 | AR-001 | the caller isn't the linkOwner of the link; the handler never runs |

## Worked examples

### a stranger cannot edit a page

Starts from the world `page-to-guard`.

- **bob cannot move aaron's link, and the handler never runs.** `bob` (signed in) calls and sends link the world's lastLink, position `0`, and is refused with NotAllowed, AR-001.

### add, order and remove a link

Starts from the world `page-to-edit`.

- **aaron moves the newsletter to the top.** `aaron` (signed in) calls and sends link the last call's links 3 id, position `0`, and is answered.
- **a position past the end puts a link last.** `aaron` (signed in) calls and sends link the last call's links 1 id, position `99`, and is answered.
- **he cannot move a removed link.** `aaron` (signed in) calls and sends link the world's lastLink, position `0`, and is refused with LinkAlreadyRemoved, LN-002.

## How to call

```sh
plugged-in link order --link <link> --position <position>
```

HTTP: `POST /link/order` with the payload as JSON. SDK: `Sdk.link.order(payload)`.
