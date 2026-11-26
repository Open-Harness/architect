<!-- Generated from the blueprint. Do not edit. -->
# personal-safe

A person's own Safe: opened first, then claimed with the key they sign with, which gives its address.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id |  |
| person | id | Whose Safe it is. |
| saltNonce | SaltNonce | The salt nonce its address is worked out from, kept at open so the address can be checked again. |
| signer (optional) | schema | The key the person proved they hold, set at claim (S1b). |
| firstOwner (optional) | account | The one owner it is set up with, set at claim: the signer, on the environment's chain. |
| account (optional) | account | Its address once claimed, worked out before it is deployed, checksummed (EIP-55). |

## Machine

States: unclaimed. A move from the wrong state is refused PersonalSafeNotUnclaimed (exit 40).

| move | from | to | emits |
|---|---|---|---|
| open | (creates) | unclaimed | PersonalSafeOpened |

## Invariants

- `personal-safe.oneSafePerPerson`: another personal safe holds this person. Unique on person, in every state; refused SafeAlreadyOpen.

## Events

- `PersonalSafeOpened`: carries safe (personal-safe.id), person (personal-safe.person: Whose Safe it is.); emitted by the move open

## Roles

- holder

## Operations

- [personal-safe.get](get.md): Read one personal-safe by its id: person, saltNonce, signer, firstOwner, account, state.
- [personal-safe.list](list.md): List personal-safes, oldest first, 50 to a page.
- [personal-safe.open](open.md): Open your own Safe. It has no address until you claim it with the key you sign with.
