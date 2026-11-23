# world

`World`, the Durable Object that is one running world, and `toWorld`, which routes `/_world/*` to it. Stage one's
world keeps the cast (`POST /_world/cast` with `{ names }` gives each a person id, made once and kept in the world's
own SQLite storage, and a token signed with the run's secret) and answers `/_world/health`. It holds the world's clock
(M8.06; the `clock` module): `GET /_world/clock`, `POST /_world/clock/advance` and `/move-to`, and `now()` over RPC. The
timers table (M8.07) and the registry of things join it later.

## Every entry wraps itself (M8.06)

`WorldEntry.entry(handler)` wraps a Worker's `fetch`, `scheduled` and `queue`; `WorldEntry.within(env, f)` any other entry
that returns a promise (a Workflows step); `WorldEntry.withinNow(env, f)` an RPC that answers at once (the actors'). Each
reads its world's instant from the world's Durable Object and runs inside `WorldClock.within`, so `Date` and Effect's
`Clock` read it. A real world skips all of it. The world's `alarm`, `/_world/worlds` and `/_world/arm` and `/_world/end` keep
real time: they are the world's lifetime. Decision: `design/decisions/M8-06-world-holds-the-clock.md`.

## Worlds in a long-lived environment (D3 #50)

A test environment (`ORTHO_WORLDS=1`, set by `ortho env up` when the blueprint's environment declares a
`lifetime`) holds worlds with lifetimes, one live at a time. `/_world/worlds` is its registry: `POST {id, lifetimeMs}`
makes one (409 `WorldLive` while another lives), `GET` lists the live ones, `DELETE /<id>` destroys one, `POST /reap`
destroys every one past its lifetime and answers `{reaped}`, counting each expiry once. A world is its own `World`
instance, named by its id, holding the cast and an alarm at its expiry. Its data is whatever is above the high-water
mark of every table (`rowid`), taken when it was made, kept in the `_worlds` table in D1; destroying it deletes those
rows and the instance's storage. Limits: actors a world created are not deleted yet, and no R2 binding exists to clear.


Admission and ending are guarded in D1 itself (D3 #170–172). The guarded insert takes every table's marks in the
same statement that takes the single-live slot; a unique partial index enforces that slot. Concurrent callers get
one 201 and the other 409s naming that live world. An id already used by an ended world is 409 `WorldUsed`.
Every teardown deletion and the ending update share one transaction and require that lease still to be live, so
an interleaved duplicate cannot delete a subsequent world's rows. This does not depend on Durable Object input
gates serializing external D1 awaits.

The index is an additive startup upgrade. An old registry containing overlapping live leases fails closed with
the database error; it never chooses a winner or deletes data to repair itself. `world.test.ts` runs this case,
concurrent admission, overlapping teardown and admission/ending handover against real workerd and D1.

## Declared stores (K3)

`toWorld({ …, stores: [{ db, tables }] })`: the facts door reads a table from the database it is in and a trace's journal
from the default and each store. The lease registry above marks and resets the default database only; a declared store's
rows survive a world's end (open, K3 "What M1.17 built").

## Reset (ST1.24)

`POST /_world/reset` (a world without leases only) empties every table of the default database and of each declared store, and keeps the cast: the Durable Object answers who is in it, and the Worker deletes everything but those people's `auth_user` and `auth_account` rows (`internal/reset.ts`). It is how a warm world (`ortho dev`) starts a prove run with none of the last run's records. Not reset: actor storage.
