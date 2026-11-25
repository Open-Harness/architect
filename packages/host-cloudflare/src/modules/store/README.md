# store

`StoreD1.layer({ tables, actors? })`: language-effect's `Store` on Cloudflare (D2 #35 to #38).

- Things that live in the database are D1 rows: a table per thing, named by the generated server from the thing's
  path, a column per field holding its wire form, plus `state` and `version`. A commit is one D1 `batch` of the call's
  inserts, its guarded updates and its journal entries. The guard sets `version` to NULL when it is stale, so the whole
  batch fails and the commit answers `conflict`.
- Things that live as actors go to their `Actor` Durable Object (see `actors`), one per instance.
- A failing query dies: it is never the caller's refusal.

Tests: `store.test.ts`, the race test for the database owner.

`Store.list` (L2.04) runs one SELECT in `internal/list.ts`: `WHERE` the equality filters, `rowid` ordered `ASC` or `DESC`, one row more
than the page to know whether another follows. The cursor is the last kept row's rowid, so rows made meanwhile never shift a page.
A thing that lives as actors can't be listed (the compiler refuses a list read of one).
Each row comes with its version and its rowid, its place; `place(thing, id)` gives one row's rowid.

A commit guards each list the call read (#764) with one statement at the head of its batch, before its writes: when the
sorted `id:version` text of the rows now matching the list's `where` and `state` isn't what the call read, it sets the
table's first row's `version` to NULL, and the batch fails as a `conflict` the way a stale update does. A call that lists
things outside the database it commits to (another declared store, or a commit to an actor) dies (`list-guard.test.ts`).

## Declared stores (K3, M1.17)

`StoreD1.layer({ tables, stores: [[store, env.DB_STORE]] })`: a thing that `lives` in a declared database store is read
and committed in that store's D1 binding, with its own `_journal` and `_requests`; a thing in no store is in the default
database (`SqlClient`). One call commits to one store: writes to two die (`stores.test.ts`, two real D1 databases in
workerd). `answered(key)` asks every database. A field whose encoded form is an array or a struct is its JSON text in
its column and is read back by the field's schema (`internal/rows.ts`, STO-23; `store.test.ts`). The column rules
themselves are `toColumn` and `fromColumns` in `orthograph/server`, shared with prove's world reader.

The thing the identity keeps (`people`: the `per_`-id thing and the identity's users table, both named by the generated
server) is read by id from that table, only its own fields decoded, never from a table of its own, so the runtime finds
the person a payload names (K16, M1.46). A list read of it dies; the identity plugin (M2.05) owns the rest.

`StoreD1.layer({ tables, rules })` (G5): the model's rules, each by its full name. The generated migration makes one partial
unique index per rule, `<table>_<rule>`; a commit it refuses is a `conflict` (D1 names the key's columns, never the index,
so the store reads them from the rules), and the store hands the rules to the runtime's `findBy` and before-commit check.
