# records

Two sides of a thing's stored instances.

- `Store` is the host's: `find` gives an instance with its version, and `commit` applies one call's writes and journal
  entries all at once, or answers `conflict` when an update's version has moved on (D2 #35, #36). `host-cloudflare`
  provides it over D1 and Durable Objects; `storeMemory` holds rows in memory for tests, with the same rules.
- `Records` is the handler's, made fresh for each attempt at a call by `Unit.make`: reads go to the store and their
  versions are remembered, and writes are held back until the wrapper commits them with the move.

Test: `records.test.ts`.

## Lists (#764)

`Records.list(query)` (`internal/list.ts`) pages `Store.list` to the end, so it knows every row matching the query's
`thing`, `where` and `state`, and lays the call's own writes over them as `find` does: a row moved out drops, a stored row
moved in keeps its place (`Store.place`), and the call's own inserts come after every stored row, in the order made.
`order`, `limit` and `after` apply after that. Every matching row counts as read: `unit.lists` goes on the `Commit`, and
the store answers `conflict` when the rows matching a list, or their versions, are not the ones the call read (whatever
page it asked for). Tests: `list.test.ts`, `list-race.test.ts`.

## Rules (G5)

A store and a unit hold the project's rules, each as a `NamedRule` (the invariant as declared, and its full name,
`handle.oneHolderPerName`): `storeMemory(initial, rules)` and `Store.rules` for a host's, `Unit.make(store, rules?)`
(defaulting to the store's) for the call. `invariantsIn(thing, module)` reads them from a thing's `invariants.ts`.

- `findBy(rule, value)` finds the one holder within the rule's scope, as the call's own writes left it.
- `unit.check` runs after the move and before the commit: the first rule a row breaks by taking a key another instance
  holds, with the refusal the rule names and the row to fill it from. The handler wrapper turns it into the refusal
  (when the operation lists it) or a defect naming the rule and the operation (when it does not, when the rule names no
  refusal, or when the call's own rows clash).
- The store enforces each rule at commit (an index in D1, a per-write check in memory): a second holder is a `conflict`.
