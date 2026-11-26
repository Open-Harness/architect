<!-- Generated from the blueprint. Do not edit. -->
# personal-safe.list

List personal-safes, oldest first, 50 to a page, filtered by person.

**Who may call:** the system.

**A read:** answered from the records, with no handler. A page of 50 at a time, oldest first, narrowed by person; pass the answer's `next` as `cursor` for the page after it.

**Budget:** p95 80ms.

## Payload

| field | value | description |
|---|---|---|
| person (optional) | personal-safe.person | Whose Safe it is. |
| cursor (optional) | text |  |

## Answer

| field | value |
|---|---|
| items | schema |
| next | schema |

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| NotAllowed | 3 | AR-001 | the caller isn't the system; the handler never runs |

## Worked examples

### safe: a person opens their safe

Starts from an empty world.

- **Cy can't list the Safes: only the system can.** `cy` (signed in) calls and sends nothing, and is refused with NotAllowed, AR-001.
- **Ada's open wrote one Safe for Ada, and no second.** `nobody` (system) calls and sends person the cast's ada person, and gets back [[the cast's ada person, `none`, `none`, `unclaimed`, ``]].
- **Bo's open wrote one Safe for Bo, and no second.** `nobody` (system) calls and sends person the cast's bo person, and gets back [[the cast's bo person, `none`, `none`, `unclaimed`, ``]].
- **Cy's open wrote one Safe for Cy, and no second.** `nobody` (system) calls and sends person the cast's cy person, and gets back [[the cast's cy person, `none`, `none`, `unclaimed`, ``]].
- **no Safe in the world holds a salt nonce that isn't its own person's.** `nobody` (system) calls and sends nothing, and gets back [].

### safe: opening again is the same safe

Starts from the world `ada has opened her safe`.

- **the system lists that one Safe for Ada, and no other.** `nobody` (system) calls and sends person the cast's ada person, and gets back [[the world's adaSafe, the cast's ada person]].

## How to call

```sh
capxul personal-safe list [--person <person>] [--cursor <cursor>]
```

HTTP: `POST /personal-safe/list` with the payload as JSON. SDK: `Sdk.personal-safe.list(payload)`.
