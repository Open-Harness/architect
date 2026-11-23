<!-- Generated from the blueprint. Do not edit. -->
# handle.release

Free your name and take its public page offline. Anyone may claim the name afterwards.

**Who may call:** the handleOwner of the handle.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| handle | handle.id | The handle's own id. |

## Answer

(none)

## Move

`release`: from claimed to released, emitting HandleReleased.

## Steps

- `handle.release.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HandleNotClaimed | 11 | HN-900 | the handle is in a state release can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the handleOwner of the handle; the handler never runs |

## Worked examples

### a stranger cannot edit a page

Starts from the world `page-to-guard`.

- **bob cannot release aaron's name.** `bob` (signed in) calls and sends handle the last call's handle, and is refused with NotAllowed, AR-001.

### release a handle

Starts from the world `claimed-to-release`.

- **bob cannot release aaron's name.** `bob` (signed in) calls and sends handle the world's handle, and is refused with NotAllowed, AR-001.
- **aaron releases his name.** `aaron` (signed in) calls and sends handle the world's handle, and is answered.
- **he cannot release it twice.** `aaron` (signed in) calls and sends handle the world's handle, and is refused with HandleNotClaimed, HN-900, carrying state `released`.
- **the old handle is not bob's: he cannot release it, and it stays released.** `bob` (signed in) calls and sends handle the world's handle, and is refused with NotAllowed, AR-001.

## How to call

```sh
plugged-in handle release --handle <handle>
```

HTTP: `POST /handle/release` with the payload as JSON. SDK: `Sdk.handle.release(payload)`.
