# K12: closing the coverage gaps

Decided 19 November 2026 by the conductor under "Who decides" in `AGENTS.md`. Aaron asked for the generator audit,
saw it as a page ("that matrix is super helpful … a guide of what we need to do to plug all the gaps"), and said
"Yes, add them" to turning its gaps into slices.

The audit read `origin/m1` at `56ea4b31` and `origin/main` at `b676fae6` with three read-only reviewers. It asked
which building blocks of the blueprint reach which outputs, and where they are dropped or leak. The page is
<https://claude.ai/artifact/JCKYJNLZZSv3H6VRh8bKPn>; the evidence is restated here with file and line so this record
stands on its own.

## The answer in one paragraph

Seven gaps get slices. One visibility rule replaces four, before M1.12 moves the clients (M1.35). Telemetry carries
what the model already knows: the event emitted, the state moved from, the error's code, a budget breach, the
environment (M1.36). MCP is generated from the whole model, not just the payload (M1.37). The wallet's confirmation
depth comes from the chain and environment, as K7 F2 decided (M1.38). The canon gets its chains-and-wallets page and
loses every "waits on K7" (M1.39). The portal's wire gains the rest of the model inside M1.13, which already carries
most of it. And `ortho add` runs on Nx's `Tree`, as the spec decided long ago, so it can edit files that exist and
`nx migrate` can upgrade a blueprint when the API changes (M2.14 to M2.16).

## 1. One visibility rule (M1.35)

Four places each decide what a caller sees, and three outputs decide nothing:

| Where data leaves | Today | Evidence |
|---|---|---|
| HTTP answers | every field | the endpoint's success schema is the whole answer, `projections/…/api/internal/api.ts:81` |
| HTTP refusals | every field but `_tag` | `language-effect/src/modules/wire/service.ts:6` |
| SDK | every field | typed from the same endpoint schemas, so the whole answer (`api.ts:81`), and it re-exports the API's `Errors` (`generators/src/modules/render/internal/sdk.ts:133`) |
| CLI | hides fields only when printing a refusal; the secret already crossed the wire | `Errors.shown`, `generators/src/modules/render/internal/cli.ts:58` |
| MCP | public always, private to a role held, secret never; fails closed | `language-effect/src/modules/mcp/internal/shown.ts:1-8` |
| spans | public and traced only | `handler/internal/attributes.ts:8` |
| journal | public only | `attributes.ts:39` |
| logs | payload strings only, by substring | `decided.ts:16-21` |
| portal data file | drops visibility entirely | `portal/…/wire/types.ts:12-17` |

Nothing in acme leaks today only because no answer or error carries a secret field. M1.12 moves the SDK, CLI and MCP
into plugins; doing it on top of three rules would copy the leak into three packages. So M1.35 comes first: a
`visibility` module in `language-effect` with one `Audience` (`principal` with the roles held, `agent`, `telemetry`,
`public`, `owner`) and one `sees`, `redact` and `schema`. MCP's `shown.ts` becomes the agent case; spans, journal and
logs the telemetry case; `Errors.shown` goes. It fails closed, as `shown.ts` does: a field the declaration doesn't name
is never shown. The sign-in and sign-up operations that carry a secret in their payload stay usable through MCP only
by M2.06's MCP sign-in, never by showing the secret.

**Issued secrets (lead and conductor, 19 November 2026, at check 16).** The row first said no secret leaves through any
output. That breaks acme: `session.sign-in` answers `token: Secret` (and the session's id, which its journey reads), and
`api-key.create` answers `key: Secret` (`examples/acme/blueprint/things/session/verbs/sign-in.ts:10`,
`api-key/verbs/create.ts:9`), and the canon already calls `Secret` "a secret shown once". So: an issued secret leaves
exactly once, in the answer of the call that issued it, to that call's own caller (anonymous included, since sign-in is
anyone's), over HTTP, the SDK and the CLI. It never leaves in a refusal, a read, MCP (the agent audience), spans, logs,
metrics, the journal, the portal's data file, the docs or the model. The declaration says so, nothing infers it: an
answer field is written `Blueprint.issued(<secret value or field>)`. A secret answer field without that mark never
leaves for anyone. The compiler refuses `issued` on a value that is not secret, on a payload field, on an error's field
and on a thing's field, and a `Blueprint.read` can't carry it (a read names its fields). acme marks sign-in's `session`
and `token` and `api-key.create`'s `key`. Gate M1's check (8) reads the same.

## 2. Telemetry carries the model (M1.36)

Built: the operation span with `operation`, `attempt` and public payload and answer fields (`handler/service.ts:102`),
a span per step with `step.kind`, the commit span (M1.18), `move.name` and `move.to` (`handler/internal/move.ts:48`),
`refusal` and `defect`, `ortho.calls` and `ortho.call.duration` (M1.20), step signals (M1.21).

Known to the model, absent from telemetry: the event a move emitted (it goes to the journal, `move.ts:61`), the state
moved from, the error's code (`AL-002`; the span carries only the name), a breach of the declared `budget.p95`, and the
environment and store a call ran in. The portal can only light up what telemetry carries, so these land before M1.13:
`move.from`, `event.name` on the commit span, `refusal.code`, an `ortho.budget.breaches` counter, and `environment`
and `store` as attributes.

### M1.36: what its builder settled (19 November 2026)

**Amended by [G8](G8-refused-span.md):** a call the role refuses is traced in `<operation>.refused`, and `move.name` and `move.to` are written on the operation's span, not the step's.

Check 17 (`e2e/m1/17-telemetry-model.test.ts`) names six assumptions where the design was silent; all six are built as
written there. The calls the builder had to make beyond them:

- **`move.from` is the state `checkFrom` read, written once the move is made.** `checkFrom` gives back the state it read
  (`handler/internal/move.ts`) and the wrapper writes it after `applyMove`, so a call refused by the handler or by the
  machine, and a call that made no move, carry none. A move that creates (`from: []`), or whose subject is not found,
  has no `from` to write.
- **`event.name` is written on the commit span only when that attempt committed.** A conflicted attempt journalled
  nothing, so naming an event on its commit span would claim an emission that never happened (`"commit.outcome":
  "conflict"` and no `event.name`). It left the operation span: nothing but the canon read it there.
- **`refusal.code` comes from `Errors.codes`, passed to `Handlers.serve` as `codes`.** The generated server hands each
  served operation the one map of tag to code the API already generates (declared errors and each machine's `notFrom`),
  so the runtime never rebuilds a code from a thing's prefix. A tag with no code is written without one. (`NotAllowed` is
  traced in its own `<operation>.refused` span, which carries its code: see [G8](G8-refused-span.md).) This changes every generated `server/main.ts`; the four
  examples are regenerated.
- **`environment` reaches a handler as a Context reference, `Environment`, default `local`.** The Worker's
  `ORTHO_ENVIRONMENT` binding is read once where the layers are built (the API's and the MCP runtime's) and provided as
  `Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local")`. Nothing is added to `Services`, so a handler's type is
  unchanged. It is written on the operation span next to `store` (`op.thing.lives`), on a replayed call too.
- **`ortho.budget.breaches` is recorded where the call's duration is.** `recordCall` adds one, tagged `operation` alone,
  when the measured call (the whole call, every attempt, as `ortho.call.duration` measures it) took longer than the
  declared `budget.p95`; it is exported with the other two. A call refused at the door (a bad payload or a stranger) has
  no budgeted operation to measure and never counts.
- **`ortho prove --port 0` binds a free port.** `Worlds.start` now asks the OS for one when given 0 (`world/internal/port.ts`),
  so a caller no longer waits on `127.0.0.1:0` while wrangler listens elsewhere.

## 3. MCP from the whole model (M1.37)

The MCP generator is 25 lines (`render/internal/mcp.ts`) because it only lists operations; the runtime does the rest generically
(`mcp/internal/input.ts:12`). Missing: tool annotations beyond read-only (`destructiveHint`, `idempotentHint`, `title`;
the model already knows `idempotent`), an `outputSchema` from the answer, refusals as structured errors with their
code (today a text line such as `[AL-001] Name {…}`), resources for things and the docs, and approvals for risky calls.
Approvals reuse M1.23's, one rule for actions and MCP. All of it passes through M1.35's agent audience.

## 4. Confirmation per chain and environment (M1.38)

K7 F2 decided that `confirmed` depends on the chain and the environment. The type exists (`chain-evm`
`tx/types.ts:48`), but the wallet hard-codes it:

```ts
// packages/wallets/src/modules/submit/internal/flow.ts:29
const states = yield* port.track(submission, { depth: 1 }).pipe(Stream.runCollect, Effect.catch(refused));
```

Depth one is right for local Anvil and wrong for any testnet or production chain, where a reorg can undo a "confirmed"
send. It is fixed before any environment names a real chain.

### M1.38: what its builder settled

Check 18 settled how depth is declared (`ORTHO_WALLET_DEPTH` on a host, `chain.depth` in a world, `ChainSetting.depth`),
that chain id 31337 alone defaults to depth 1, and that a send on any other chain with no depth is a defect naming
`ORTHO_WALLET_DEPTH` before anything is signed or submitted. Two calls were left to the builder.

1. **`track` counts the blocks; the wallet does not.** The wallet has no way to read a head: its only road to the chain is
   the `ChainPort`, and a second RPC client beside it would duplicate the port's deadline, timeout and fault mapping.
   So `trackTransaction` takes the level's depth and, for a plain transfer (no intent), keeps polling past the receipt
   until `head - receipt.blockNumber + 1 >= depth`, emitting a new `TxState` `Deepened { blocks, receipt }` each time the
   count changes. A mined revert ends it at once; a new block renews the tracking budget (a depth of twelve on a real
   chain outlasts the 120 s a receipt gets); a reorg that moves the receipt re-counts from the new block. A tag level
   (`safe`, `finalized`) is not counted and ends at the receipt as before. Depth 1 is one extra `eth_blockNumber` read
   and the same states as before, `Included` first. The wallet's `follow` taps the stream: a `wallet.send.level` span
   with `level` and `blocks` first at 0 (`submitted`), then one per `Deepened`, `confirmed` when `blocks >= depth`, and it
   answers when the stream ends. A count skipped between two polls (two blocks arriving within one poll) has no span of its
   own: the span says what was seen, the next one carries the larger count.
2. **Prove's chain is depth three, a block a second, for every device journey.** A journey cannot name its chain and a
   plugin cannot ship a starting world (M1-plugins), so prove's `standChain` starts Anvil with `blockTime: 1` (a new
   `AnvilOptions.blockTime`, whole seconds, the `--block-time` flag; default none, so every other user of `Anvil.start`
   still automines) and the device world declares `chain.depth: 3`. Every send in a device journey then waits for three
   blocks, about three seconds, and the wallet's depth-three story is the common case rather than a special one. Making
   it per journey would need a field no journey can write. Cost: the ten wallet journeys' sends are about three seconds
   slower each.

Also: `Chain.depthOf(chainId, declared)` is the one rule for "declared, else 1 on 31337, else none", used by `fromHost`
and by `WorldHost`; `DeviceWorldOf.chain` in `language-effect` gains `depth?`. The send asks for its depth first, so a
chain with none costs no RPC call, no nonce and no signature.

## 5. The canon's chain page (M1.39)

K7 is merged and wallets is built, but the canon still says it waits (or "wait") on K7:
`docs/canon/data.mdx:113,177,186`, `doors.mdx:123,234,246,261`, `languages-and-hosts.mdx:147,207,210,220`,
`outline.md:42,52,78`, `operations.mdx:207`, `orthograph.mdx:274` and `stores.mdx:249`. And
`design/frame/writing-a-feature.md` describes the wallet before M1.29. There is no page for `chain-evm` and `wallets`. Docs are the spec, so the gap is a
slice, done by the canon thread.

### M1.39: what its builder settled

The page is `docs/canon/chains-and-wallets.mdx`, the thirtieth in the outline (written after the layers, so numbered last),
and it owns `chain port`, `signer`, `wallet`, `confirmation depth`, `submission` and `chain in a world`. Calls the builder made:

- **K7 over K5 where they disagree.** The stores page's note said "pending until mined" belongs to the caller. K7 decided a chain
  store's own commit may answer late with a submission, so the note now says both: a server call that sends a transaction is
  still a workflow, and a chain store's commit returns a submission.
- **Each "waits on K7" says what K7 decided and which slice builds it** (M6.10, M6.11, M6.14, ST2.02), and no more. Pages that
  called the chain column "illustrative" now say it is K7's design, and the status tables read `specified`, not `open`.
- **A stale note went with them.** `languages-and-hosts` still said no slice lifts the refusal of `runs: "client"`; M1.27 did.
- **`design/frame/writing-a-feature.md`** is rewritten around what M1.29 built: five operations with `signer` and `label` in the
  payload, CAIP-10 text values, four signers, no `needs`, and the chain as a host setting. The linked half (`challenge`,
  `complete`, `link`) stays as a section marked proposed, for M2.13.

## 6. The portal's wire (inside M1.13)

M1.13's row already carries `from`, events and errors with codes, journeys, starting worlds, stores and mounts (F8
gap 7). The audit found five more the portal's pages draw on: field visibility (the in-and-out band and the trace
drawer), role rules, step details (`optional`, writes, the call), `runs` and the test hook (the "Try it" button), and
environments (the switcher). They are added to M1.13's row rather than made a slice, because they are the same file
(the portal generator module, `generators/src/modules/portal/`, 59 lines across three files, read through `portal/…/wire/types.ts`).

## 7. `ortho add` on Nx (M2.14 to M2.16)

The generators already run through Nx: `nx.json` registers `@orthograph/generators:sync` as a global sync generator,
and `generators/src/modules/sync` writes through `@nx/devkit`'s `Tree`. `ortho add` does not. It plans string templates
(`cli/src/modules/add/internal/templates.ts`, 103 lines), refuses if any file exists (`add/service.ts`), and writes with
`node:fs`:

```ts
// packages/cli/src/main.ts:136
writeFileSync(join(root, f.path), f.content);
```

The CLI already holds the piece it needs: `ortho generate` writes through Nx's tree
(`packages/cli/src/modules/generate/service.ts:3,13` imports `FsTree` and `flushChanges` from
`nx/src/generators/tree.js`). That import is Nx-internal, not the public `@nx/devkit`, which only `generators` depends on.

That reverses an earlier decision without recording it. `design/history/spec-drafts.md:41`: "Scaffolding uses Nx
generators where they fit, rather than rolling our own; Nx is required." Layers 1 and 2 documented each `add` as "an
Nx generator underneath". M1.10 needed only new files, so the shortcut went in.

The cost shows in the audit's grid: no `add event`, `add error`, `add role` or `add move`, because each edits a file
that exists (`events.ts`, `errors.ts`, `roles.ts`, `machine.ts`). And no migrations: when the blueprint API changes,
every app's blueprint is fixed by hand.

| | Hand-rolled (today) | Nx `Tree` under `ortho add` (decided) |
|---|---|---|
| edit an existing file | refused | yes, all of a command's changes written or none |
| `add event`, `error`, `role`, `move` | impossible | M2.15 |
| upgrades when the API changes | by hand | `nx migrate`, M2.16 |
| one command composing another | no | `add thing` calls `add event`; `ortho new feature` reuses them |
| `--dry-run` | yes | yes, from `tree.listChanges()` |
| start-up time | instant | Nx's project graph, about a second or two |
| templates | typed TypeScript functions | kept: no EJS folders |
| errors | `AddRefused`, a typed value | kept, mapped at the entry file |
| new dependency | none | none: `cli` already pins `nx` 24.0.3 and uses its tree in `generate`; `@nx/devkit` only if M2.14 moves off the internal import |

So: `ortho add` stays the command people type and `Add.plan` stays pure; only the writing moves to an `FsTree` flushed
once, as `ortho generate` already does. M2.14 is that swap, M2.15 the kinds that edit in
place, M2.16 the first migration, before the first stable release.

## What the grid leaves alone on purpose

A store, an environment or a journey has no place in the HTTP API or the SDK; events are written by the runtime, not
the handler scaffold (`move.ts:61`); reads are served generically and need no handler. Those ✗ stay.

## What changes in earlier decisions

| Was | Now | Why |
|---|---|---|
| M1.10 built `ortho add` on `node:fs` | on Nx's `Tree` (M2.14) | the spec's decision, and edits in place need it |
| visibility decided per output (L2, D3 #125 for MCP) | one rule in `language-effect` (M1.35) | three outputs applied none |
| the wallet's `confirmed` at depth one | from the chain and environment (M1.38) | K7 F2 |

## Supersedes

- docs/canon/stores.mdx: "belongs to the caller, so a server call" → "A server call that sends a transaction is a workflow. K7 decided that a chain store's own commit may answer late"
