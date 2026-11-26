<!-- Generated from the blueprint. Do not edit. -->
# personal-safe.claim

Claim your Safe with the key you sign with, proving you hold it. This works out its address; nothing is sent to the chain.

**Who may call:** the holder of the personal-safe.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| safe | personal-safe.id |  |
| signer | EvmAddress | The key you sign with, which becomes the Safe's one owner. |
| proof | PersonalSignature | Your signer's personal_sign of "Capxul: claim Safe <safe> for <you>". |

## Answer

| field | value |
|---|---|
| safe | personal-safe.id |
| account | account |

## Move

`claim`: from unclaimed to claimed, emitting PersonalSafeClaimed.

## Steps

- `personal-safe.claim.update` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| SignerNotProven | 42 | SF-002 | declared in errors.ts, carrying signer |
| SafeAlreadyOpen | 41 | SF-001 | another personal safe holds this person; by the rule personal-safe.oneSafePerPerson, carrying person |
| PersonalSafeNotUnclaimed | 40 | SF-900 | the personal-safe is in a state claim can't start from; carries `state` |
| NotAllowed | 3 | AR-001 | the caller isn't the holder of the personal-safe; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## How to call

```sh
capxul personal-safe claim --safe <safe> --signer <signer> --proof <proof>
```

HTTP: `POST /personal-safe/claim` with the payload as JSON. SDK: `Sdk.personal-safe.claim(payload)`.
