<!-- Generated from the blueprint. Do not edit. -->
# link.remove

Remove a link from a public page.

**Who may call:** the linkOwner of the link.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| link | link.id | The link's own id. |

## Answer

(none)

## Move

`remove`: from listed to removed, emitting LinkRemoved.

## Steps

- `link.remove.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| LinkNotListed | 31 | LN-900 | the link is in a state remove can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the linkOwner of the link; the handler never runs |

## Worked examples

### a stranger cannot edit a page

Starts from the world `page-to-guard`.

- **bob cannot remove aaron's link.** `bob` (signed in) calls and sends link the world's lastLink, and is refused with NotAllowed, AR-001.
- **someone who is not signed in cannot remove it either.** `visitor` (anyone) calls and sends link the world's lastLink, and is refused with NotAllowed, AR-001.

### add, order and remove a link

Starts from the world `page-to-edit`.

- **aaron removes the talks link.** `aaron` (signed in) calls and sends link the world's lastLink, and is answered.
- **he cannot remove it twice.** `aaron` (signed in) calls and sends link the world's lastLink, and is refused with LinkNotListed, LN-900, carrying state `removed`.

## How to call

```sh
plugged-in link remove --link <link>
```

HTTP: `POST /link/remove` with the payload as JSON. SDK: `Sdk.link.remove(payload)`.
