# What Orthograph is, and how to think in it

Written 20 November 2026 for a working session between Aaron and the conductor, and settled on 21 November 2026 under
Aaron's standing word to the conductor: "anything that's waiting on me, just go with the recommendations." It says what
Orthograph is, how to think in it, what the loops look like and where the core ends. The five calls it led to, with
their evidence, are in [`../decisions/K30-the-model-and-the-map.md`](../../../decisions/K30-the-model-and-the-map.md).

What is built and what is left, capability by capability, and the three releases (a preview, a beta and 1.0) are in
[`../scope.md`](../scope.md) and [`../decisions/K28-releases.md`](../../../decisions/K28-releases.md). This page doesn't
repeat them. It covers the parts they don't: the layers, the ideas, the loops and the map.

Every claim carries a mark:

- **built**: in the code, with a `file:line` or the check that proves it. Line numbers are at `origin/goal/stage-1`,
  commit `37778735`, unless a line says `main`.
- **designed**: written down, not built, with the design file.
- **open**: nobody has decided it yet.

The words are the canon's (`docs/canon/outline.md`). Three words sort packages into buckets. **Core** is the scope map's
word for the framework's own packages (`../scope.md`, "The core"); the canon's layer "the core" is the declarations
those packages compile. **Standard library** is what the canon's last layer calls "what Orthograph ships": plugins an
app chooses to mount. **Ours** is what only Capxul needs. The canon's words for what a plugin is are its five kinds.

## 1. What Orthograph is

Orthograph is a framework where you describe a system once and everything else falls out of that description. You write
the blueprint: the things your app keeps, the operations that change them, who may call each one, the machine each thing
moves through, the events, refusals and rules, and the journeys that prove it works. Orthograph compiles that into one
model, then generates the server, the HTTP API, the SDK, the command line tool, the MCP tools, the docs and the portal
from it. The only code you write by hand is behaviour: a handler for each operation, inside a frame the blueprint
generated, so code that breaks the contract doesn't compile. Everything that runs is judged against the description by
the same names, and a change to the description marks exactly what it made stale. The repository's
[`README.md`](../../../../README.md) carries the short version of this paragraph as the project's goal.

### The layers of generation

Five layers, top to bottom. What flows down is the description. What flows back up is evidence.

| Layer | What it is | Where it lives | Who owns it | Mark |
|---|---|---|---|---|
| 1 · the blueprint | what you write: one declaration per file, its name from its path | `blueprint/`, plus `journeys/` | you | **built** |
| 2 · the model | the compiled blueprint: one JSON, every declaration with its hash and what it uses | `ortho model --json` (`packages/cli/src/main.ts:23`), written to `generated/model/model.json` | the compiler | **built** |
| 3 · generated | every output, rendered from the model on each generate, never edited | `generated/<output>/` | the model | **built** |
| 4 · scaffolded | written once, then yours: a handler per operation, a mount file | `src/<thing>/<verb>.ts`, `blueprint/projections/*.ts` | you, from then on | **built** |
| 5 · the running world | the project running for a purpose: `ortho dev`, a prove's world, `ortho env up` | local workerd, D1, Durable Objects | nobody: made and destroyed | **built** locally; staging is the beta's (K28) |

**What flows down.**

1. You write `blueprint/things/handle/verbs/claim.ts`.
2. `ortho generate` compiles it and writes the outputs. Each generated file names what it came from:
   `// Generated from blueprint/projections/sdk.ts. Do not edit.`
   (`examples/plugged-in/generated/sdk/src/handle/claim.ts:1`). It also scaffolds a handler once for every operation of
   the app's own that has none (`packages/generators/src/modules/render/service.ts:20`). The handler opens with
   `// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.` and a header that explains the
   operation (`examples/plugged-in/src/handle/claim.ts:1-40`).
3. `ortho dev` or `ortho prove` runs it all in a world (`packages/cli/src/main.ts:37`, `:65`).

**What flows back up.**

1. **Drift.** `ortho check` fails if any file in `generated/` differs from what the model renders
   (`packages/cli/src/modules/check/service.ts:31`). That is how "never edited" holds. **built**
2. **Evidence.** Every call leaves spans, events and refusals named from the model (`handle.claim`,
   `handle.claim.record`). Journeys assert on them (`examples/plugged-in/journeys/claim-a-handle.ts:43`). **built**
3. **Staleness.** A full prove writes a ledger of what each passing operation rested on
   (`packages/prove/src/modules/prove/service.ts:67`, kept in `.ortho/evidence/proven.json` by
   `packages/prove/src/modules/impact/internal/ledger.ts:7`). `ortho impact` compares today's model, handler bodies and
   journeys with it and names each operation stale, proven or unproven
   (`packages/prove/src/modules/impact/service.ts:53-70`). `ortho prove --changed` reruns only the journeys a change
   touched (`packages/cli/src/main.ts:73-74`). **built**
4. **The portal.** Live calls from `ortho dev` and from a prove feed the portal's metrics and traces
   (`packages/prove/src/modules/prove/service.ts:88-89`). **built**
5. **The scaffold growing with the blueprint.** `ortho check` warns when a declared refusal, state or step has no place
   in a handler you already wrote (`design/goals/03-snags.md`, "S-10", fixed). **built**

## 2. The mental model

### The ideas you think in

Each idea is one plain sentence and the real file that declares it in Plugged In (`examples/plugged-in/`) or the
starter (`examples/starter/`).

| Idea | In one sentence | Declared in | Mark |
|---|---|---|---|
| **thing** | A noun with an id, fields and an owner of its state. | `examples/plugged-in/blueprint/things/handle/thing.ts:4` | **built** |
| **field** | One named part of a thing, made of a value, with a description. | same file, lines 8-12 | **built** |
| **value** | A named field type that says what it is in every language. | `examples/plugged-in/blueprint/values/page.ts:3` (`HandleName`) | **built** |
| **machine and states** | A thing's states and the moves between them; a move from the wrong state is refused for you. | `examples/plugged-in/blueprint/things/handle/machine.ts:5-12` | **built** |
| **operation** | A verb on a thing: payload, answer, refusals, move, who may call, steps, budget. | `examples/plugged-in/blueprint/things/handle/verbs/claim.ts:6-15` | **built** |
| **read** | An operation that changes nothing and has no handler. | `examples/starter/blueprint/things/organization/verbs/get.ts:5` | **built** |
| **refusal** | A declared error with an exit code and a stable code (`HN-001`). | `examples/plugged-in/blueprint/things/handle/errors.ts:3` | **built** |
| **event** | What a move records, named `<Thing><PastTense>`. | `examples/plugged-in/blueprint/things/handle/events.ts:4` | **built** |
| **role** | Who may call, as a rule over one thing, or a built-in (`anyone`, `signedIn`). | `examples/plugged-in/blueprint/things/handle/roles.ts:5` | **built** |
| **rule** (invariant) | Something that must hold across records, such as "one holder per name", and the refusal when it doesn't. | `examples/plugged-in/blueprint/things/handle/invariants.ts:7-10` | **built** |
| **journey** | A story through real operations, played by a cast, that is the spec. | `examples/plugged-in/journeys/claim-a-handle.ts:14` | **built** |
| **starting world** | A named setup, made only by running operations. | `examples/plugged-in/blueprint/starting-worlds/claimed.ts:7` | **built** |
| **environment** | One file saying where the app runs, who signs in, and its database. | `examples/plugged-in/blueprint/environments/local.ts:3` | **built** |
| **mount** | One file that says "use this plugin here, like this". | `examples/plugged-in/blueprint/projections/server.ts:5` | **built** |

A rule owns its refusal. The claim operation declares no errors of its own, because the runtime refuses `HandleTaken`
and `HandleAlreadyOwned` for the rules (`examples/plugged-in/blueprint/things/handle/verbs/claim.ts:5`), and the
handler no longer checks them by hand (`examples/plugged-in/src/handle/claim.ts:46`).

### How to think in Orthograph

1. **Declare what you know.** Write the things, the operations and, if you know them, the machine and the rules. Don't
   write what you don't know yet.
2. **Leave blanks for the agent.** A gap is a `Blueprint.todo("what goes here")`
   (`packages/orthograph/src/modules/blanks/service.ts:4`). It compiles, and `ortho check` names every one until it is
   filled (`packages/cli/src/modules/check/service.ts:21`). **built**
3. **Journeys are the spec.** A different agent from the builder writes them, and they fail on empty handlers before
   anyone builds (`AGENTS.md`, "Journeys and checks come first"; `ortho prove --empty`, `packages/cli/src/main.ts:71`).
   Building is climbing: run prove, fix the handler, run again, until every journey is green. **built**: Plugged In's
   seven journeys pass, 56 of 56 steps, as a required check on `goal/stage-1` (`../scope.md`, "Stage 1").
4. **The grid is the guardrail.** Every building block in every output is an eval: does the SDK carry the events,
   does the CLI carry the refusals (`design/decisions/K14-the-grid.md`; the cards in `design/grid/grid.json`). The climb
   proves the app works; the grid proves every output carries every building block. **built** as a CI check,
   `e2e-grid`, green in the scope map (`../scope.md`, "Climb check and the grid").
5. **Outputs fall out.** You never write the SDK, the CLI, MCP or the docs. A change to the blueprint changes all of them
   (`packages/generators/src/modules/render/service.ts:11-21`). **built**

## 3. The loops

### The ideation loop: from an idea to a demo

1. **Name the idea in one sentence.** Plugged In's: "claim `@name`; a public page of links" (`design/milestones.md`,
   the stage table). A habit, no command.
2. **Declare the things.** `ortho add thing handle` writes seven files: the thing, its machine, roles, events, errors,
   rules and values, each gap a blank (`packages/cli/src/modules/add/internal/templates.ts:7-69`). **built**
3. **Declare the operations.** `ortho add operation handle.claim`, once per verb
   (`packages/cli/src/modules/add/internal/templates.ts:72`). **built**
4. **Maybe a machine and states.** Fill the blank in `machine.ts` by hand today. Saying the states and verbs on
   `ortho add thing` is the call in K30, section 3; `ortho add move` and the kinds that edit in place are
   **designed** (`design/milestones.md`, M2.15).
5. **Maybe rules.** Fill in the `invariants.ts` stub beside the machine. **built**
6. **Journeys.** `ortho add journeys handle` writes a stub for every path through the machine, every role and every
   declared refusal (`packages/cli/src/main.ts:170`; `packages/cli/src/modules/add/README.md:7`). A journey author fills
   them in. **built**
7. **Check.** `ortho check` names blanks, type errors, lint findings and drift. **built**
8. **Climb.** `ortho generate`, then `ortho prove`, then fix handlers until green. **built**
9. **The portal.** It opens on the app's things, operations, lifecycles, rules, traces and journeys. **built**, with
   pieces missing (`../scope.md`, the portal viewer's row).
10. **The demo.** A person uses the generated CLI against `ortho dev`. **built**. Plugged In has no web pages yet: the
    three screens are the beta's (`../scope.md`, the row for Plugged In's three screens).

**The friction in steps 2 to 6.** "Declaring what I know" is four or more separate commands, and each writes blanks for
things you already knew. A thing with three verbs and a known machine is `ortho add thing handle`, then
`ortho add operation` for `handle.claim`, `handle.release` and `handle.resolve`, then hand edits to fill in the states
you knew all along:

```ts
// packages/cli/src/modules/add/internal/templates.ts:28-32, what `ortho add thing` writes into machine.ts
export const machine = Blueprint.machine(${T}, {
  states: Blueprint.todo("the states ${article(thing)} can be in, the first one where it starts"),
  moves: {},
  notFrom: { exit: 40 }, // the exit code when a move can't start from the state it's in
});
```

Journeys also have two homes. `ortho add journey` writes to `blueprint/journeys/`
(`packages/cli/src/modules/add/internal/templates.ts:101`), Plugged In keeps them in `journeys/` at the project root,
and `ortho brief` reads both (`packages/cli/src/main.ts:278`). **open**

### The dev loop: edit, check, prove, see what's stale

1. **Edit** a handler in `src/` or a declaration in `blueprint/`. **built**
2. **`ortho generate`** re-renders `generated/` and scaffolds any new handler. It prints each change, and marks a new
   scaffold "yours from now on" (`packages/cli/src/modules/generate/service.ts:22`). **built**
3. **`ortho check`**: blanks, types, rules, drift and ratchets (`packages/cli/src/modules/check/README.md:3-14`).
   **built**
4. **`ortho prove`**: a world, every journey, nine evals per operation, and a report with `--report` or `--json`
   (`packages/cli/src/main.ts:65-78`). `--only <journey>` runs one; `--changed` runs only what a change touched.
   `ortho dev` keeps a warm world that prove reuses (the warm-world slice, ST1.24, done). **built**
5. **`ortho impact`**: what the change made stale, from the ledger the last full prove wrote. Editing one handler makes
   only that operation stale (M1 gate item 3; verdicts keyed by each handler's hash, M1.04, done). **built**, locally only: CI never reads it (section 5).
6. **See it.** The portal shows the live calls `ortho dev` and prove make. **built**

### The extraction loop: from app code to a plugin

Aaron's rule, as the conductor relayed it on 20 November 2026 and K30 now records it: build a thing once inside an
app, use it, then extract it. Here is the loop with the real candidate: the
starter's hand-written people, sessions, organisations and invitations.

**What the candidate looks like today.** The starter declares `person`, `session`, `api-key`, `organization`,
`membership` and `invitation` as its own things (`examples/starter/blueprint/things/`), with nine handlers in
`examples/starter/src/`, 153 lines in all. Sign-in calls the runtime's `Auth` service
(`examples/starter/src/session/sign-in.ts:3`), which is Better Auth inside the Cloudflare host
(`packages/host-cloudflare/src/modules/auth/README.md:3`). Every new project gets a copy, and from then on it is that
project's own code.

```ts
// examples/starter/blueprint/things/organization/thing.ts:4-7
export const Organization = Blueprint.thing({
  description: "A company or team that people belong to.",
  fields: { id: Blueprint.id("org"), name: Blueprint.text(), owner: Person.fields.id },
});
```

**The loop, step by step.**

1. **Find the seam.** Identity (person, session, api-key) and tenancy (organisation, membership, invitation) become two
   plugins, `@orthograph/auth` and `@orthograph/organizations` (**designed**: `design/milestones.md`, M2.05 and M2.07;
   `design/frame/mounting.md`, "Auth, mounted rather than copied").
2. **Make the package.** `ortho new feature auth` makes a package with its own `blueprint/`, `src/`, journeys, example
   app and world. **designed** (M2.10), and the least specified slice of the beta (`design/milestones.md`, "Risks").
3. **Move the declarations and handlers in, unchanged.** The starter's journeys move with them (M2.02). **designed**
4. **Write the descriptor.** One `feature.ts`: its description, needs and choices. **built** as an API
   (`packages/orthograph/src/modules/plugins/service.ts:16`); wallets has one (`packages/wallets/feature.ts:4-7`).
5. **Prove it alone, in its own world and CI.** **designed** (M2.10).
6. **Publish it.** `ortho publish --local` today publishes an app's generated SDK and CLI, not a plugin
   (`packages/cli/src/modules/ship/README.md:13`). Publishing a plugin is **designed** (M2.10); npm under `next` is the
   preview's (K28, M1.51).
7. **Mount it with one file.** `ortho add feature @orthograph/auth` pins the version, refuses one under three days old,
   writes the mount and lists unmet needs (`packages/cli/src/modules/mounting/README.md:3-8`). **built**
8. **Delete the copy.** Identity's copies go with the auth plugin (M2.05); acme keeps no `organization/` folder once
   organisations are a plugin (M2.07's done-when). **designed**

**What exists today.** Mounting is real: descriptors, the four verbs, needs and clashes are built and checked
(`design/milestones.md`, the verbs slice M1.07 and the needs slice M1.08, both done). `packages/wallets` is the one feature plugin, with its own journeys
(`packages/wallets/blueprint/journeys/`). Six projections are plugins an app mounts: model, API, server, SDK, CLI and
MCP (`packages/projections/src/main.ts:4-9`; Plugged In mounts all six in `examples/plugged-in/blueprint/projections/`).

**What doesn't.** No example app mounts a feature. Wallets is mounted only by tests: a fixture copy of it
(`@fixture/wallets`) into a copy of acme (`e2e/m1/09-wallet-journeys.test.ts:75`), and the package itself into a test
project (`packages/prove/test/device-journeys.ts:65`). `ortho new feature`, a plugin's own CI and publishing a plugin
are M2.10. So the extraction loop has never been run end to end.

**The next candidate** is Plugged In's own `handle` thing, made the feature `@orthograph/handles` (**designed**:
`design/milestones.md`, ST1.03; part of the beta in K28). It fits Aaron's rule: it was built in the app and climbed
green first.

## 4. The framework map

### The core: the smallest Orthograph that is useful alone

**The core is everything needed to go from a blueprint to a proved app on one host, in one language, on this machine**
(K30, section 1). That is the `Blueprint` API, the compiler, the generators, the Effect language, the Cloudflare host,
prove with its evals and the ledger, the logbook, the `ortho` command and its lint rules, and three projections: the
model, the API and the server. With only the core you can write Plugged In, generate its server and API, and climb its
journeys. The pieces are **built**; the bucket itself is **designed** (K30). Three edges cross it today, and K30
section 1 names them: the generators import the portal (`packages/generators/package.json:8`), prove imports the EVM
chain port for wallet worlds (`packages/prove/package.json:14`), and the command depends on the whole projections
package, SDK, CLI and MCP included (`packages/cli/package.json:9`). No check yet proves an app with only the core.

### The extension points

A plugin is one of five kinds (`design/decisions/K27-three-plugin-kinds.md`, decision 2).

| Kind | What it adds | Plugins today | Built in today | Mark |
|---|---|---|---|---|
| **feature** | what else the system is: things, operations, handlers, journeys | `@orthograph/wallets` | auth (in the host and the starter) | **built** as a mount; one plugin |
| **adapter** | what is outside it: calls out, events in, a stand-in | none; test fixtures only (`e2e/m1/03-adapter-mounting.test.ts`) | none | **built** as a descriptor (`packages/orthograph/src/modules/plugins/service.ts:17`) |
| **projection** | how people reach it | model, API, server, SDK, CLI, MCP (`packages/projections/src/main.ts:4-9`) | docs and the portal (`packages/generators/src/modules/render/service.ts:14-18`) | **built** for six of eight |
| **language** | what behaviour is written in | none as a plugin | `@orthograph/language-effect` | **designed** as a kind (K27); a package today |
| **host** | where it runs, how it is reached and deployed | none as a plugin | `@orthograph/host-cloudflare` | **designed** as a kind (K27); a package today |

### The standard library: what Orthograph ships for apps to mount

| Plugin | What it is | Mark |
|---|---|---|
| `@orthograph/auth` | people, sessions, API keys, the device flow, OAuth for MCP | **designed** (M2.05, M2.06); built today inside the host and the starter |
| `@orthograph/organizations` | organisations, memberships, invitations, `holds` | **designed** (M2.07); built today as starter copies |
| `@orthograph/handles` | a public name one person holds | **designed** (ST1.03); built today as Plugged In's own thing |
| `@orthograph/wallets` | keys on a device or a server: make, import, sign, send | **built** (`packages/wallets/README.md:3`) |
| `@orthograph/react` | one hook per operation and per read | **designed** (ST1.01) |
| docs and the portal | the readers' projections; the portal's components move from HeroUI Pro to UI SDK ([K24](../../../decisions/K24-ui-sdk.md)) | **built** in, to become standard projections (K30, section 1) |
| the Safe, budgets and hats plugins | a multisig vault with budgets, for stage 3 | **designed** (`design/milestones.md`, stage 3) |
| `@orthograph/stripe`, `@orthograph/resend` | payments and email adapters | **designed** (M5) |
| `@orthograph/agents`, `@orthograph/work` | durable agents; the factory | **designed** (M3, M4) |

### Ours: Capxul's pieces

Capxul (`/Users/abuusama/projects/capxul-next`, read at `50851875`) is not built on Orthograph. It has its own
blueprint package and its own generator, with the same ideas by hand: a `things/<thing>/` folder per domain
(`packages/blueprint/src/things/`) and generated indexes (`packages/generate/README.md`). So moving Capxul onto
Orthograph means declaring it again, not mounting what is there.

| Capxul piece | What it does | Where | Kind once on Orthograph |
|---|---|---|---|
| identity | a caller acts as the world's owner or a named person; real sign-in comes later | `packages/blueprint/src/protocol/sign-in.ts:12` | mounts `@orthograph/auth` |
| hats | each role is a hat someone wears, on Hats Protocol; Frappe roles come from hats | `packages/core/src/organizations/grant.ts:29` | feature, needs Safe; standard library |
| budgets | a tree of USDC allowances, each tied to a hat | `packages/contracts/src/money/Budgets.sol:18` | feature, partly on chain; standard library |
| approvals | directors sign a proposal, then it goes out as a Safe transaction | `packages/core/src/approvals/sign.ts:37` | feature; ours until a second app needs it |
| payments | on-chain payments, then an ERPNext Payment Entry | `packages/core/src/approvals/payments.ts:33` | feature plus a bench adapter; ours |
| Safe | builds and relays Safe transactions | `packages/core/src/chain/safe.ts:56` | adapter; standard library |
| Bridge | banking through Bridge accounts | no code; `docs/roadmap.md:59` | adapter, **open** |
| the Frappe bench | an ERPNext site per company, reached through a door | `packages/frappe-app/capxul/hooks.py`, `packages/core/src/site/SiteDoor.ts:58` | a source through an adapter (`design/decisions/K3-stores-and-sources.md`); ours |
| agents as users | an agent may act for a member, and may own a Safe | `packages/contracts/src/agents/AgentOwner.sol:89` | the `agent` principal (M2.03) and the agents feature (M4) |

Hats, budgets and the Safe adapter are standard library because Plugged In's stage 3 needs them too
(`design/milestones.md`, stage 3). What stays ours is what only Capxul needs: approvals as its directors run them,
payments into ERPNext, and the bench.

### The repositories

Two repositories (K30, section 2):

- **`orthograph`**: the core and the standard library, one monorepo, as today. Nx tags would mark each package's
  bucket, and lint would hold the line that the core imports nothing from the standard library. **designed**: today's
  tags are the scope and environment tags (`design/packages.md`, "Rules"), not these buckets.
- **`capxul`**: the app, plus its own plugins in `plugins/`, mounting Orthograph's packages from the registry.
- **Later, only if release pace differs:** the standard library in its own repository.

Every package in `packages/`, by bucket:

| Package | Bucket | Why |
|---|---|---|
| `orthograph` | core | the front door: the `Blueprint` API; depends only on Effect |
| `compiler` | core | the blueprint to the model |
| `generators` | core | the Nx plugin that renders and scaffolds |
| `language-effect` | core | the one language, and the runtime generated code runs on |
| `host-cloudflare` | core | the one host; its auth module moves to the standard library (M2.05) |
| `prove` | core | worlds, journeys, evals, verdicts, impact |
| `cli` | core | the `ortho` command |
| `lint` | core | the rules types can't see |
| `logbook` | core | where verdicts and releases are kept |
| `preset` | core, for now | makes a new project until `ortho new` (M2.09) |
| `projections` | core for model, API and server; standard library for SDK, CLI and MCP | one package today; the split is by tag, not by package |
| `portal` | standard library | a projection by design (`design/frame/projections.md`, 3.8); built in today |
| `portal-ui` | standard library | the portal's components behind one seam; HeroUI Pro today, UI SDK next ([K24](../../../decisions/K24-ui-sdk.md)) |
| `wallets` | standard library | the first feature plugin |
| `chain-evm` | standard library | the EVM chain port wallets is built on; not an Orthograph adapter plugin |
| `language-solidity` | standard library, later | a placeholder until on-chain work |
| `services` | neither: private | stand-ins for tests and gates; never published (`packages/services/README.md`) |

## 5. Rough edges that block the loops

Only the edges that block a loop are here. Every other hole, with the slice that owns it, is in
[`../scope.md`](../scope.md), "Holes no slice owns".

**Starting an app** (found by a live demo on 20 November 2026; its recordings live outside this repository, so each
fact is said here in place):

- Orthograph is not on public npm, so a new app needs a throwaway local registry and a publish first. The preview
  fixes this (K28, M1.51).
- Every local publish is version 0.0.0, so caches must be kept per run or an old build installs.
- The preset's starter folder is git-ignored and filled only by a test, so a real release would ship it empty.
- Creating an app needs `--trustThirdPartyPreset`, or Nx stops to ask.
- Plugged In's own README still says "declarations and empty handlers only" (`examples/plugged-in/README.md:3-4`).

**Writing journeys** (`design/goals/03-snags.md`, all parked for stage 1): a starting world serves one journey and gives
back only the last answer; a step can't compare with the answer before it; no journey can send a malformed payload;
and a handler or journey can name a machine state only as a string.

**Proving every client.** Journeys call the server over plain HTTP
(`packages/prove/src/modules/journeys/internal/world.ts:18`), so the SDK, the CLI and MCP are never proved by a
journey. Proving through each client is M2.08.

**CI, and what it knows about a change.**

- On `main`, CI runs lint, types and tests for every project, with prove's tests in three shards
  (`.github/workflows/ci.yml:37-67` on `main`). It decides what to skip only by asking "is this docs only?" from file
  paths (`tools/ci/docs-only.sh:17-30`).
- `goal/stage-1` isn't strict, because its jobs take up to 45 minutes (`design/decisions/CI-branch-protection.md:67`).
- The CI speed record rejected Nx's cache and `nx affected`, because prove's tests start `examples/acme` and the
  starter by path, and the project graph can't see that (`design/decisions/CI-speed.md:114-117` on `main`).
- Orthograph already knows, per operation, what a change makes stale, but CI never reads it: the ledger lives in
  `.ortho/`, which is git-ignored (`.gitignore:13`), so every CI prove starts from nothing. K30, section 5 settles how
  the two should meet.

## 6. How we build

The process log (`design/process/log.md`, `patterns.md`, `proposals.md`) records what worked. The patterns split into
two sets of skills. Each is cited by its section heading.

### Skills for building Orthograph

1. **Checks before builds, by a different agent.** The author writes journeys and checks, they fail on empty handlers,
   and the builder never edits them; branches end in `-check` or `-build`, and CI holds the line (`patterns.md`,
   "Found before building, or after" and "Builders edit the checks that judge them"). In the `author` skill and
   `AGENTS.md`.
2. **Prove a check is fair by trying to fool it.** Pass it with a wrong output, once per way it reads; a second finding in
   the same family means rewrite the check, not patch it (`patterns.md`, "Checks a wrong output can pass";
   `proposals.md`, 14). In `author`.
3. **Probe every door.** A review lists every way a call reaches the code (HTTP, device, SDK, CLI, MCP, replay) and
   sends one probe through each (`proposals.md`, 1). In `reviewer`.
4. **The ratchet.** A checked-in list of expected failures turns known red into a real gate, and lines only come off
   (`patterns.md`, "CI that can't tell us anything"). In `conductor`; the M1 list is down to five entries
   (`e2e/m1/expected-failing/`).
5. **Parallel only when nothing is shared**, decision ids from one list (`patterns.md`, "Parallel work collides"). In
   `conductor` and `threads`.
6. **One way to supersede**, so a check finds leftover words (`patterns.md`, "Decisions leave older docs stale"). In
   `AGENTS.md` only.
7. **A fix reaches the branches where work runs**, because sessions read skills from their own checkout (`patterns.md`,
   "Fixes that don't reach the working branch"). In `conductor`.
8. **Leave the shared machine as you found it**: free ports, own folders, stop your own processes by PID (`patterns.md`,
   "Shared machine and stray processes"). In `threads`.

### Skills for building on Orthograph

No skill is written for an app author yet; every skill in `.agents/skills/` is for building the framework. The patterns
that carry over, recast for an author:

1. **Declare, then let check name the blanks** (section 2).
2. **Walk each journey with a throwaway handler before building**, using only what a real handler can reach
   (`log.md`, "Proving each journey possible found the 'is this name taken?' gap before the climb").
3. **Climb**: prove after every handler change, and let the tool write the progress, not you (`log.md`, "The first
   journey climbed from 0 to 8 of 8 steps in four recorded runs").
4. **Real services, never fakes**; a stand-in runs the same tests as the real thing (`patterns.md`, "Fakes that
   diverge from the real service").
5. **Quote facts from generated files**: codes, exits and totals come from `generated/`, never typed again
   (`patterns.md`, "One fact, many hand-kept copies").
6. **A design that says a path is clear shows one handler walking it** (`log.md`, "A design said nothing blocked the
   first journey, without trying a handler").

The frame already designs this second set as generated skills, one per action (`design/frame/skills.md`, sections 3
and 6; `design/frame/generators.md`, section 3). None is built. Writing them is K30, section 6.

## 7. The calls

The working session's five questions are settled in
[`../decisions/K30-the-model-and-the-map.md`](../../../decisions/K30-the-model-and-the-map.md), each with its evidence in the
grill format:

1. **Where the core ends:** model, API and server are core; every other projection, docs and the portal included, is
   standard library.
2. **The repositories:** two, Orthograph (core and standard library) and Capxul (the app and its own plugins).
3. **Declaring what you know:** `ortho add thing` takes the states and verbs you know, and writes blanks only for the
   rest.
4. **When code becomes a plugin:** once it is built and climbed green inside an app; never before.
5. **Staleness and CI:** our CI declares the inputs Nx can't see now; proving only what is stale comes later, as a
   feature for apps' CI.
