# e2e:on-chain, the done check of Goal 4

`nx run e2e:on-chain` is the done check of `design/goals/04-on-chain.md`. It runs `on-chain/*.test.ts` through the ratchet
(`e2e/ratchet/README.md`, `nx run e2e:on-chain-ratchet`): a failure not on `expected-failing/` fails it, and so does a listed check
that now passes (take it off the list). Then `empty-list.mjs` fails while `expected-failing/` holds any file. So:

- `nx run e2e:on-chain-ratchet` is what CI runs on every pull request into `goal/on-chain` (job `e2e-on-chain`): green while every
  failure is listed.
- `nx run e2e:on-chain` is the done check: it passes only when every check is green and the list is empty. Red today, by design.

## The checks

One file per check, so the ratchet lists them one per check (G9, `design/decisions/G9-ratchet-per-check.md`).

| File | What it requires | Today |
|---|---|---|
| `01-budgets-journeys.test.ts` | on a fresh copy of `examples/budgets`, `ortho prove --env local` (read from prove's `--report`) reports exactly the journeys, steps, actors and operations the journey sources say (pinned step by step, `journeys.ts`, held to the sources by `sources.ts`), all green, each journey's cast as declared with a distinct CAIP-10 account per member, and for every chain-operation step a `signer` that is the actor's own account and, where a transaction is sent, a `tx.by` that is the same; leaves nothing running | red: prove cannot load the journeys (`receipts` and the rest do not exist yet) |
| `02-seam-byte-identical.test.ts` | against Goal 3's output (the checked-in `generated/` of acme and Plugged In at `git merge-base HEAD origin/goal/stage-1`): the checked-in files are the same, `ortho generate` into a copy of the whole example writes them again, and writes nothing outside `generated/` | green, and must stay green |
| `03-snags.test.ts` | every entry of `design/goals/04-snags.md` is a strict `## S-nn · title` with Hit, Lost, Cause, Fix and Status; `fixed (#n …)` with #n a pull request merged into this branch (or a commit of its history), or `parked (who): reason. Owner: <role>` with a real reason and an owner that exists; S-01 to S-11 stay | red: S-01 to S-09, S-10 and S-11 are open |
| `10-m6-07-relayer.test.ts` | slice 9 (M6.07): against `Relayer`, a Durable Object exported from `@orthograph/host-cloudflare`, in workerd under `wrangler dev` with a real Anvil and the key as the secret binding `RELAYER_KEY`: 100 concurrent `relay` calls take nonces 0 to 99 once each and land with their own calls; a transaction the node drops is seen as `dropped` and replaced at its nonce with a higher fee, and what was behind it lands; a mined failure is `reverted`; it keeps what it sent across a restart; the key is in no answer, log or storage file (the seam it picks is at the top of the file; `actor-fixture.ts` is what both actor checks share) | red: the Worker cannot start, `Relayer` is not exported |
| `11-m6-09-follower.test.ts` | slice 10 (M6.09): against `Follower`, a Durable Object exported from the same front door, with a sink standing in for `FollowerSink` (Ask #481: `Inbox.accept`'s shape): a confirmed event is handed on once, with id `${chainId}:${blockHash}:${logIndex}`; an `anvil_reorg` that replays another digest gives a correction (id `…:corrected`, `wasConfirmed`) and then the new event; a long backfill is read in order; the checkpoint is the chain's own view; a restart, twice, hands nothing on again | red: the Worker cannot start, `Follower` is not exported |

Each file opens with what it requires and carries its own controls: the readers (`reportProblems`, `snagProblems`, `treeProblems` and
`mapProblems`) are tested against planted wrong inputs. CI checks out the whole history (`fetch-depth: 0`): 03 reads `git log HEAD`, 02 reads
`origin/goal/stage-1`.

## Later slices add their check here

`slices.json` names the check each of slices 3 to 12 must add, by its number prefix (`04` to `15`; slice 12 has three, for M6.16, M6.17 and
M6.18). Each slice's checks author adds `NN-<name>.test.ts` with that prefix, red, and lists it in `expected-failing/` (one file per check file,
named after it, keys `on-chain/NN-<name>.test.ts > describe > test`) in the same pull request, saying in the body why (which slice, when due).
Its builder turns it green and deletes its lines, or the file when the last goes: `tools/ci/builder-paths.sh` lets a `-build` branch only
remove from `e2e/on-chain/expected-failing/` (its cases are in `tools/ci/ci.test.sh`) and refuses an edit to any check file or to `slices.json`.
Nothing else in this folder, the target or the job changes. Anvil and Foundry are already on the CI job's runner.

`nx run e2e:on-chain` has three steps: the ratchet; `empty-list.mjs`, red while `expected-failing/` holds any file; and `presence.mjs`, red
while a check named in `slices.json` is not in this folder with a test in it, or while `slices.json` stops naming a slice. So "every slice's
check is green" cannot pass by there being no check. `00-done-check-gate.test.ts` plants each hole against it. Today the done check is red for
both reasons.

Slice 4's check: `05-m6-11-lock-chain-wire.test.ts` is the slice-3 author's, written for the lock's Solidity wire (M6-chain item 11). It is not slice 4's check:
`presence.mjs` counts any `05-*` file, so slice 4's author adds a second `05-*` file for what the slice is for (surface.json, `forge build`, the writer warning).

## What the done check still needs

JSON has no comments, so this list sits here and in the `on-chain` target's description in `e2e/project.json`.

1. Prove's report does not carry who signed a step yet (snag S-11). `01` already requires it: per journey `cast: { <name>: { account } }`;
   per step `actor`, `operation` and, for a chain operation, `signer: { actor, account }` and, when a transaction is sent, `tx: { hash, by }`.
   The framework builders add the fields (slice 8 for direct sends, slice 11 for signed ones).
2. Every slice's own check (slices 3 to 12), added by each slice's checks author as above; `presence.mjs` fails until each is there.
3. Slice 12's `nx` wiring: until budgets is in the Nx graph, this suite reaches it by path, not through a project target.
