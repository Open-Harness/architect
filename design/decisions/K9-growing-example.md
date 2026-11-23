# K9: one growing example, in four stages, to v1.0

> **Renamed by K15** (19 November 2026, Aaron): the example app is **Plugged In** (`plugged-in`), no longer `links`. Below, `links`, `examples/links`, `@links/*`,
> the `links` command and the tags `links/stage-<n>` keep their old spelling as the record of 18 November; read each as
> Plugged In, `examples/plugged-in`, `@plugged-in/*`, `plugged-in` and `plugged-in/stage-<n>`. See
> [`K15-plugged-in.md`](K15-plugged-in.md).

Decided 18 November 2026, by the building agent with Aaron's answers. The conductor's brief called this record K8, but
the canon's first review already holds that id (`K8-canon-review-one.md`, on `claude/docs-canon-cf2c38`), so this one
is K9.

This record replaces direction item 7 of `design/handoff.md`. The workshop mini DAO stops being the worked example,
and so do the sign-up sheet and the event tickets. It also settles where React hooks are built, and whether generated
actions are enough for an agent-native app to use them.

## Aaron's words

On 18 November 2026, starting this work:

> "We should have a thread about this example and we should use it consistently: something that can start off small
> and build with more plugins. Like we could have a linktree app where people could claim a username. It grows to give
> those users a wallet. Then we can build a multisig with budgets. Then we build privacy. But we need to have a few
> stages. Each stage is a meta milestone. All of them is v1.0. We should be able to build a bunch of reusable pieces to
> put this together. As we build it out and refactor, this is what we do. So the starter template needs changing, and
> all the examples. We need to think what the app looks like at each point. We also need to add React hooks to the
> framework, and assess whether just generating actions makes us compatible with agent-native apps, and if not, why."

His answers to the grill rounds, the same evening:

- **Stage 3:** "no i think we should do something like safe wallet, no voting on the dao just hats and budgets." Then,
  sharper: "stage three is Safe wallet with a budgets plugin installed."
- **Stage 4:** "stage 4 is basically stage 3 but on aztec. its a private members only club with private ballots."
- **Stage 1, stage 2, the order after workable and the canon's example.** These were put to him twice with a
  recommendation, and he didn't object. This record takes the recommendations. Any one of them is reopened if he says so.

## The app: `links`

The app is called `links` (a working name): its command is `links`, and its packages are `@links/*`. It lives in
`examples/links` and grows in place. When a stage's check passes on `main`, that state is tagged `links/stage-<n>`, so
every earlier stage can still be checked out and run.

Each stage adds **pieces**: plugins mounted with one file, written so that other apps reuse them. The app's own code
stays small: its profile and its links. Everything else is mounted.

| Stage | A person can… | Pieces it adds | Pieces it reuses |
|---|---|---|---|
| 1 · links | claim `@name`, put links on a public page | `@orthograph/auth`, `@orthograph/handles` | — |
| 2 · wallets | create a wallet on their device or link their own; be paid by handle | `@orthograph/wallets` and `@orthograph/chain-evm` (K7), the `erc20` adapter | auth, handles |
| 3 · the vault | run a group's Safe; give hats; spend within a hat's budget alone; collect owner signatures above it | `@orthograph/organizations`, the `safe` and `hats` adapters, `@orthograph/budgets` (a Safe module), `@orthograph/agents` | auth, handles, wallets, chain-evm |
| 4 · the club | join a members-only club on Aztec; spend privately within budget; decide big spends by private ballot | `@orthograph/chain-aztec`, `language-noir`, `@orthograph/ballots`, the budgets feature's Aztec choice | auth, handles, budgets |

**v1.0 is the four stage gates on `main`, plus the release** (superseded by K42, 23 November 2026: 1.0 is Capxul core on Orthograph, K43) (M7.01 to M7.04 and M7.06: the cloud pass, the packages
on npm, the infra projection, and a deploy and destroy that leaves nothing behind).

## Stage 1: links

**What a person can do.** Sign in, claim a free `@name`, and keep a public page of links. A name can be taken only
once. An unsigned visitor sees any page.

**What the app looks like.**

- **Screens** (three, by Aaron's yes to option A):
  - `/@aaron`: the public page, with name, links in order, and nothing else;
  - `/claim`: sign in, type a name, see whether it's free, claim it;
  - `/edit`: add, reorder and remove links.

  The screens are the app's own code in `src/web/`, built on the generated React hooks and served by the Worker.
- **CLI:**

  ```text
  links handle claim --name aaron
  links handle claim --name aaron      # HandleTaken (HN-001), exit 10
  links link add --title GitHub --url https://github.com/aaron
  links profile get --handle aaron
  ```
- **Portal:** the things `handle`, `profile` and `link`, with their lifecycles. A claim lights up `handle.claim` and
  the profile it creates in the same commit.
- **Agent:** an outside agent (Claude Code) uses the MCP tools, signed in by OAuth (M2.06): "claim aaron and add my
  GitHub". An agent-native app can host the same operations as actions (see "Agent-native compatibility" below).

**The blueprint at this stage.**

```ts
// examples/links/blueprint/features/handles.ts: the reusable piece, mounted
export default Blueprint.use(handles, (h) => [h.choose(h.choices.names.lowercase)]);

// in @orthograph/handles: blueprint/things/handle/verbs/claim.ts
export default Blueprint.operation(Handle, {
  description: "Claim a free name. A name is claimed once.",
  payload: { name: HandleName },
  answer: { handle: Handle.fields.id },
  move: machine.moves.claim,
  errors: [HandleTaken],
  allowed: [person],
  idempotent: "request",
});

// examples/links/blueprint/things/profile/thing.ts: the app's own code
export const Profile = Blueprint.thing({
  description: "A person's public page: their handle and their links, in order.",
  fields: { id: Blueprint.id("prf"), handle: Handle.fields.id, owner: Person.fields.id },
});
```

The app's `profile.create` answers `handles.events.HandleClaimed` through `on:` (M3.08's mechanism). Until that lands,
`/claim` makes both calls in a row. This is the canon's first example: the same lesson as the tickets' `event.claim`
(a refusal that depends on the data, idempotent by request), now in the app everything else grows from.

**Needs:** M1 and M2 (the gate's slices), plus the stage slices ST1.01 to ST1.08 in `milestones.md`. (Superseded by G10, 20 November 2026.) Until
M2.07, stage 1 signs in through auth copied from the starter, as acme does. M2 swaps that copy for the mount, and the
handlers don't change.

**Check (the stage 1 gate, joined to Gate M2).** `npm create orthograph demo` from Verdaccio scaffolds stage 1,
with auth and handles mounted and nothing copied, and `ortho prove --env local` is green. In headless Chromium, a
person signs in, claims `aaron` and adds a link, and `/@aaron` shows it. A second claim of `aaron` is refused with
`HandleTaken` and the same code through the SDK, the CLI, MCP, an action and the hook.

## Stage 2: wallets

**What a person can do.** Create a wallet on their own device, or link one they already have (built link-first). See
their address on their page. Pay anyone by handle in a test token, and see the payment go from pending to confirmed.

**The wallet's shape is K7's** (`design/decisions/K7-chain-languages.md`, "The wallet plugin", PR #53). This record
doesn't redesign it, and builds on K7's recommended forks as working assumptions:

- F1, a generated entry per operation with a manifest: used by stage 3's module;
- F2, `confirmed` as a level per chain and environment: decides when a payment shows as paid;
- F3, EVM now and Aztec later: stage 4 brings "later" inside v1.0;
- F4, the device half on Anvil after M1.14 (M1.27, `runs: "client"`), linking after M2.05, the relayer in M6;
- F5, where keys live.

Stage 2 depends on each of these. If Aaron answers one differently, this stage changes with it, not the other way round.

**What the app looks like.**

- **Screens:**
  - `/@aaron` gains **Pay @aaron**;
  - `/wallet` offers create (key kept on this device, encrypted) or connect, then shows the address, balance and
    history;
  - the pay sheet shows amount, then simulated, submitted and confirmed.
- **CLI:**

  ```text
  links wallet create
  links wallet link
  links pay --to @aaron --amount 5     # pending, then confirmed
  ```
- **Portal:** `wallet` and `payment` with their lifecycles. A submission shows its in-between states (S25). The
  follower's events light up the payment when confirmed.
- **Agent:** may prepare a payment. The person's device signs it (`needsApproval`). Agents never link a wallet (K7).

**Pieces.**

- `@orthograph/wallets` (K7's two halves);
- `@orthograph/chain-evm` (viem behind the `ChainPort`);
- an `erc20` adapter typed from the token's ABI. A test token is someone else's contract (K7 Q2): a source, never ours.

Handles resolve `@aaron` to the linked address.

**Needs:** K7's wallet slices (M1.27 to M1.32, and M2.13 for linking), M6.01, M6.02, M6.07,
M6.09, M6.15 and M6.18, M5.01 and M5.03 (events in, for the follower), and the stage slices ST2.01 to ST2.05.

**Check (the stage 2 gate, ST2.06).** On Anvil:

- aaron creates a wallet on his device, and bob links his own;
- bob pays `@aaron` 5 test tokens, simulated before sending;
- aaron's page shows the payment once it is `confirmed` by the follower;
- a forced reorg corrects it;
- the key-hygiene check passes;
- an agent's attempt to link a wallet is refused.

## Stage 3: the vault

**What a person can do.** A group (`@workshop`) has a Safe with its owners and a threshold, and the **budgets plugin**
installed in it. The owners give **hats**. A hat carries a monthly budget, and whoever wears it spends up to that alone.
A bigger spend is a Safe transaction that waits for the owners' signatures and runs once at the threshold. There is no
voting.

**The shape** (Aaron's answer):

- The Safe and Hats Protocol are **other people's contracts**: K7's rule, sources behind adapters typed from their ABI.
  They are deployed into the world from their published releases, pinned per R1 when the slice starts.
- **`@orthograph/budgets` is ours.** It is a feature whose on-chain half is one Solidity contract, a Safe module, that
  the Safe enables. The module checks that the caller wears the hat (through the Hats adapter's reads) and that the
  hat's budget for the period isn't exceeded, then executes from the Safe.
- This is acme's allowance moved on chain: `frame/examples/allowance-on-chain.md`. The same machine
  (`active`, `exhausted`, `revoked`) generates both the TypeScript and the Solidity, and the two are fuzzed against
  each other (S26).
- The workshop's governance, proposals and votes are dropped.
- **Collecting owner signatures is a durable workflow** (M3.01): propose, wait for signatures (each by an owner's
  wallet), execute at the threshold, await the confirmed event. Owners' signatures stay in the app's store (D1) until
  execution, as Safe's own transaction service does.
- **An agent can wear a hat.** Ada gives her agent a hat with a 20-a-month budget. The agent spends within it as
  `agent for ada` (M2.01), and anything above goes to the owners.

**What the app looks like.**

- **Screens:**
  - `/@workshop`: the Safe's balance, owners and threshold, and its hats;
  - `/@workshop/hats`: give or revoke a hat and set its budget;
  - `/@workshop/spend`: spend within your hat's budget, or propose above it;
  - `/@workshop/pending`: signatures so far; sign; execute.
- **CLI:**

  ```text
  links hat give --group workshop --hat spender --to @ada --budget 100/month
  links budget spend --group workshop --amount 20       # alone, within budget
  links safe propose --group workshop --pay @cy --amount 500
  links safe sign --id stx_9                            # 2 of 2: executed
  ```
- **Portal:** the Safe, hats and budgets with their lifecycles. The signature workflow's run lives on its activity
  timeline. An agent's run shows beside the spend it made.
- **Agent:** the portal's chat runs on a durable agent (M4.16), and an agent spends under its own hat.

**Pieces.**

- New:
  - `@orthograph/organizations` (the group; built in M2.07, first used here);
  - the `safe` and `hats` adapters;
  - `@orthograph/budgets`;
  - `@orthograph/agents`.
- Reused: auth, handles (`@workshop`), wallets and chain-evm.

**Needs:**

- `language-solidity`: M6.10 to M6.14, M6.16 and M6.17;
- workflows: M3.01 to M3.03;
- agents: M4.01 to M4.10 and M4.16;
- the stage slices ST3.01 to ST3.07.

The planned `examples/workshop` (M6.20) is dropped.

**Check (the stage 3 gate, ST3.08).** On Anvil, `@workshop` has a 2-of-3 Safe with the budgets module enabled:

- the owners give ada the spender hat at 100 a month;
- ada spends 20 alone;
- a 500 spend waits for two owners' signatures and executes once, even when the workflow's Durable Object is evicted
  mid-wait;
- revoking ada's hat makes her next spend fail with `HatNotWorn`;
- ada's agent, under its own 20 hat, spends 20 and is refused 21;
- fixed-seed fuzz of the TypeScript budget machine against the module finds no divergence.

## Stage 4: the club

**What a person can do.** Stage 3, on Aztec: a private, members-only club.

- Nobody outside learns who the members are.
- A member spends within their budget privately.
- A spend over budget is decided by a **private ballot**: one ballot per member, nobody learns who voted or how, and
  the tally is public.

**The shape.** It is K7's Aztec spike (`spikes/chain-languages/aztec/`) grown into the app:

- membership is a private note;
- a ballot is a one-use claim (a nullifier) scoped to the question, with an enqueued public tally;
- a budget is a private note spent down and re-created each spend.

The budgets feature is the **same declaration** as stage 3, with its Aztec choice (`choose(onChain.aztec)`). Written
once and generated in two languages is the point of the stage. `@orthograph/ballots` is the K7 governance contract made
a reusable feature.

The limits stay explicit, as K5 seam 7 wrote them:

- a transaction's sender, timing and fee payer are visible;
- linking a member's Aztec account to their person would undo the privacy (K7, the wallet plugin's item 4). So the
  club's members are not linked to their `@name`, and only the club's own handle is public;
- every claim about proofs runs in a `proofs: "verified"` world (K7 Q7), and an unverified proof blocks production
  (S30).

**What the app looks like.**

- **Screens:**
  - `/@club`: only the public footprint (the treasury total, the ballots and their tallies);
  - the members' area: proved on this device, it holds your budget, a private spend, and the open ballots, cast
    privately;
  - joining: an invitation that hands over a private note.
- **CLI:**

  ```text
  links club spend --amount 20 --private      # proved on this device
  links club ballot open --pay @cy --amount 500
  links club ballot cast --id bal_3 --choice yes
  links club ballot cast --id bal_3 --choice no   # AlreadyCast: the claim is used
  ```
- **Portal:** only what is public: claims, tallies, proving times. The vote's page says what stays visible (timing and
  the fee payer).
- **Agent:** may draft a ballot. Casting and private spends are `.notVia(Via.agent)`, because the proof is made in the
  member's own PXE.

**Needs:** the stage slices ST4.01 to ST4.07, which carry the old "Later: Noir" items and K7's Aztec design into v1.0.

**Check (the stage 4 gate, ST4.08).** In a `proofs: "verified"` world:

- three private members join by invitation;
- one spends 20 privately within budget, and the public footprint shows the total, not the member;
- a 500 spend passes by private ballot with a public tally;
- a second ballot by the same member is refused by its claim;
- a tampered proof is rejected;
- the portal shows nothing that names a member.

## What happens to each example

| Today | Becomes | Slice |
|---|---|---|
| `examples/starter` (auth copied) | stage 1 as `ortho new` scaffolds it. Until M2.09 it stays as is; then the template is `links` at stage 1, kept identical by a check: to `examples/links` on the same commit until M2.12 tags `links/stage-1`, then to the tag | M2.09 |
| `examples/signup` (the canon's example on `main`) | deleted once the canon quotes `links` | ST1.08 |
| `examples/tickets` (canon branch, not on `main`) | not merged. The canon thread swaps it for `links` before its next PR | canon list below |
| `examples/acme` | stays the fixture the existing gates run on, with no new work. Its allowance is the source the budgets feature is ported from. When `links` carries every gate check, acme is retired | ST2.05 |
| `examples/work` | not an example: it is the factory feature's app, moved into `@orthograph/work` in M3.05 as planned. Out of the canon | — |
| `examples/workshop` (planned, M6.20) | dropped: stages 3 and 4 replace it | — |

## React hooks

React hooks are designed in `frame/projections.md:261-275`: `useSpend()`, `useAllowance(id)`, typed refusals and
pending states. They are a projection built on the SDK, replayed in a real browser and never in jsdom. No slice owned
them. They come in three slices, each where a stage first needs it:

1. **ST1.01.** The react projection over the SDK (superseded by K29, 21 November 2026: ST1.25, the web projection,
   one UI SDK piece per operation):
   - one mutation hook per operation and one query hook per read;
   - declared refusals as classes in the hook's error;
   - `pending` while a call is in flight;
   - one `requestKey` per form open, kept across the hook's retries.

   It is replayed with `--through react` in headless Chromium.
2. **ST1.06.** (Superseded by K29, 21 November 2026: pieces, not hooks.) Hooks behind a signed-in session (`Via.session`). The links screens sign in and claim through them.
3. **ST2.03.** (Superseded by K29, 21 November 2026: pieces, not hooks.) Hooks for client operations and chain submissions: the submission lifecycle (`simulated`, `submitted`,
   `included`, `confirmed`, `dropped`, `reverted`, `corrected`) as hook state, and the wallet's device half run in the
   browser.

The hooks live in the separate `@orthograph/react` package, which K5 called `@orthograph/portal`'s React side, so
`orthograph` stays Effect-only.

## Agent-native compatibility

**Is it enough to generate actions with agent-native's `defineAction` field names? No. It is close, and the gap is
known.** Evidence: `spikes/agent-native-compat/README.md`. The spike ran agent-native 0.228.2's own HTTP route
(`mountActionRoutes`), its own agent loop (`executeAgentToolCall`, with a stub instead of a model), its registry and its
CLI. It ran nothing of agent-native in `packages/`.

What works:

- every field K5 names type-checks against agent-native's own `defineAction`;
- an Effect schema through `toStandardSchemaV1` and `toStandardJSONSchemaV1` is advertised correctly;
- Effect and `fetch` inside `run` work under agent-native's execution frame, on Node;
- an agent-native app registers the action with a one-line file in its `actions/` folder.

What K5 got wrong or left out:

1. **K5's `run` doesn't compile.** agent-native's `ctx` has no `sdk` and no `callId`, and it may be undefined.
   - The generated module exports `options(host)`, not a `defineAction` call.
   - The agent-native app writes `export default defineAction(options(host))`.
   - Our own portal wraps it with our `defineAction`.
   - `host` supplies the SDK client, the caller credential and `requestKey(ctx)`.
   - Passing the raw options object registers nothing.
2. **Refusals must leave as agent-native's "no write" error.** agent-native detects error kinds by their shape, not by
   class (`dist/action.js:82-89, 128-131`). A generated `ActionRefusal` that carries `actionContractError`, `noWrite`,
   `errorCode`, `statusCode: 422` and `details` gets a 422 with its body over HTTP, and the agent loop classes it as
   "no write". Without `noWrite`, the agent treats any failure of a write as "outcome unknown", even one that leaves
   HTTP as a 422 (agent-native's own `fail()`, or a bare `statusCode: 422`). A plain error, or an Effect
   `FiberFailure`, is a hidden 500 over HTTP. The agent's tool path shows defects' raw messages, so the generated code
   redacts them.
3. **`retrySafe: true` is harmful.** It makes a Worker 500, which may have committed, look like "no write".
   - It is not emitted.
   - `toolCallId` survives the loop's own replay, but not the model sending the call again: calls with ids A, A, B
     committed twice.
   - The frontend has no key at all unless the app passes one through `useActionMutation({ headers })`.
   - An operation that must not happen twice needs an idempotency key the domain chooses, not only a request key.
4. **Only `userEmail`, `orgId` and `caller` reach `run`**, and the tool path has no request headers. Until M2, a
   hosted action can call only operations open to anyone, or one fixed credential held by the host. ST1.05 adds the
   host's caller: a key that acts as `agent for <person>` by email, refused on `.notVia(Via.agent)`.
5. **Approvals belong in the wrapper, never in `run`.** agent-native asks before `run` on every door. If the
   generated `run` waited for a yes as well, the person would be asked twice.
6. **Two schema traps.**
   - A schema with only `validate` is advertised as `properties: {}`, with no warning.
   - `Schema.optional` is advertised as `string|null`, but the validator rejects `null`.

   The generator uses `Schema.optionalKey` and checks that the advertised parameters aren't empty.

**Not run:** the typed hooks, agent-native's MCP door (it needs OAuth), workerd, and the real generated SDK. A local
server stood in for the Worker.

These findings change M1.22 and M1.23 and add ST1.05 (see `milestones.md`). The rest of K5's porting stands. Our own
doors stay ours: our MCP, our CLI, our SDK. Compatibility is a contract we keep: the field names and the "no write"
error's shape, recorded from 0.228.2, and the spike re-run on each agent-native version we claim.

## The order after workable

By the recommendation Aaron let stand, the stages are the order:

1. **After Gate M2 (stage 1),** stage 2 comes next.
2. **Then stage 3,** which pulls in workflows from M3 and agents from M4.
   (Superseded in part by K26, 20 November 2026: the on-chain slices of stages 2 and 3 are pulled forward, Aaron's
   exception; their gates still run here.)
3. **Then stage 4.**
4. **Then the release.**

The factory (M3.04 to M3.14) and the builder's agent tools (M4.11 to M4.14) run beside the stages. They are off
v1.0's path, as the milestones already said ("make that faster but don't gate it"). M5's views, Stripe, Resend,
MariaDB and second-app adapters, and M7's Capxul slices, are also beside. Capxul's first plugin, the wallet, is stage 2. (Superseded by M7-capxul, 22 November 2026.)

`milestones.md` keeps every slice id. A new section, "v1.0: four stages", says which slice belongs to which stage and
gives each stage its gate. The gates of M3 to M6 no longer order the work: where a stage's slice needs one of them,
a stage gate stands in (the table in that section, M7.01 included), and their suites run beside.

## Canon changes, for the conductor to relay

The docs canon thread owns `docs/canon/`. These are the changes this record asks of it:

1. **The example is `examples/links`**, stage 1 for layers 1 to 3:
   - `handle.claim` replaces `event.claim`. It teaches the same lesson: a refusal that depends on the data, idempotent
     by request, and a second thing (the profile) made from the claim;
   - `roles` uses `person` and the profile's owner;
   - `examples/tickets` isn't merged, and `e2e/layer1/08-*` becomes `08-links-proves`.
2. **From layer 4 on, the example is `links` at stages 2 to 4, not the workshop:**
   - stores: D1, then the chain;
   - workflows: collecting a Safe's signatures;
   - private state: stage 4's club.
3. **`outline.md`'s "Examples" paragraph (lines 32-33)** says which stage each layer quotes.
4. **`doors.mdx`, actions:**
   - the generated module is `options(host)`, wrapped by the host's `defineAction`;
   - refusals are a no-write `ActionRefusal`;
   - no `retrySafe`;
   - the host's caller.
5. **`doors.mdx`: a React hooks section** (`planned=ST1.01`).
6. **A short page or section, "the example", with the four stages.** Each stage gets its screens, pieces and check, and
   links into this record.
7. **Chain pages** cite K7 for chains and wallets, and K9 for which stage uses what.

## Decided here

1. One app, `links`, in `examples/links`, grows through four stages. Each passing stage is tagged `links/stage-<n>`.
2. v1.0 is the four stage gates plus M7.01 to M7.04 and M7.06. (Superseded by K42, 23 November 2026: 1.0 is Capxul core on Orthograph, K43.)
3. The pieces:
   - `handles` and `budgets` are new features;
   - `ballots` is K7's governance contract as a feature;
   - `safe`, `hats` and `erc20` are adapters over contracts we don't write.
4. Stage 3 is a real Safe and Hats, with our budgets module as the one contract we write. Stage 4 is the same budgets
   declaration on Aztec, with private membership and private ballots.
5. React hooks: ST1.01, ST1.06, ST2.03.
6. Agent-native: `options(host)`, the no-write refusal, no `retrySafe`, approvals in the wrapper, and the host's caller
   in ST1.05.
7. The starter is stage 1. `signup` and `tickets` go, `acme` is retired once `links` carries the gates, `work` stays as
   the factory's app, and the workshop is dropped.

## Open risks

- **K7's forks are not answered yet.** Stage 2 rests on F1 to F5. A different answer moves stage 2's slices, not this
  record's stages.
- **Safe's and Hats' releases** must be at least three days old and deployable on Anvil. A module and a Hats read inside
  one Safe execution is new ground. ST3.01 spikes it first.
- **Aztec in v1.0** brings the furthest-out work forward: `language-noir`, a verifying world, and Aztec's release
  cadence. ST4.01 spikes the budgets declaration in Noir before anything else in stage 4.
- **The starter and `links` stage 1 are two copies.** The check in M2.09 keeps them identical.
- **A request key can't stop a model re-issuing a call.** A spend that must not repeat needs a domain idempotency key
  (the spend's own id, chosen by the client).
