# M1.04 hashed verdicts

Each journey produces one verdict for each operation it exercises, including calls that make its starting worlds.
A verdict names the journey by its file and carries SHA-256 hashes of the canonical model and the handler module's
bytes. A read has a null handler hash. A journey that stops during setup records failures for the operations it
planned to exercise. Repeated calls to the same operation in one journey share one verdict.

The local proof ledger keeps the verdicts and an operation-specific fingerprint of their journey and starting-world
definitions. `ortho impact` checks those definitions, the operation's existing model dependencies and its own
handler file. The full model hash identifies the model that was judged. A change to an unrelated model declaration
or handler does not stale that proof. The journey fingerprint includes the authored source hash for selectors,
so it stays the same when module loaders format the same function differently. App handler hashes cover the
handler module itself. Mounted operations also retain the dependency on their package's installed bytes.
An unreadable handler cannot establish a new pass.

The signed logbook keeps the journey verdicts on the existing operation record. The operation verdict still requires
its evals and the journey evidence to pass. Production carries the evidence from the environment that earned the
bundle's verdict. Existing rows and local ledgers remain readable and retain their previous model-only comparison.

## Proof

Run `pnpm exec vitest run --root packages/prove handler-verdicts`. The check compiles an acme copy, groups replayed
journey observations, records their verdicts and edits only `src/allowance/spend.ts`. The actual `ortho impact`
command prints exactly `stale allowance.spend` on its stale line. The fixture replays observations in Node so the
collector can be checked by CI. The logbook's SQLite test exercises the migration and reads back both legacy and
per-journey verdicts.
