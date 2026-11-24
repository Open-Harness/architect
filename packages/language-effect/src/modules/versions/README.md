# versions

A thing declared with `versions: { key }` (K40 fix 2) has one current version per key, keeps every save, and refuses a save made
from any version but the current one. `Versions.handler(verb, thing, stale)` serves `save`, `get`, `history` and `restore` for it;
the generated server uses it in place of a plugin's handler file for those four verbs, when the thing's key is a field of the
operation's payload (`Versions.serves`).

- Every save is a new row with the next `revision`. The newest row is the current version.
- Each row also carries `saved: { at, by, from }`, a field `Blueprint.thing` adds to a thing with versions: when, by whom, and the
  version it was made from. `history` reads it back, newest first.
- A save touches the row it follows in the same commit, so two saves from one base cannot both land: the second finds its
  version moved, runs again, and is refused with the new current one (`stale`, with `current`).
- `restore` is a save of an earlier version's fields. A version never saved is refused `NotAllowed`, as a read of nothing is.

Test: `versions.test.ts`.
