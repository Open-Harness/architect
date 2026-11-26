<!-- Generated from the blueprint. Do not edit. -->
# personal-safe.get

Read one personal-safe by its id: person, saltNonce, signer, firstOwner, account, state.

**Who may call:** the holder of the personal-safe.

**A read:** answered from the records, with no handler.

**Budget:** p95 50ms.

## Payload

| field | value |
|---|---|
| id | personal-safe.id |

## Answer

| field | value | description |
|---|---|---|
| person | personal-safe.person | Whose Safe it is. |
| saltNonce | personal-safe.saltNonce | The salt nonce its address is worked out from, kept at open so the address can be checked again. |
| signer (optional) | personal-safe.signer | The key the person proved they hold, set at claim (S1b). |
| firstOwner (optional) | personal-safe.firstOwner | The one owner it is set up with, set at claim: the signer, on the environment's chain. |
| account (optional) | personal-safe.account | Its address once claimed, worked out before it is deployed, checksummed (EIP-55). |
| state | text |  |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the holder of the personal-safe; the handler never runs |

## Worked examples

### safe: a person opens their safe

Starts from an empty world.

- **Bo can't read Ada's Safe.** `bo` (signed in) calls and sends id the last call's safe, and is refused with NotAllowed, AR-001.
- **Ada reads it back: hers, unclaimed, with her salt nonce, and no signer, owner or address yet.** `ada` (signed in) calls and sends id the last call's safe, and gets back [the cast's ada person, `none`, `none`, `none`, `unclaimed`] and gets back ``.
- **Ada can't read Bo's.** `ada` (signed in) calls and sends id the last call's safe, and is refused with NotAllowed, AR-001.
- **Bo's agent reads it back: Bo's, unclaimed, with his own salt nonce.** `bo` (signed in) calls and sends id the last call's safe, and gets back [the cast's bo person, `none`, `none`, `none`, `unclaimed`] and gets back ``.
- **Cy reads it back: hers, unclaimed, with her salt nonce, and no signer, owner or address yet.** `cy` (signed in) calls and sends id the last call's safe, and gets back [the cast's cy person, `none`, `none`, `none`, `unclaimed`] and gets back ``.

### safe: opening again is the same safe

Starts from the world `ada has opened her safe`.

- **that Safe is hers, unclaimed, with her salt nonce.** `ada` (signed in) calls and sends id the world's adaSafe, and gets back [the cast's ada person, `none`, `unclaimed`] and gets back ``.

## How to call

```sh
capxul personal-safe get --id <id>
```

HTTP: `POST /personal-safe/get` with the payload as JSON. SDK: `Sdk.personal-safe.get(payload)`.
