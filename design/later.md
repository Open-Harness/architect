# Later

Ideas that belong to a later layer, noted here instead of being built. Add one line each: the idea, the layer it
belongs to, and why it waits.

- Indexers beyond the generated follower, for views too large for an organisation's index. Later.
- Safe as a kit, built from its own events and our own small core. Later.
- Python as a third target. Later.
- **A sponsored ERC-4337 path for Capxul's Safes** (CX-safe, section 3): a paymaster pays a Safe's deploy and transactions as a UserOperation, as the earlier implementation did, instead of Capxul's relayer. After Goal 16's S3, once the relayer path is proved.
- **The rest of the app's map** (K31): the docs' page per screen, `ortho add page <name>`, the agent's `map` tool on
  an app, and `open(pages.x)` in `ortho prove --through web`; and K36's rest: the web projection's component wiring,
  `ortho add component <name>`, a component on its screen's docs page, a journey acting on a component, and Plugged
  In's link list declared. Goal 6 builds the map, the app projection and the shell
  first, and proves them on the portal; these wait until an app other than the portal has a declared map.
- **Scaffolds that follow the blueprint** (Aaron, 21 November 2026, with the 📐 designer thread): a file scaffolded
  once and "yours from now on" falls out of line when its declaration changes later, so it must be marked and
  ratcheted, not left alone. Four steps, on what exists:
  1. the scaffold's header also records the hash of the declaration it came from (the model already hashes every
     operation and thing);
  2. `ortho generate` never overwrites a scaffold, but when that hash moves it marks the file stale, says what changed
     (the compiler's `compare` module: a new field, a new refusal, a yes now needed) and regenerates the brief;
  3. `ortho check` lists the stale files as a ratchet that may only shrink: a blueprint change may land red with them
     listed, a done check needs none, and where types can catch the change the build fails too;
  4. the rule covers every file you own: handlers, journeys, pages and the app's own components.
  **Decide before** M2.14 (`ortho add` for events, errors, roles and moves), which changes declarations that already
  have scaffolds, and before the first generated page lands. Whoever reaches that point takes the next free K.
- **PostHog as a sink** (O1 L2.O8, L2.O9): error tracking for defects and a `PostHogSource`. Aaron, 16 November 2026: leave it for now; the `Sink` seam keeps it one adapter away.
- **Axiom as the sink** (O1 steps L2.O5, L2.O6, L2.O8): deployed workers export straight to Axiom per environment
  dataset, `watch` reads it through an `AxiomSource`. The cloud pass, on Aaron's account and tokens.
- **Noir on Aztec as a target**, client-proved and private (N1, `design/noir/`). After Gate 5, its own layer. The
  private Capxul layers in the handoff are a product roadmap built on it, kept with the Noir thread. **Moved into
  v1.0** as stage 4 of the growing example (K9, ST4.01 to ST4.08).
- Each thing as an actor by default. Later.
- ~~The world's front door closed in staging and production worlds~~: done in L2.08 (D3 #126, #127).
- **Editing the blueprint from its graphs** (`spikes/react-flow-graphs`, 19 November 2026). Dragging a new move
  between two states, or a new state onto a machine, would write the blueprint file: add the move to the thing's
  `machine.moves` with its `from`, `to` and `emits`, scaffold the operation that makes it, and regenerate. The graph
  stays a view of the file, never a second source. It waits because the portal is read-only until the editor exists,
  and because an editor needs elk in the browser (a worker), where `Graph` today gets positions from the generator.
- **A machine's `from` kept as a tuple** (K16, #76 commit 27f64555, ledger `MAC-08`). A machine move's `from` reaches the
  handler types as an array, so `CreatedId` reads every machine move as "may mint" and types `context.id` as an id even
  on a move from a state, where it is `undefined` at runtime (`prehandle.ts` mints only from `[]`). Keeping `from` a
  tuple through `Blueprint.machine` restores the exact type. It waits because the runtime is right and nothing reads
  that `id` today; a type test pinning a non-creating machine move's `id` to `undefined` comes with it.
- **Invariants beyond `unique`** ([G5](decisions/G5-invariants.md) §7), each with a decision step before the slice that
  first needs it:
  - `Blueprint.invariant.requires`, a rule across things: Plugged In's `LinkNeedsHandle` and work's four `Mission*`
    refusals. It waits on two questions: a key that comes from the caller (`link.add` carries no owner), and whether
    the rule holds only when a record is made or always, in which case releasing a handle must refuse or cascade.
  - A bound on one record (`taken + people ≤ places`): `SheetFull`, `AllowanceExceeded`, `SoldOut`. It waits because
    those refusals carry a computed `left`, which a declared bound would have to produce.
  - An early refusal before the handler, for a creating move whose payload carries the key; field-level `writes` on
    database steps, so an operation that can break a rule is known exactly; `ortho add invariant`.
  - Caseless keys belong in the value (K9's `names.lowercase` choice), never in a key function no index can hold.

- **A plugin that hangs on the app's own thing** (K22 option D, "slots"): the plugin declares a slot and the app binds
  its own thing to it, so the app keeps its central thing and the plugin brings what points at it. Waits until
  extracting Capxul's budgets or companies shows a plugin that truly wraps another app's thing; adoption (K22) covers
  naming until then.
- **An intent key on actors** (K21): `idempotent: { by }` for things that `lives: "actor"` waits with idempotency by
  request on actors, below.
- **Money, what is left** (ledger THI-07, `design/decisions/M6-money.md`): an amount that knows its asset is decided in
  M6-money, 21 November 2026; a currency taken from a field on the row is built for Capxul (#882, CX-money-global-payroll); the portal's formatting is later.
- **Named value kinds** (ledger THI-08, K24): a web address, a pattern, a choice, yes or no, carried into the model so
  every output can tell them apart and a form picks the right input. Waits for a design pass, beside THI-02.
- **Approval on an operation** (ledger OPS-15, K24): a declared mark that the action asks once and the page's agent
  confirms before calling. Waits for a design pass; the second UI SDK spike (PR #222) shows what drives it.
- **Page marks for secret and hidden fields** (ledger PRJ-55, K24): the language has secret, private and issued;
  mapping them onto the page agent's marks waits for the second UI SDK spike (PR #222).

## From stage two (layer one)

- An actor's journal entries live in its own Durable Object, so `prove`'s facts door doesn't see them yet. Layer four
  reads them through the actor.
- Idempotency by request for things that `lives: "actor"`: the `_requests` row has to commit inside the actor.
- When a handler awaits a chain call (layer four), the actor holds its lock across the whole call, not only the commit.
- **Key proofs by handler source and journeys too** (D2 #60). Today impact keys a proof by blueprint hashes only.
  When prove gets slow enough that skipping proven operations pays, add the handler file's hash and the hashes of the
  journeys that call the operation.
- **A release-age policy for transitive dependencies.** `minimumReleaseAge: 20160` in `pnpm-workspace.yaml` rejects
  53 entries already in the lockfile (transitives resolved within the last two weeks). The rule binds the versions we
  pin; turning the policy on means rebuilding the lockfile once the window has passed.

- **A durable agent on Orthograph's own stack** (proposed 16 November 2026, after Aaron pointed at Pi Durable,
  `@earendil-works/pi-durable` in pi-mono). An agent session as a Durable Object: each model turn and each tool call a
  declared step with its span, the transcript committed before anything is shown, waits through `Timers`, resumed by
  the DO alarm after a crash, and the run proven by the same nine evals. Pi Durable's checkpoint-per-phase design is
  the reference, not a dependency (it is about 36k lines and experimental). Belongs with layer five, time.

- **Orthograph's own CLI as a single executable.** The `single-binary` spike (`spikes/single-binary/`) found what
  stops it: the compiler is spawned through `process.execPath`, three modules read `import.meta` at load, `nx`'s
  native addon is required at load, and the lint plugin and wrangler are resolved as files. Run the compiler
  in-process or through a hidden subcommand, resolve files lazily, ship the plugin beside the binary, and keep `nx`
  off the load path; then the `ortho` binary can go through the same tap.
- **A durable agent on Orthograph's own stack, as declared operations** (proposed 16 November 2026; narrowed by H1). The
  build-time harness is Pi Durable behind an Effect seam (`decisions/H1-agent-harness.md`, build-plan track A). What waits:
  the agent run as a declared `Run` thing with a machine (`briefed`, `working`, `checking`, `proven | failed`), its turns and
  tool calls as declared steps, shipped as a std kit `agent` (layer 3, once kits exist); runs resumed by the world's
  `Timers`, stepped-clock tests of agent waits, and scheduled agents (layer 5). The fallback if the Pi seam fails is H1's
  Option E: Effect AI plus `@effect/platform-cloudflare` (`CloudflareWorkflowEngine`, one Durable Object per execution),
  usable now under the three-day rule (R1), with the `effect` 4.1.3 bump.
- **Agent sandboxes beyond the machine** (H1 section 10): E2B (K10 section 3; the Docker sandbox over `pi-env`, A7, is dropped with
  Docker, K10 section 8), then Cloudflare Containers, and Dynamic Workers for an *operator* agent whose tools are the app's operations. Layer 2 and later.
- **Benchmark verdicts in the logbook, and a portal page comparing runs.** Layer 2 once L2.03 and L2.10 exist.
- **Mutant repair tasks** (H2.6 b): break a reference handler mechanically (drop an `emit` or a `move`, swap a declared error), keep
  a mutant only if prove fails on it. Waits until the authored planted breaks (A8) show which evals need more tasks.
- **Benchmark regressions as a gate** (H2.12). Advisory until baselines have shown how noisy they are; a later decision makes it a gate.
- **A weekly scheduled baseline in CI** on free models (H2.12), once CI may hold a model key (Aaron's call, H2 question 3).

- **The cloud pass must set `ORTHO_ENVIRONMENT` on every deployed Worker, and give `Facts` a D1-API reader (D3 #126, #127).** The front door is closed unless
  the environment is named and declares a lifetime; a Worker that forgets the name reads as a local world. Staging's proof reads D1 through a file today.
- **Name the SDK and CLI packages from the mounts (D3 #112).** The generators name the CLI from the project's folder and `publish` names
  `@<folder>/sdk` and `@<folder>/cli`. The config's unread `outputs` was removed in M0; the projections' mounts (M1.11 to M1.13) are where
  these names are chosen.
- **The SDK without Orthograph's server packages.** `@acme/sdk`'s declarations and runtime import only `effect` and `orthograph`
  (and its `/server` entry for the API's schemas); a consumer of the SDK still installs all of `orthograph`. Splitting the client's
  schemas from the blueprint's declaration API would slim it; worth doing before the packages are public (the cloud pass).
- **Orthograph's own CLI as a single executable** (spike `single-binary`, D3 #9): still blocked by the four breakages the spike lists
  (`import.meta` at load, spawning `process.execPath` as Node, the lint plugin and wrangler as files, nx's native addon). The generated project
  CLI ships as a binary; `ortho` stays an npm package.
- **Atomic OAuth client-registration ceiling before public deployment (D3 #195).** The local count-before-insert guard
  is a throttle; concurrent registrations can exceed the nominal500 threshold. Keep role/JWT admission unchanged,
  but enforce a strict ceiling at its authoritative mutation before a public cloud rollout. No such rollout is in goal01.

- **Legacy host adapter policy debt (D3 #197).** Before extending the existing publish, world-process or host
  telemetry adapters, and before public cloud use, remove their remaining literal throw/try and ambient-env policy
  violations and close the corresponding workspace lint coverage gap. Local Gate2 records this limitation; it
  does not grant new runtime exceptions or claim every standing-rule syntax restriction was certified.

## From the factory (K10)

- **A `cloudflare` sandbox choice** for `@orthograph/sandbox`, beside `local` and `e2b` (K39, K40), if E2B falls short. Not spiked.
- **A person's feedback on a run** (HeroUI Pro's Rating and Emoji Reaction Button on a run's answer) as input to the bench (H2). Waits until the bench reports exist (M4.14).
- **Experiments shared between projects**: a kept experiment's plugin published for another app to mount. Waits on plugins published from their own CI (M2.10).

## From the grid (#154)

- **A list read's item samples.** When a list read lands (the model has no list marker today, and neither example has one), the MCP output-schema eval builds each
  item's sample from the declared fields, or reports the item unjudged. Items rebuilt from telemetry lack the untraced public fields and would be a false red.

## The portal's pages on portal-ui components (website builder, 20 November 2026)

- **Plain elements today.** The portal's pages are plain elements with `data-portal` hooks (and `Card` for cards), because the grid's evals and check 21 read the rendered DOM by its headings, tables, list items and hooks, and the HeroUI Pro licence is only in CI. `design/portal.md`'s component inventory maps every data shape to a named component (Widget, `CallsMeter`, `CallsBars`, DataGrid and so on), so the pages are a gap from the design.
- **Next:** swap each block for its component, one page at a time, built where the licence is. The `data-portal` hooks and the headings, tables and list items the evals read must survive each swap; check 21 and the grid are the guard.

## From prove's coverage (the eval 8 line, G3)

- **A "reachable from a journey" flag on the model's refusals.** Prove's coverage line leaves out the runtime refusals no journey can cause by name:
  every refusal coded under the runtime's prefix (`AR`) except `NotAllowed` (`packages/prove/src/modules/evals/internal/run.ts`, `unreachable`). That is
  inferred, so the next runtime refusal is classed by its prefix, right or wrong. When one arrives, the model should say per refusal whether a journey can
  cause it, and prove should read that. Waits on the next runtime refusal (121 to 125 are held for them, G3).
## From the grid (error.portal, #168)

- **`error.portal` can't see whether the portal really has a metrics source.** A page that always shows the `not-yet` marker
  (`data-hole="metrics"`) and never writes a count passes, even when refused spans exist, because the grid has no metrics source at
  M1.13 and the marker is not tied to a surface. When the portal gets a source in the grid, the eval must check the marker against
  the source (a marker with a source is wrong), and require the marker to sit on, or be visible next to, the refusal surface it
  excuses. Waits on a metrics source in the grid's portal data (M1.13's metrics reader, M7.14 for history).
- **Faster proving, the rest of track A** ([`research/speed-and-vitest-proposal.md`](research/speed-and-vitest-proposal.md)),
  after ST1.23 and ST1.24, one at a time:
  - A3, reuse a signed verdict keyed by handler hashes, journey text, model slice and framework version. Each key input needs a planted change of its own first.
  - A4, starting worlds as D1-plus-Durable-Object snapshots. Needs a spike.
  - A5, journeys at the same time. The performance eval must run apart.
  - A6, prove receives telemetry itself, without a collector process.
  - A7, load each command's code only when it runs.
- **Our own tests by what changed** (proposal B2, B3): tests that only need prove's result call it in process, and suites that start `ortho` carry a tag; CI then picks suites from a table of changed path to tag. It waits because nothing in CI may use `vitest --changed` before B2 (it would skip the climbability check).
- **Vitest for this repository** (proposal C2; spike `spikes/vitest-fixtures`, #189): world-starting checks on shared fixtures and report matchers, one config with named projects, the ratchet as a reporter, a slow-file budget. The checks author's work, after stage 1.
- **Vitest as a generated output for users** (proposal C1): each journey a suite, each step a test, run by prove's engine, with an Orthograph reporter and the journey checks as matchers. It waits for the framework session with Aaron.
- **One Cloudflare account per environment** (`decisions/M7-cloud.md`, addendum): today one account holds every environment, each resource prefixed by app, environment and run. When production holds real data, each environment gets its own account and token. It waits because nothing in that account matters yet (Aaron, 20 November 2026).

## From Codex's review of #159 (website builder, 20 November 2026)

- **The plugins page draws a `default` store, and no declared one.** The wire carries neither `model.stores` nor an environment's `stores` bindings
  (the compiler writes both: `packages/compiler/src/modules/model/stores.test.ts`), so `plugins.tsx` cannot tell a blueprint with no store from one
  with `ledger` and `rooms`. Plugged In declares none, and check 21 H expects the one `default` row. When the wire keeps stores, the page draws the
  declared ones and the `default` row only for a blueprint that declares none. Waits on the wire (the telemetry builder's `wire/**`).
- **Three edge cases in the calls reader (`packages/portal/src/modules/telemetry/internal/calls.ts`, `service.ts`).** (1) Several independent calls to
  one operation inside one trace (a journey calling `handle.claim` twice under one trace) group into one row; a call's own context should separate them.
  (2) `FileSource.window` returns whole traces, so a long trace's calls from before the window are listed and their moves counted while the metrics
  exclude them; calls should be cut at `since`. (3) A move counts when an answered call's attempt carries `move.name`, even if that attempt lost its
  commit race and a retry replayed a cached answer; it should wait for a committed `commit.outcome`. None is reachable from Plugged In's journeys
  today; each belongs to the telemetry reader, not the pages.

## From the snag triage (Goal 3 lead, 21 November 2026)

Each is a parked snag in `design/goals/03-snags.md`, with its trigger.

- **Journey language, five small gaps** (S-05 to S-09): a starting world parameterised per journey or minting names per run; a world's `gives` naming more than the last answer; a step comparing against the previous answer; stating (or changing) what `s.last` holds after a refusal; a raw payload step that can reach `InvalidPayload`. Plugged In's journeys route around each. Waits until a journey needs one: a world shared by two journeys, or a payload the operation does not declare.
- **Journey redaction as one rule** (S-14, ledger `HAN-12`): a completed operation's payload and `refuses` hide only declared non-public fields, so an undeclared key shows in the portal and `describe`. One rule shared with the visibility module (M1.35), check first. Waits on S-09's raw payload step, the only way a journey sends an undeclared key, and must be done before the release pass M7.13.
- **Wallet items for stage 2** (S-13 ledger `HAN-11`, S-15, S-17's `HAN-14`): a send that never reaches depth as a typed `SendRefused` failure; `Blueprint.error` deriving `_tag` from the declaring export so `packages/wallets/src/modules/submit/internal/names.ts` goes; the device SDK typing a redacted answer as partial. All three need S-18's chain settings or the browser path, and stage 1 has neither. Taken when ST2.01 starts.
- **Prove's report counts an unwritten journey** (S-21): a journey whose starting world fails reports `total: 0`, so the climb curve reads 0 of 0. The report gives it its real step count with `green: 0`. Waits until M2.07's tenancy journeys, which start from the `founded` and `invited` worlds, are climbed from red.
- **`--only` should not count coverage against the journeys it excluded, and the climber's worktree needs `pnpm install` said** (S-24): coverage lines ("reached by no journey") fail a one-journey run while every step is green; the goal's prompt says nothing of the install. Taken at the lessons step (loop step 5 of Goal 3). The scaffold half of S-24 is ST1.17's.
- **Declared names as constants, and a check that no state name is a string outside `generated/`** (S-26): `subject.state === "removed"` (`examples/plugged-in/src/link/order.ts:46`) and `refuses(machine.notFrom, { state: "removed" })` in two journeys move onto `machine.states.<state>` (ST1.14), then a lint or canon check pins it. Waits for a blueprint that renames a state.
- **The model records a value's pattern** (S-28): `Values.email`'s pattern lives only in its Schema, so the grid's output-schema eval uses a `max === 254` stopgap (`e2e/grid/src/modules/output-schema/internal/sample.ts`). The model carries a pattern or format, and the stopgap is deleted. Waits for a second pattern-bearing value, or a sample the heuristic cannot give.
- **Check 40's page judge: three counts and labels it does not read** (M1.50, round 3): a count made by a CSS `counter()` beside a state (`counter-increment` and `content: counter(n)`, which no text node holds); a label split into two `<text>` nodes, one of them far from the line; and whether labels drawn by React Flow's `EdgeLabelRenderer` (portalled outside the edge's `<g>`) should be judged at all, now that the judge expects `BaseEdge`'s `label`. Taken if a builder draws any of them.

## From check 39 (M1.49's monitor, 21 November 2026)

Check 39 (`e2e/m1/39-m1-49-monitor-derived.test.ts`) does not judge these three; the fixed shapes are in the addendum of `design/decisions/K18-monitoring-falls-out.md`.

- **An anomaly and a verdict actually firing**: the rules are derived and listed, but check 39 judges only the burn alerts' firing. A check that makes a refusal-code spike fire its anomaly, and a failed journey fire its verdict.
- **Nested declared steps, the deepest wins**: an issue's step is the deepest declared step span that errored with the failed attempt's own `error.tag` (an adapter's span is never chosen; a step that errored and was recovered is passed over when it carries a different tag; no such step is `-`, the operation itself; a call that ran out of tries is `commit`); check 39 plants one level (`link.add.record`). A defect two declared steps down, and the `-` and out-of-tries cases, are not judged.
- **The constructor-name fallback for `error.tag`**: a thrown error with no `_tag` takes its constructor's name; check 39 plants only a tagged error whose class name differs from its tag.

## From M2-auth (Goal 3 lead, 21 November 2026)

- **SDK and CLI reach filtering** (`decisions/M2-auth.md`, small calls 16; replaces `decisions/K1-kits.md`'s table at
  `:240-241`). In M2 only MCP tools are hidden by reach. The SDK and the CLI carry every operation, and the role check
  refuses what a credential may not do. K1 meant the SDK to carry only operations a session or a key can reach,
  and the CLI only those a device session or a key can reach. **Trigger:** a generated client's refusal on a call its credential
  could never make is reported as confusing in a journey or by a user, or the second app ships a CLI with an operation
  only `Via.agent` reaches.
- **A nonce lane shared across processes** (`decisions/W1-wallet-send-lanes.md`, Open). Today one process keeps one lock
  per account and chain, and two processes sending from one key share only the chain's pending count. **Trigger:** a server runs a
  key from more than one process or Worker, or a journey sends from one account in two processes at once.
- **A door added to an already-deployed app needs a 0002 migration.** The inbox columns (`id`, `actor`, the unique index) are written into `0001_things.sql` by `renderMigration` (`packages/projections/src/modules/server/internal/worker-config.ts`), which is only safe while the app was never deployed (the superagent). **Trigger:** an app that has been deployed gains a door, or Goal 17's doors reach another app.

## From the Goal 4 relayer review rounds (23 November 2026)

Five rounds of review on the relayer (M6.07) each found a valid nonce fault. The cause was the same every time: the relayer and `chain-evm`'s port
each owned a piece of one nonce's state, and the relayer guessed the rest. The first two entries below are cut from that slice by
`decisions/M6-relayer-rebroadcast.md`.

- **Fee-bump replacement of a dropped or stuck transaction** (its own slice). Today the relayer sends a dropped transaction again, byte for byte,
  and a transaction sent too cheap during a fee spike stays stuck, with every nonce behind it (`Relayer.health()` names it). The slice has the
  port own the whole lifecycle of a nonce (begin, broadcast, refuse, replace) behind one call, so the relayer never infers it, and brings back
  the two replacement cases on `e2e/on-chain/expected-failing/10-m6-07-relayer.txt` (they come off the list when it lands).
  **Trigger:** `health()` names a stuck nonce in a real environment, or a journey on a live chain meets a fee spike.
- **The relayer re-checks inclusion until a reorg depth.** Today a submission is final the first time its receipt is seen, so a reorg that drops an
  included transaction is not noticed. The relayer would keep a mined row open until it is a chosen number of blocks deep, and send the transaction
  again if the node no longer shows it. **Trigger:** the relayer runs on a chain that reorgs, or the follower reports a `Corrected` event for a
  transaction the relayer sent.
- **The follower's outbox, one key per entry.** Today a step stores all its sink entries as one value and rewrites the
  rest after each delivery, so a backfill with many confirmed events makes one large value and quadratic writes (🔍 on
  #679). The step would cap its entries or store one key per entry. **Trigger:** a follower backfills from an old
  `fromBlock` with thousands of events, or a Durable Object value nears its size limit.

## From the actions projection (Goal 5 lead, 23 November 2026)

- **A `retrySafe` predicate per operation** (`decisions/WEB-actions-projection.md`, call 5). A generated action never names `retrySafe`. An operation whose payload carries its own idempotency key could emit it as a predicate on the input (`spikes/agent-native-compat` finding 5). **Trigger:** the model can say an operation carries its own key.

## From #995's stand-ins (Goal 16, 25 November 2026)

- **Stand-ins under `ortho dev`.** Today only a world prove starts runs a mount's process stand-in (G16-adapter-mounts
  call 3), so a generated call in `ortho dev`'s world fails on the missing `<MOUNT>_BASE_URL`. Dev's world would start the
  stand-ins too, and `Warm.reset` would restart them so a reused world starts with fresh stand-in state; prove could then
  reuse a warm world for a model with stand-ins. **Trigger:** a developer needs a generated call to answer under `ortho dev`.
  Check 10's world-of-its-own test counts stand-in starts assuming dev starts none; its author changes that count then.
