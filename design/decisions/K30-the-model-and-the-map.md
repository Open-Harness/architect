# K30: where the core ends, the repositories, declaring what you know, extraction, and staleness in CI

Decided 21 November 2026 by the building agent, under Aaron's standing word to the conductor the same day: "anything
that's waiting on me, just go with the recommendations. You have authority." Each call below is the recommendation the
working-session draft made on 20 November ([`../model/README.md`](../model/README.md)), re-read against the code. The
question on extraction changed its answer on the re-read; that section says why. Line numbers are at
`origin/goal/stage-1` `37778735` unless a line says `main`.

**Terms used in every section.**

- **core**: the packages every Orthograph app needs, released together.
- **standard library**: plugins Orthograph ships that an app chooses to mount.
- **ours**: plugins only Capxul needs.
- **extract**: move code from an app into a plugin package, then mount it back.
- **ledger**: the file the last full prove wrote, which `ortho impact` and `ortho prove --changed` read.

**Core** is the scope map's word for the same set (`design/scope.md`, "The core"); the canon's layer "the core" is the
declarations those packages compile. **Standard library** is what the canon's layer 7 calls "what Orthograph ships".
What a plugin is stays the canon's five kinds: feature, adapter, projection, language and host
(`design/decisions/K27-three-plugin-kinds.md`).

## 1 — Where does the core end?

**The problem, in code.** Six projections are plugins an app mounts. Docs and the portal are still rendered for every
app, mounted or not.

```ts
// packages/generators/src/modules/render/service.ts:14-18
const docs = renderDocs(model, name);
return [
  ...made.flat(),                                  // the mounted projections: model, api, server, sdk, cli, mcp
  ...docs,
  ...PortalRender.files({ name, model, docs }),
```

If nobody decides, each slice that moves a projection picks its own home, and the core grows by accident.

**What it touches**

| Dependent | Why it cares |
|---|---|
| docs and the portal | built in today; moving them to mounts is a new slice (section 6) |
| the edges that cross the line today | the generators import `@orthograph/portal` (`packages/generators/package.json:8`); prove imports `@orthograph/chain-evm` (`packages/prove/package.json:14`); the command depends on all of `@orthograph/projections` (`packages/cli/package.json:9`) |
| `packages/projections` | one package holds core and standard projections today |
| the repositories (section 2) | the core's edge is the split's edge |
| the portal's components ([K24](K24-ui-sdk.md)) | HeroUI Pro today, UI SDK next; neither should be a core dependency |

**The options**

**Today** — model, API, server, SDK, CLI and MCP are mounted (`packages/projections/src/main.ts:4-9`); docs and the
portal are built in (above).

**A · Core is model, API and server; every other projection is standard library** (recommended)
```ts
// blueprint/projections/portal.ts: an app that wants the portal mounts it, as it mounts the CLI today
import { Blueprint } from "orthograph";
import { portal } from "@orthograph/projections";   // one package, as M1-plugins X-10 says; the bucket is a tag
export default Blueprint.use(portal);
```

**B · Docs and the portal stay built into the core**
```ts
// nothing to mount: every app keeps docs and a portal, as today
```

**C · Even the server is a plugin; the core is the API and the compiler**
```ts
// blueprint/projections/server.ts must name a host before anything runs
export default Blueprint.use(server, (s) => [s.choose(s.choices.host.cloudflare)]);
```

**You do X → what happens**

| Scenario | A · core is model, API and server | B · docs and portal built in | C · API only |
|---|---|---|---|
| A back-office app wants no portal | delete one mount file | can't | delete one mount file |
| The portal's components move to UI SDK | the core doesn't change | the core changes | the core doesn't change |
| A first app, made from the starter | the template mounts the usual set; no difference felt | no difference | one more choice before it runs |
| A third party ships a Python SDK | a projection like ours | a projection like ours | a projection like ours |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ the pattern is built for six already | ✅ nothing to do | ⚠️ more to move before value |
| Reversibility | ✅ a mount can be made default again | ⚠️ hard to take out later | ✅ |
| Blast radius | ⚠️ generators and the starter | ✅ none | ❌ every example |
| Correctness | ✅ outputs only where mounted | ⚠️ an unmounted portal still renders | ✅ |
| Fit | ✅ `design/frame/projections.md` already calls both projections | ❌ against the frame | ⚠️ K27 makes the host a plugin kind, but none is built |

**The call: A.** The core is the `Blueprint` API, the compiler, the generators, the Effect language, the Cloudflare
host, prove and the ledger, the logbook, the `ortho` command, its lint rules, and the model, API and server
projections. Everything else is standard library. Docs and the portal become mounted projections in a new slice
(section 6), not in the portal viewer slice (done) or the faces slice; until then they stay built in, and nothing
breaks. The line is drawn by Nx tags, not by splitting `@orthograph/projections`. The three edges above are cut
before the line is enforced: the portal is reached as a mounted projection, the wallet world's chain through the
wallets plugin, and the command loads projections from the app's mounts.

## 2 — How should the repositories split?

**The problem, in code.** Capxul has its own blueprint and generator, not Orthograph's. Its hats, budgets and Safe
overlap with Plugged In's stage 3 plugins.

```ts
// capxul-next, packages/core/src/handlers.ts:21-25 (read at 50851875): Capxul's own registry, one file per domain
export const WorldHandlers = WorldRpcs.toLayer({
  ...Organizations.world,
  ...People.world,
  ...Board.world,
  ...Budgets.world,
```

If nobody decides, Capxul's plugins get written twice: once for stage 3 here and once in Capxul.

**What it touches**

| Dependent | Why it cares |
|---|---|
| stage 3 (`design/milestones.md`) | it plans the Safe, budgets and hats plugins |
| the releases (K28) | each repository publishes on its own schedule |
| Nx module boundaries | the bucket lines become tags or repository walls |
| CI | one repository's CI or several |

**The options**

**Today** — one repository, this one, with everything; Capxul separate and not on Orthograph.

**A · Two repositories: Orthograph (core and standard library), Capxul (the app and its own plugins)** (recommended)
```bash
orthograph/packages/{orthograph,compiler,…}      # tag scope:core
orthograph/packages/{wallets,safe,budgets,…}      # tag scope:stdlib
capxul/plugins/{approvals,bench}                  # ours; mounted from capxul/blueprint/features/
```

**B · Three repositories now**
```bash
orthograph/   orthograph-plugins/   capxul/
```

**C · Everything in one repository, Capxul included**
```bash
orthograph/examples/capxul/   orthograph/plugins/capxul-*/
```

**You do X → what happens**

| Scenario | A · two | B · three | C · one |
|---|---|---|---|
| Change the compiler and a plugin together | one pull request | two, released in order | one |
| Capxul pins an older Orthograph | yes, from the registry | yes | no: always the same commit |
| Budgets proves generic in Capxul | move it to `orthograph/packages/` | move it to the plugins repository | rename a folder |
| Open the framework, keep Capxul private | yes | yes | no |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ the one new repository is the one Capxul already has | ⚠️ a new repository before any plugin exists | ✅ nothing to make |
| Reversibility | ✅ the standard library can split out later | ⚠️ merging repositories back is costly | ❌ Capxul's history entangled |
| Blast radius | ✅ Capxul only | ⚠️ every standard package moves | ⚠️ this repository's CI grows |
| Correctness | ✅ Capxul consumes Orthograph as anyone would | ✅ | ❌ never proves the published path |
| Fit | ✅ "built once, mounted anywhere" | ⚠️ | ❌ |

**The call: A.** Capxul is the first real outside user, which is the test the framework needs. It moves onto
Orthograph after the beta (workable, the end of M2, as `design/milestones.md` opens by saying), beside the stages, and
never gates 1.0: that is both halves of the scope map's fourth disagreement, which said "built on it from M2" in one
place and "off v1.0's path" in another. Until then `capxul-next` goes on as it is. The standard library
moves to a repository of its own only if its release pace ever differs from the core's. Hats, budgets and the Safe
adapter are standard library, because stage 3 needs them too; approvals, payments into ERPNext and the bench stay ours
until a second app needs them.

## 3 — How does "declare what you know" work?

**The problem, in code.** Every piece is its own command, and each writes blanks for what you already knew.

```ts
// packages/cli/src/main.ts:191-193
const add = Command.make("add").pipe(
  Command.withSubcommands([addOne("thing"), addOne("operation"), addOne("read"), addOne("journey"), addJourneys, …]),
);
```

If nobody decides, every new app starts with four or more commands and a round of hand edits, and agents learn the
commands instead of the blueprint.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `packages/cli/src/modules/add/` | where the change lands |
| M2.14 and M2.15 (`ortho add` on Nx; `add move`, `add event`, `add error`, `add role`) | "`add thing` composes them" already |
| the generated skills (`design/frame/skills.md`, "Describe") | they would call it |
| `ortho add journeys` | it needs the machine filled to write good stubs |

**The options**

**Today** — four commands, then hand edits.
```bash
ortho add thing handle
ortho add operation handle.claim
ortho add operation handle.release
ortho add operation handle.resolve
# then edit machine.ts by hand: states are a blank
```

**A · Say it on `ortho add thing`; blanks only where you said nothing** (recommended)
```bash
ortho add thing handle --states claimed,released --verbs claim,release,resolve
# writes the thing, a machine with both states and a move per verb, three operations, blanks for the rest
```

**B · Agents write `blueprint/` directly; `ortho check` names the blanks**
```bash
# no command: a skill tells the agent which files to write
ortho check   # blanks ✘ 7 …
```

**C · A new "describe the app" file the CLI expands**
```jsonc
// a new file kind: { "handle": { "states": ["claimed", "released"], "verbs": ["claim", "release"] } }
```

**You do X → what happens**

| Scenario | A · flags on add | B · write directly | C · a describe file |
|---|---|---|---|
| A person knows the states and verbs | one command | write seven files by hand | write one file, then run |
| An agent declares a thing | one command, nothing to mis-shape | it may mis-shape a file; check catches it | one file |
| Later you add a verb | `ortho add operation`, or `ortho add move` (M2.15) | edit by hand | edit the file, rerun: does it overwrite yours? |
| A new word to learn | none | none | a new file kind |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ a small change to a built module | ✅ nothing to build | ⚠️ a new format |
| Reversibility | ✅ flags can go | ✅ | ⚠️ files to migrate |
| Blast radius | ✅ one module | ✅ skills only | ⚠️ the CLI and docs |
| Correctness | ✅ same templates, fewer blanks | ⚠️ shape errors found late | ❌ two sources of truth |
| Fit | ✅ writes once, never overwrites; it is M2.15's "composes them" | ✅ | ❌ against "the blueprint is the description" |

**The call: A**, built with M2.15: `--states` and `--verbs` on `ortho add thing`, composing `add move` and
`add operation`, and blanks only for what was not said.

## 4 — When does an app's code graduate to a plugin?

**The problem, in code.** The starter's identity code is copied into every new project. Plugged In's `handle` is used by
one app, and it is climbed green.

```ts
// examples/plugged-in/blueprint/things/handle/thing.ts:7-11
// The person is Better Auth's (M2): the project refers to them by id, as acme's organisation does.
fields: {
  id: Blueprint.described(Blueprint.id("hdl"), "The handle's own id."),
  name: HandleName,
  owner: Blueprint.described(Blueprint.id("per"), "The person who holds the name."),
```

Aaron's rule, as the conductor relayed it on 20 November 2026: "build a thing once inside an app, use it, then extract
it into a plugin; don't build plugins speculatively". This record is its first dated home.

If nobody decides, either code is extracted before anyone has used it (against Aaron's rule), or it is copied into each
new app and drifts.

**What it touches**

| Dependent | Why it cares |
|---|---|
| M2.05 and M2.07 | auth and organisations as plugins |
| ST1.03 and the beta (K28) | handles as a plugin is part of the beta |
| Capxul's pieces | which become standard library, which stay ours |

**The options**

**Today** — the plan extracts auth, organisations and handles in M2 and stage 1.

**A · Built and climbed green inside an app first, then extracted** (recommended)
```text
auth, organisations: extract now: built in the starter, proved by its journeys, copied into every app
handles:             extract now (ST1.03): built in Plugged In, its seven journeys green
budgets, hats, Safe: build inside stage 3's app or Capxul first, then extract
```

**B · Only at a second real app**
```text
auth, organisations: extract now (the starter's copies are the second user)
handles:             stays in Plugged In until a second app needs a public name; ST1.03 waits
```

**C · Build as plugins from the start**
```bash
ortho new feature budgets   # before any app uses it
```

**You do X → what happens**

| Scenario | A · built and climbed first | B · second app | C · plugin first |
|---|---|---|---|
| Handles in the beta | extracted in stage 1, as K28 plans | stays app code; the beta changes | a plugin, as planned |
| A plugin's API is wrong | found by its first app before it is a plugin | found by its first app | found after it is published |
| A bug in sign-in after ten apps | fixed once, upgraded everywhere | fixed once | fixed once |
| Budgets for stage 3 | built in the vault app, then extracted | waits for Capxul too | a plugin with no user |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ auth, organisations and handles now | ⚠️ holds back a planned plugin | ❌ speculative |
| Reversibility | ✅ | ✅ | ⚠️ a published API to keep |
| Blast radius | ✅ none: the plan stands | ⚠️ the beta's scope | ⚠️ |
| Correctness | ✅ shaped by real use | ✅ | ❌ |
| Fit | ✅ Aaron's rule, and K28's beta | ⚠️ stricter than Aaron's rule | ❌ against Aaron's rule |

**The call: A. It replaces the draft's stricter rule.** The draft of 20 November recommended B, "extract at the second
real user". Re-read, B is stricter than Aaron's rule, which is "build it once inside an
app, use it, then extract it", not "wait for a second app". Handles has been built and climbed green in Plugged In, and
K28's beta already counts on its plugin. So the plan stands: auth, organisations and handles are extracted for the
beta, and stage 3's pieces are built inside an app before they become plugins.

## 5 — Should Orthograph's staleness feed CI?

**The problem, in code.** CI decides what to run from file paths only. Orthograph knows per operation, and
`ortho prove --changed` already uses it on one machine, but its ledger never reaches CI.

```bash
# tools/ci/docs-only.sh:24-27
    case "$file" in
      design/*) ;;
      packages/* | e2e/* | examples/*) docs_only=false ;;
      *.md) ;;
```

If nobody decides, CI keeps proving everything on every push, and apps' own CI will copy that.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `design/decisions/CI-speed.md` on `main` | it set `nx affected` aside because of inputs Nx can't see |
| `packages/generators` | it is already the Nx plugin, so it could tell Nx the inputs |
| `ortho prove --changed` (`packages/cli/src/main.ts:73-74`) | it needs the ledger; CI has none (`.gitignore:13`) |
| apps built on Orthograph | their CI is the product |

**The options**

**Today** — everything runs, prove's tests in three shards; only a docs-only pull request skips the slow suites.

**A · Tell Nx the truth first: the inputs it can't see, declared** (recommended)
```jsonc
// nx.json, the prove project's test target
"inputs": ["default", "{workspaceRoot}/examples/acme/**/*", "{workspaceRoot}/examples/starter/**/*"]
// later: the generators' Nx plugin adds each example's model-derived inputs, so `nx affected` is honest
```

**B · CI keeps the ledger and proves only what changed**
```bash
# needs what doesn't exist yet: the last green ledger in CI, from the logbook or a cache keyed by the base commit
ortho prove --changed
```

**C · Keep running everything; add shards**
```bash
pnpm nx run prove:test -- --shard=1/6
```

**You do X → what happens**

| Scenario | A · honest Nx inputs | B · prove only what changed | C · more shards |
|---|---|---|---|
| Change a doc comment in `compiler` | the compiler's dependents rerun | every operation that uses it reproves | everything reruns |
| Change one handler in acme | prove's tests rerun, `portal-ui`'s don't | one operation reproves | everything reruns |
| The staleness logic has a bug | a test may skip that should have run | a proof is skipped silently | nothing skipped |
| An app author's own CI | unchanged | one flag: the product | unchanged |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ a config change, measurable now | ⚠️ needs the ledger in CI | ✅ |
| Reversibility | ✅ | ✅ | ✅ |
| Blast radius | ✅ `nx.json` | ⚠️ prove, CI, logbook | ✅ |
| Correctness | ✅ once the inputs are complete | ⚠️ a skipped proof weakens the gate | ✅ |
| Fit | ✅ answers CI-speed's own objection | ✅ the frame's promise | ⚠️ cost grows with the code |

**The call: A for our CI now; B as a feature for apps' CI**, once the ledger can come from the logbook, with a full
prove still on every push to a protected branch. CI-speed's "Not done" stands as written until the inputs are declared.

## 6 — What follows

1. **Skills for building on Orthograph.** None exists. The patterns that carry over are listed in
   [`../model/README.md`](../model/README.md), section 6; the frame's generated skills (`design/frame/skills.md`) are
   their home.
2. **Slices these calls need**, for the conductor to place:
   - docs and the portal as mounted projections, a new slice;
   - the three edges in section 1 cut, then the core's line held by Nx tags and lint;
   - `--states` and `--verbs` on `ortho add thing` (with M2.15);
   - the prove tests' hidden inputs declared in `nx.json`, then measured.
3. **The repository's goal.** `README.md` now carries the short version of what Orthograph is, from the model page,
   so `AGENTS.md`'s "the goal in `README.md`" points at something.

## Supersedes

Nothing. `git grep` finds no live doc that says otherwise. The frame already calls docs and the portal projections
(`design/frame/projections.md`, 3.7 and 3.8), and they stay in the one `@orthograph/projections` package that
`M1-plugins` X-10 names. The milestones already extract auth, organisations and handles, and no live doc asks for a
second app first. `design/decisions/CI-speed.md`'s "Not done" is conditional on the inputs, which this record leaves to
a slice. The scope map's fourth disagreement (Capxul's timing) is answered in section 2, and marked so in
`design/scope.md`.
