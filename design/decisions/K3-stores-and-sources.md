# K3: stores we own, and sources we don't

Decided 18 November 2026. Aaron took option C in the chat ("Yes, take C"). This record widens K2 Q1 and D1 #1 and
supersedes them where they disagree. The new evidence that reopened Q1: Capxul needs data that lives in several
places, including its bench, which is hosted elsewhere on MariaDB. Aaron also asked whether `database | actor | chain`
is really the whole list ("that kind of sounds to me like there could be more places"). It isn't, and this record
makes the list open.

## The problem, in code

```ts
// packages/forman/src/modules/things/types.ts:32
export type Lives = "database" | "actor";
```

```ts
// examples/acme/blueprint/environments/local.ts:6
database: Cloud.d1.local(),
```

A thing picks one of a closed list of homes, and an environment binds exactly one database. Nothing can say "the
ledger is in its own database", and a system we don't own, such as the bench, has nowhere to go.

## The rule that sorts every case

**If Forman owns the schema and every write goes through Forman's commit, the place is a store. If anything else owns
it, the place is a source, and it is reached through an adapter.**

The commit is the test. A store has to take one call's writes, its journal events, its outbox entries and its request
key together or not at all, guarded by a version (`Store.commit` in
`packages/language-effect/src/modules/records/types.ts:62`, which returns `committed` or `conflict`). Only something
that does all of that can be where a thing lives.

## Decided

1. **A thing lives in a store.** `lives` takes a declared store, or nothing for the project's default store. The word
   forms stay as shorthands for the built-in kinds: `lives: "actor"`, and `lives: Blueprint.chain({ … })` from L4.01. (Superseded by K25, 20 November 2026: a chain store file, `Blueprint.store.chain.evm()`.)
   A one-database app changes nothing.

   ```ts
   // blueprint/stores/ledger.ts: the name is the path, "ledger"
   export default Blueprint.store.database();

   // blueprint/things/entry/thing.ts
   import ledger from "../../stores/ledger.ts";
   export default Blueprint.thing({ description: "…", fields: { … }, lives: ledger });
   ```

2. **The kinds are open.** A host or a language supplies a store kind by implementing the store port. Forman ships
   three:

   | Kind | Supplied by | What it is | Lists |
   |---|---|---|---|
   | `database` | `@formants/host-cloudflare` | D1, with a version column | yes |
   | `actor` | `@formants/host-cloudflare` | a Durable Object per instance, its own SQLite, its outbox | no: use a view |
   | `chain` | `@formants/language-solidity` | a contract or program (M6 for `evm`) | through views |

   (Superseded by K27, 20 November 2026: the host supplies a store kind and a language writes for it; `chain.evm` is
   supplied by `Host.chain`, and `language-solidity` writes for it.)
   `chain` is a family of kinds, one per chain: `evm`, `solana` and `aztec`, each from its language package, with
   the capabilities `pending`, `accounts` and `private` (K7 Q4, 18 November 2026).

   A chain is a host (`Host.chain`), and its store kinds run on it (K5 and K7, 18 November 2026). The commit test
   holds at the transaction: it is atomic, versioned by the nonce and the program's state, and the program is its only
   writer. What differs is time: the commit answers late, as a submission (`simulated → submitted → included →
   confirmed`, K7 Q3), not as `committed` or `conflict` on the spot. A server operation that sends a transaction and
   also writes D1 still writes two stores, so by item 5 it is a workflow, with S25's generated waiting state between
   the two.

   Later kinds are a package each, with nothing else changing: Postgres or MySQL that we own (through Hyperdrive),
   SQLite on a device for local-first, the `solana` and `aztec` chain kinds (K7). A kind declares what it can do (lists, search, private state),
   and the compiler refuses a read the kind can't serve, as it already refuses a list over actors.

3. **Some places can't hold a thing.** KV, R2 and caches can't take an atomic commit, so no thing ever lives there.
   R2 holds files, which are fields. A search or vector index is a kind of view. Both are kept from events and can be
   rebuilt.

4. **Environments bind stores only when they differ from the default.** By default every store gets the host's
   default: its own D1, named from the store's path. An environment names a store only to bind it differently. Its
   keys are typed from the declared stores, so a misspelt or missing store fails to compile:

   ```ts
   // blueprint/environments/local.ts
   database: Cloud.d1.local(),                  // the default store, as today
   stores: { ledger: Cloud.d1.local() },        // only when it needs saying
   ```

5. **One call commits to one store.** A call's writes all land in its thing's store. The compiler refuses an
   operation whose steps write to two stores. Work across stores runs as a workflow, as cross-actor work already does
   (delta, Data).

6. **Migrations are per store**, generated from the model diff for each store, ordered per environment. Never for a
   source.

7. **Plugins bring their own stores.** A feature can declare stores. Mounted, a store's name is the mount's name plus
   the store's path, so two plugins never collide. `@formants/auth` keeps Better Auth's tables in its own store, and
   the project never sees them. This is why stores land in M1: auth in M2 needs them.

8. **A source we don't own is an adapter.** The bench is an adapter, for example `@capxul/bench`, mounted at
   `blueprint/adapters/bench.ts`. Its port declares typed calls with declared errors (`candidates.find`,
   `candidates.search`). A handler reaches it only through a step:

   ```ts
   // blueprint/things/shortlist/verbs/add.ts
   steps: {
     candidate: Blueprint.step.call(bench.calls.candidates.find),  // span shortlist.add.candidate, kind "call"
     save: Blueprint.step.database(),                             // our own store
   },
   ```

   The adapter holds the connection string as its own declared secret (`secrets.md`). Its stand-in is real MariaDB
   in a container, loaded from the bench's schema dump. That is rung one of the ladder (Q1 of the frame): the real
   software, not our own fake. Its conformance test runs the same calls against the stand-in and against the real
   bench in staging, so a schema change in the bench fails at the adapter, not inside a handler. Forman never
   migrates it.

9. **Lists that join ours and theirs are views.** An adapter can emit events: a change feed, a poll it runs on a
   timer, or a webhook in through `on:`. A view keeps those events beside our own. A handler that only needs one
   record calls the adapter directly.

10. **The data map shows both.** `generated/data/map.md` and the portal's data page list every store, with its kind,
    binding and migrations, and every source, with its adapter, calls and stand-in.

## Why not the external database as a store (option B)

B looked fine, and it would be right if Capxul owned the bench through Forman. The problem is ownership, not MariaDB.
A store means Forman writes the migrations, adds the version column and is the only writer. The bench has its own
owner, its own schema and other writers. As a store, it would get our migrations run against its tables, a version
check that its other writers never bump (so our commits would silently overwrite theirs), and a journal and outbox that
don't see their changes. If Capxul ever moves the bench into Forman, it becomes a store of a MySQL kind on that day:
the rule above sorts it.

## Open risks

- **Reaching MariaDB from workerd.** Workers can open TCP sockets, and Hyperdrive supports MySQL, but a MariaDB
  driver on workerd is unproved. A spike comes before the database adapter slice (M5.13). If it fails, the adapter
  runs in a small Node host beside the Worker, and the port stays the same.
- **Store names in environments.** The `stores:` keys are identifiers checked against generated types, not free
  strings. If that ever reads as writing a declared name by hand, the fallback is `Store.bind(ledger, …)`.

## What M1.17 built, and the calls it made (18 November 2026)

Evidence: [`../evidence/M1.17/`](../evidence/M1.17/). Items 1, 2, 4 (checked by the compiler), 5, 6 and 7 are built; where
the build had to choose, the choice is here. None of it changes what Aaron decided above.

1. **`lives` keeps its meaning, and a thing gains `store`.** `Thing.lives` is still the *kind* of place (`"database"`,
   `"actor"`, or a kind a host supplies), so everything that asks `thing.lives === "actor"` is unchanged. Writing
   `lives: ledger` sets `lives` to the store's kind and `Thing.store` to the declared store (`packages/orthograph/src/modules/things/service.ts`).
   The model's thing has `lives` as before and `store: "<name>"` only when a store was named, so acme's model, its
   hashes and everything generated from it are byte for byte what they were (`sync:check`, the acme snapshot, and
   `packages/generators/src/modules/render/stores.test.ts`).
2. **The kinds are open at the declaration, closed at the host.** `Blueprint.store.database()`, `.actor()` and
   `.kind("chain")` return `{ kind: "store", of }`. The compiler refuses a store whose kind the project's host doesn't
   supply (`STORE_KINDS` in `packages/compiler/src/modules/model/internal/stores.ts`: `database` and `actor`, from
   `@orthograph/host-cloudflare`); a host or language that supplies another adds its name there when it lands (`chain`, M6).
3. **A mounted store is always named `<mount>-<store>`.** Unlike a thing, which keeps its name when the mount has the
   plugin's own name, a store is always prefixed, so the project never sees a plugin's bare store name and two
   plugins' `main` stores never meet. A clash with the project's own store is refused naming the mount file.
4. **How the compiler knows an operation writes two stores.** A handler is opaque to it, so a write is declared on
   the step: `Blueprint.step.database({ writes: [Entry, Note] })` (default: the operation's own thing). An operation's
   stores are those of its `move`, of each `database` step with no `writes` (its own thing), and of every thing a step
   `writes`. Two stores, counting "the default store" and "the actor store" (`lives: "actor"` without a declared
   store) as stores, is refused with the operation, the file and what writes where. The runtime refuses it too, as a
   defect, for a handler that writes what its steps didn't say (`StoreD1.commit`).
5. **One database per database store, bound beside `DB`.** The generated `wrangler.jsonc` gains
   `{ binding: "DB_<STORE>", database_name: "<app>-<store>", database_id: "…000<n>", migrations_dir: "migrations/<store>" }`.
   The placeholder ids differ per store: with one id for all, a local `wrangler dev` would open one database for
   every binding. `generated/server/migrations/<store>/0001_things.sql` holds the store's tables and its own
   `_journal` and `_requests`: a commit writes its journal entries and request key where its tables are. The
   default migration is the things in no declared store. `prove` applies each database's migrations
   (`packages/prove/src/modules/world/internal/wrangler.ts`). `StoreD1.layer({ tables, stores })` reads and commits a thing in its store's
   binding; `answered(key)` asks every database; `JournalD1.across` and `/_world/facts/*` read across them.
6. **Environments bind a store only when it differs.** `stores: { ledger: Cloud.d1.local() }` is in the model
   (`environments.<name>.stores`) and the compiler refuses a name that isn't a declared store, or a binding of a store that isn't a
   database store. The keys are checked by the compiler, not typed in TypeScript: typing them needs a generated
   registry that the project's own `blueprint/` imports before it has been generated, and the fallback K3 already names
   (`Store.bind(ledger, …)`) stays open (`STO-15`). Binding a store in a real cloud environment is the deploy slice's.
7. **STO-23 is fixed in the host.** `rows.ts` keeps an array or struct field as its JSON text and reads it back; the
   field's schema decides, never the text. `packages/host-cloudflare/src/modules/store/store.test.ts` binds an array and a
   struct to a real local D1 and reads them back; with the fix off, the same test fails with `D1_TYPE_ERROR`. The
   work-real branch's version is not imported: the fix is rewritten in the host.

Left open, on purpose:

- **Worlds with lifetimes reset only the default database.** `leases.ts` marks and deletes the tables of `DB` alone, so
  in a test environment that hosts worlds a declared store's rows survive a world's end. `prove` and `ortho dev` start
  from a fresh state folder and are not affected. Per-store leases are the next step before a feature's store is
  used in a test environment.
- **Migrations after the first.** A store's first migration is generated like the default's; migrations between
  versions, from the model diff per store (item 6), land with the default's (`STO-17`), and `Compare` does not yet list a
  store.
- **Actor stores share one Durable Object namespace.** A declared store of kind `actor` is accepted and its things go to
  `ACTORS` by table name; a namespace of its own per actor store is not made.

## Where it lands

- M1.17: stores in the model, and in the compiler and runtime (items 1, 2, 4, 5, 6, 7). Built; see above.
- M5.13: an adapter over a database we don't own, after the workerd spike (items 8, 9).
- M5.06: the data map lists stores and sources (item 10).
