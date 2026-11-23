<!-- Generated from the blueprint. Do not edit. -->
# handle

A public name that belongs to one person until they release it, and is the address of a public page.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id | The handle's own id. |
| name | HandleName | A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. |
| owner | id | The person who holds the name. |

## Machine

States: claimed, released. A move from the wrong state is refused HandleNotClaimed (exit 11).

| move | from | to | emits |
|---|---|---|---|
| claim | (creates) | claimed | HandleClaimed |
| release | claimed | released | HandleReleased |

## Invariants

- `handle.oneHolderPerName`: another claimed handle holds this name. Unique on name, while claimed; refused HandleTaken.
- `handle.oneNamePerPerson`: you already hold a name. Unique on owner, while claimed; refused HandleAlreadyOwned.

## Events

- `HandleClaimed`: carries handle (handle.id: The handle's own id.), name (handle.name: A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page.); emitted by the move claim
- `HandleReleased`: carries handle (handle.id: The handle's own id.), name (handle.name: A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page.); emitted by the move release

## Roles

- handleOwner

## Operations

- [handle.claim](claim.md): Claim a free name and make it the address of your public page, with its profile.
- [handle.release](release.md): Free your name and take its public page offline. Anyone may claim the name afterwards.
- [handle.resolve](resolve.md): Find the handle that holds a claimed name. A released or unclaimed name has none.
