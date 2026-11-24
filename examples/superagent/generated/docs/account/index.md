<!-- Generated from the blueprint. Do not edit. -->
# account

One account of an outside service, as a superagent has seen it, and whether its person is listed to ask.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | superagent.id |
| source | text |
| external | text |
| login | text |
| bot | schema |

## Machine

States: seen, listed, unlisted. A move from the wrong state is refused AccountNotSeen (exit 81).

| move | from | to | emits |
|---|---|---|---|
| seen | (creates) | seen | AccountSeen |
| list | seen, unlisted | listed | AccountListed |
| unlist | listed | unlisted | AccountUnlisted |

## Invariants

- `account.oneAccountPerExternalId`: another account holds this superagent, source and external. Unique on superagent, source, external, in every state; refused AccountExists.

## Events

- `AccountListed`: carries account (account.id); emitted by the move list
- `AccountSeen`: carries account (account.id), superagent (account.superagent); emitted by the move seen
- `AccountUnlisted`: carries account (account.id); emitted by the move unlist

## Roles

- listed

## Operations

- [account.list](list.md): Let an account ask: its person's words may then start work.
- [account.seen](seen.md): Record an account an event came from: a new one is seen, a known one keeps its state.
- [account.sync](sync.md): List the accounts a connection's own roster names: a repository's collaborators, a user group.
- [account.unlist](unlist.md): Stop letting an account ask.
