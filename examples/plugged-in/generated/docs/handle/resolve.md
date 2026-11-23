<!-- Generated from the blueprint. Do not edit. -->
# handle.resolve

Find the handle that holds a claimed name. A released or unclaimed name has none.

**Who may call:** anyone.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| name | handle.name | A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. |

## Answer

| field | value | description |
|---|---|---|
| handle | handle.id | The handle's own id. |

## Steps

- `handle.resolve.load` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HandleNotFound | 13 | HN-003 | declared in errors.ts |

## Worked examples

### a name is claimed once

Starts from the world `claimed`.

- **the name still resolves to aaron's handle.** `visitor` (anyone) calls and sends name `claimedname`, and gets back the world's handle.

### a stranger cannot edit a page

Starts from the world `page-to-guard`.

- **aaron's name resolves, for anyone.** `visitor` (anyone) calls and sends name `guardpage`, and gets back an answer matching `^hdl_[0-9a-z]+$`.

### anyone reads a public page

Starts from the world `page-with-links`.

- **a visitor resolves the name to a handle.** `visitor` (anyone) calls and sends name `linkpage`, and gets back an answer matching `^hdl_[0-9a-z]+$`.
- **a name nobody claimed does not resolve.** `visitor` (anyone) calls and sends name `nosuchpage`, and is refused with HandleNotFound, HN-003.

### claim a handle

Starts from an empty world.

- **a name nobody has claimed does not resolve.** `visitor` (anyone) calls and sends name `firstpage`, and is refused with HandleNotFound, HN-003.
- **the name now resolves to a handle.** `visitor` (anyone) calls and sends name `firstpage`, and gets back an answer matching `^hdl_[0-9a-z]+$`.
- **the refused second name is still free.** `visitor` (anyone) calls and sends name `secondpage`, and is refused with HandleNotFound, HN-003.

### release a handle

Starts from the world `claimed-to-release`.

- **the released name no longer resolves.** `visitor` (anyone) calls and sends name `releasepage`, and is refused with HandleNotFound, HN-003.

## How to call

```sh
plugged-in handle resolve --name <name>
```

HTTP: `POST /handle/resolve` with the payload as JSON. SDK: `Sdk.handle.resolve(payload)`.
