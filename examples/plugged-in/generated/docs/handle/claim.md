<!-- Generated from the blueprint. Do not edit. -->
# handle.claim

Claim a free name and make it the address of your public page, with its profile.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| name | handle.name | A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. |

## Answer

| field | value | description |
|---|---|---|
| handle | handle.id | The handle's own id. |

## Move

`claim`: from nothing (it creates) to claimed, emitting HandleClaimed.

## Steps

- `handle.claim.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| HandleTaken | 10 | HN-001 | another claimed handle holds this name; by the rule handle.oneHolderPerName |
| HandleAlreadyOwned | 12 | HN-002 | you already hold a name; by the rule handle.oneNamePerPerson |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### a name is claimed once

Starts from the world `claimed`.

- **the same request again answers the same handle and claims nothing.** `aaron` (signed in) calls and sends name `claimedname`, with the request key `first-claim`, and gets back the world's handle.
- **a taken name is refused.** `bob` (signed in) calls and sends name `claimedname`, with the request key `bobs-claim`, and is refused with HandleTaken, HN-001.
- **another person's request key is not aaron's: still refused.** `bob` (signed in) calls and sends name `claimedname`, with the request key `first-claim`, and is refused with HandleTaken, HN-001.
- **the refusal left bob free to claim a name of his own.** `bob` (signed in) calls and sends name `bobspage`, and is answered.

### a stranger cannot edit a page

Starts from the world `page-to-guard`.

- **someone who is not signed in cannot claim a name.** `visitor` (anyone) calls and sends name `visitorpage`, and is refused with NotAllowed, AR-001.

### claim a handle

Starts from an empty world.

- **aaron claims the free name.** `aaron` (signed in) calls and sends name `firstpage`, and gets back an answer matching `^hdl_[0-9a-z]+$`.
- **aaron cannot claim a second name while he holds one.** `aaron` (signed in) calls and sends name `secondpage`, and is refused with HandleAlreadyOwned, HN-002.

### release a handle

Starts from the world `claimed-to-release`.

- **someone else claims the released name.** `bob` (signed in) calls and sends name `releasepage`, and is answered.
- **aaron can claim again: a released handle does not count as one he holds.** `aaron` (signed in) calls and sends name `aaronspage`, and is answered.

### a person claims a page and shares it

Starts from an empty world.

- **aaron claims @aaron.** `aaron` (signed in) calls and sends name `aaron`, and gets back an answer matching `^hdl_[0-9a-z]+$`.

## How to call

```sh
plugged-in handle claim --name <name>
```

HTTP: `POST /handle/claim` with the payload as JSON. SDK: `Sdk.handle.claim(payload)`.
