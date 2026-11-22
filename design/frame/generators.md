# Generators: what Orthograph writes so anyone builds this way

Part of the frame ([`README.md`](README.md)). Proposed, 17 November 2026. Names: the framework is **Orthograph** (command
`ortho`, packages under `@orthograph`); **Blueprint** is what you write. The languages code comes out in (Effect,
Solidity, Noir, Python) are called **languages** (`@orthograph/language-effect`), no longer "targets".

We build Orthograph with a kit we wrote by hand: skills, agent definitions, goal files, a CI workflow, the builder's tools.
It works, across Claude Code, Codex and Amp. Most of its text is not about this repository at all, and the part that
is could be read off the model. So every Orthograph project should get the same kit, generated from its own model, and
the loop should close: the description changes, and the kit the agents work from changes with it.

This document lists everything Orthograph writes into a project, which of it is regenerated and which is yours, and what
exists today on `origin/layer/3`.

## 1. Generated, scaffolded, and nothing in between

Every file Orthograph writes is one of two kinds, and says which on its first line.

| | Generated | Scaffolded |
|---|---|---|
| Header | `// Generated from <model or path>. Do not edit.` | `// Scaffolded from <path>. Yours from now on.` |
| When written | on every compile | once, when asked (`ortho new`, `ortho add`, the first generate of a blank) |
| Who owns it | the model | you |
| What guards it | `check`'s `no-edited-output` rule: the file must be exactly what the model renders, and no stray file may sit beside it (`cli/src/modules/check/internal/drift.ts`) | never overwritten: `add` writes nothing if any file it plans exists (`cli/src/modules/add/README.md`) |
| Where | under `generated/`, always | `blueprint/`, `src/`, and the project's root files |

One file, one owner. A file is never half generated. Where a project wants to add to something generated (its own
skill, its own rule), it writes a file of its own beside it, and the generated one links to it or lists it.

Markdown keeps the same rule. A skill's frontmatter must come first, so its header is the line after the frontmatter,
as a comment: `<!-- Generated from the model of acme. Do not edit. -->` (question 3).

## 2. `ortho new <app>`: the repository it scaffolds

`G` is generated, `S` scaffolded.

```text
acme/
  AGENTS.md                         S  the project's own rules; first line links generated/agents/RULES.md
  CLAUDE.md                         S  one line: @AGENTS.md
  .mcp.json                         S  names `ortho mcp`, the builder's stdio server
  package.json                      S  every @orthograph/* package pinned exactly; an `ortho` script
  pnpm-workspace.yaml               S  minimumReleaseAge: 4320 (three days), with the override list empty
  .github/workflows/ortho.yml      S  thin: each job runs `ortho ci <stage>` (section 4)
  .agents/skills/ortho  ──link──▶  generated/agents/skills
  .agents/skills/<your own>/        S  skills the project writes for itself
  .claude/skills  ──link──▶  .agents/skills          (as in this repository today)
  .claude/agents  ──link──▶  generated/agents/claude
  goals/01-first-slice.md           S  a goal file: prompt, bound, done check (section 4)
  blueprint/
    things/  values/  journeys/  starting-worlds/   S  from the starter, then yours
    features/auth.ts                S  a mount, not a copy of auth's things
    projections/{server,sdk,cli,mcp,docs,portal,builder,agents}.ts   S  one mount each
    environments/{local,test,staging,production}.ts                  S
  src/<thing>/<verb>.ts             S  one per operation, each a blank (render/internal/scaffold.ts)
  generated/                        G  never edited
    model/  api/  server/  sdk/  cli/  mcp/  docs/  portal/
    builder/                        G  bp.d.ts and the brief texts
    agents/                         G  RULES.md, skills/, claude/, pi/, the role templates filled in
    ci/plan.json                    G  the stages and what each needs, from the environments
```

Everything a person or agent opens first is scaffolded and short. Everything that would drift is generated. The
links make the generated kit visible where each agent looks, the same way `.claude/skills` and
`.claude/agents/reviewer.md` are links into `.agents/skills/` in this repository today.

## 3. The agent kit, generated from the model

The kit is the output of one projection, `agents`, built on the builder projection
([`projections.md`](projections.md) section 3.14). It has no host and nothing ships; its outputs are kept.

```ts
// blueprint/projections/agents.ts: the mount
import { Blueprint } from "orthograph";
import agentKit from "@orthograph/agent-kit";

export default Blueprint.use(agentKit, (k) => [
  k.choose(k.choices.for.claudeCode, k.choices.for.pi),  // which agents' file forms to render (question 5)
  k.choose(k.choices.voice.spoken),                       // how agents report to the owner: "Talking to Aaron", generalised
]);
```

`@orthograph/agent-kit` ships templates. The model fills them. The project's choices pick the forms. It never depends on
`@orthograph/agents` (M4): skills are core, agents are one of their users
([`../decisions/K4-agent-skills.md`](../decisions/K4-agent-skills.md)).

### Skills

The catalogue (twenty-three skills across the loop, each with its trigger, what it reads and writes, its done check and
its eval), the roles as bundles of skills, and the workflows that chain them are in [`skills.md`](skills.md). This
document keeps how the kit is generated.

Most skill text is fixed and ships with the package. A skill regenerates only where it quotes the model. A sketch:

```markdown
---
name: fill-a-blank
description: Fill one handler blank in acme until its brief's done check passes. Use it when your brief names an operation.
---
<!-- Generated from the model of acme (model 4c1e…). Do not edit. -->

# Fill a blank

You fill one blank. You never read or change journeys, evals or anything under generated/.

1. Run `brief <operation>`. It tells you the one file you may write, what to read, what to do, and when you are done.
2. Read the types with `describe <operation>`, not the files.
3. Work in code mode: `run` scripts against `bp` to try the operation in a world and read its traces.
4. Write the whole file with `write`. Then `bp.check()` and `bp.prove({ operations: [<operation>] })`.
5. Stop when the brief's "done when" passes. Report what you changed in one paragraph.

## Open blanks in acme                      (the only part that regenerates)
- allowance.spend    src/allowance/spend.ts    refuses AllowanceExceeded, AllowanceNotActive
- wallet.link        src/wallet/link.ts        steps: verify (Blueprint.step.use wallets.verify)
```

### Agent definitions, one per factory role

| Role | Reads | May write | Tools | Never |
|---|---|---|---|---|
| planner | the owner's words, `describe-this-app` | `blueprint/` except journeys | `describe`, `run`, `write` (blueprint paths) | `src/`, journeys |
| journey writer | the description, starting worlds | `blueprint/journeys/` (prose steps) | `describe`, `write` (journeys) | `src/`, handlers |
| check writer | a prose journey | the same journey, made executable | `describe`, `run`, `write` (journeys) | `src/` |
| builder | its brief | the one file the brief names | `brief`, `describe`, `run`, `write` (one path) | journeys, evals, `generated/` |
| scorer | the verdicts and evidence | nothing | `run` (read-only `bp`) | any file |
| reviewer | a diff and its brief | nothing | read-only | any file |
| manager | blanks, failing evals, stale verdicts, drift | tasks and briefs, never code | the factory's operations | `src/`, `blueprint/` |

The separation is the point: the one who writes a check never writes the code it checks. The definitions say so, and
the tools enforce it. A builder's tool set has no path into `blueprint/journeys/`, and a CI copy takes the journeys out
while it works (`e2e/layer1/04-agent-writes-a-handler.test.ts:68-69`).

One definition, in full, as rendered for Claude Code:

```markdown
---
name: builder
description: Fills one blank in acme against its brief. Use it when the manager hands you a brief.
tools: mcp__ortho__brief, mcp__ortho__describe, mcp__ortho__run, mcp__ortho__write
---
<!-- Generated from the model of acme and @orthograph/agent-kit 1.0.0 (templates/builder.md). Do not edit. -->

You are a builder for acme. You fill exactly one blank, the one your brief names. You did not write its journeys and
you cannot read them; you prove your work through `bp.prove`, which runs them for you.

The rules you keep are in generated/agents/RULES.md: Effect everywhere, no async or await, no wall clock, names from
paths, errors as values, generated files never edited.

acme's handlers are Effect, written in language-effect; contracts in language-solidity have their own builder.
Your write tool accepts one path: the one in your brief. Anything else is refused and reported.

When the brief's "done when" passes, answer with: the operation, the file, what you changed, and the prove result.
If you cannot make it pass, say which eval fails and why, and stop.
```

Nothing in it is hand-written per project. The slots are the app's name, the languages it mounts, the tool names and
the rules file. The same template renders `generated/agents/pi/builder.ts` for the Pi harness (H1), with the same tool
set as `Tool`s.

### What regenerates when the model changes

| You change | The kit changes |
|---|---|
| add an operation | `describe-this-app`, the open blanks in `fill-a-blank`, `bp.d.ts` |
| add a journey | the "operations with no journey yet" list in `write-a-journey` |
| mount an adapter | its shipped skills appear under the mount's name (section 8); `add-an-adapter` drops it from "missing" |
| add an environment | `promote-a-revision`, `generated/ci/plan.json` |
| change a budget | `watch-an-environment`, `why-is-it-slow`, `turn-a-finding-into-a-task` |
| declare a store, or mount an adapter over a source | `choose-a-home`, `add-a-store`, `describe-this-app` (K3) |
| upgrade `@orthograph/agent-kit` | every template-derived file; `impact` names it as a kit change, not an app change |

## 4. Workflows

**CI.** `ortho new` scaffolds one thin workflow. Each job runs one stage, and the stages come from the model:

```yaml
# .github/workflows/ortho.yml (Scaffolded from @orthograph/agent-kit. Yours from now on.)
jobs:
  check:   { steps: [{ run: pnpm install --frozen-lockfile }, { run: pnpm ortho ci check }] }
  world:   { needs: check, steps: [{ run: pnpm ortho ci prove --env test }] }   # a fresh world per pull request
  verdict: { needs: world, if: github.ref == 'refs/heads/main', permissions: { id-token: write },
             steps: [{ run: pnpm ortho ci verdicts }] }                          # signed with the OIDC token
```

`generated/ci/plan.json` says what each stage does for this app: which projections replay, which adapters run
against which stand-in, which environment promotes from which. The workflow file stays short and yours. The work
it does stays generated. Today the repository's own `.github/workflows/ci.yml` is hand-written for the framework
(lint, typecheck, test, `sync:check`, the layer-one and layer-two e2e), and acme has no CI of its own.

**Goal files.** `goals/<n>-<name>.md` has the shape of `design/goals/01-the-whole-framework-locally.md`: the prompt,
the bound, the one done check. `ortho goal new` scaffolds one from what is open: the blanks, the failing evals, the
stale verdicts. The prompt and the done check are filled in. The bound is left as a blank for a person, because how far
a run may go is a person's call.

**The factory's durable runs.** The manager starts one durable run per task. A run is a workflow: today a Pi Durable
session behind the `Agent` seam (H1); later an Effect `Workflow` on a Durable Object, behind the same seam. Its
instructions are the agent definition above, and its tools are the role's tool set. Tasks are derived, never stored
(F5): a blank, a failing eval, a stale verdict or a `watch` measure that got worse. The factory itself is a Orthograph app
with its own model and its own generated kit ([`examples/factory.md`](examples/factory.md) has its walkthrough).

## 5. Tools: three MCP servers, never confused

| | `ortho mcp` (the builder's) | the app's `mcp` projection | the factory's MCP |
|---|---|---|---|
| For | whoever builds this app: a person's agent, the harness, CI | the app's callers: agents acting for people | whoever runs the factory: the manager and the owner |
| Where it runs | stdio, on the builder's machine | a door of the app's Worker, `/mcp` (decided, Q2) | a door of the factory app's own Worker |
| What it exposes | `describe`, `run`, `brief`, `write`; everything else is code mode over `bp` | the app's operations a `Via.agent` caller may reach | the factory's operations: start a run, read a task, record a verdict |
| Generated from | this app's model, into `generated/builder/` | this app's model, into `generated/mcp/` | the factory's model |

The kit this document is about is the first column. It is the project's own: generated from its model, so a misspelt
operation in an agent's script is a type error. `bp.d.ts` is sketched in full in [`builder.md`](builder.md) section 2:
operations as a union, refusals per operation, starting worlds, environments (never production), and the projections
that replay as `Through`. The factory's MCP is a different app's caller surface. A team building its own app never
needs it, unless it also runs a factory.

## 6. Every generator, today and proposed

| Generator | Reads | Writes | Kind | Today (`origin/layer/3`) | Proposed |
|---|---|---|---|---|---|
| model | the blueprint | `generated/model/model.json` | G | built (`render/service.ts`) | complete: blanks, journeys, worlds, role rules ([`delta.md`](delta.md)) |
| docs, edges | model | `generated/docs/` | G | built (`render/internal/docs.ts`) | a mounted projection |
| portal | model, docs | `generated/portal/` | G | built (`generators/src/modules/portal`) | a mounted projection |
| handler types (api) | model | `generated/api/` | G | built (`render/internal/api.ts`) | per language |
| server | model | `generated/server/`, worker config | G | built (`internal/server.ts`, `worker-config.ts`) | doors for adapters added |
| sdk, cli, mcp | model | `generated/{sdk,cli,mcp}/` | G | built (`internal/sdk.ts`, `cli.ts`, `cli-session.ts`, `mcp.ts`) | each with a replay |
| handler scaffold | an operation | `src/<thing>/<verb>.ts` | S | built (`internal/scaffold.ts`) | per language and per host |
| `add thing / operation / read / journey` | names | `blueprint/…` with `Blueprint.todo` gaps | S | built (`cli/src/modules/add`) | `add` for adapters, features, projections, environments |
| starter | `examples/starter` | a whole workspace | S | built as an Nx preset (`preset/src/modules/starter`), copying auth's things into the project | **replaced** by `ortho new`, auth mounted |
| brief | model, journeys | printed, not a file | G | built (`cli/src/modules/brief/service.ts:19-43`) | also rendered into `generated/builder/` |
| builder API | model, mounts, environments | `generated/builder/bp.d.ts` | G | **missing** | [`builder.md`](builder.md) |
| agent kit: rules, skills, definitions | model, `@orthograph/agent-kit`, mounts | `generated/agents/` | G | **missing**; hand-written for this repository only | section 3 |
| CI plan | environments, projections, adapters | `generated/ci/plan.json`, a thin workflow | G and S | **missing**; acme has no CI | section 4 |
| goal file | blanks, verdicts | `goals/<n>-<name>.md` | S | **missing**; one hand-written goal | section 4 |
| root files | the starter | `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `pnpm-workspace.yaml` | S | partly (`package.json`, `tsconfig.json`, ignores) | section 2 |
| adapter from a contract | OpenAPI, an ABI, another app's model | an adapter package | S, types G | **missing** | [`adapters.md`](adapters.md) |
| new feature, adapter, projection package | a name | a plugin package with its example app | S | **missing** | [`writing-a-feature.md`](writing-a-feature.md) |
| secrets list | mounts | `ortho secrets` output | G | **missing**; names by string | [`secrets.md`](secrets.md) |
| migrations | the model diff | ordered per environment | G | **missing** (deferred) | [`deployment.md`](deployment.md) |
| infrastructure | model, mounts, environments | an Alchemy stack | G | `generated/infra/alchemy.run.ts` for staging (M7-03); wrangler configs under `.ortho/environments/` for the local environments (D3 #17) | the cloud pass, for the other environments |
| contracts | things that live on a chain | Solidity sources, ABIs | G and S | `language-solidity` is a placeholder (`src/index.ts` only) | `language-solidity`, layer four |
| Python SDK | model | a package | G | **missing** | later ([`projections.md`](projections.md) 3.12) |

Ten of these are built today. The ones that close the loop (the builder API, the agent kit, CI, goals, the root files)
are all missing. That is the gap Aaron named.

## 7. This repository's own kit is the evidence

Every piece of the kit above has a hand-written ancestor here. Each one was written for one repository. Each would
become a template with a few slots.

| Ours, by hand | What it does | As generated |
|---|---|---|
| `.agents/skills/threads` | thread types, their finish lines, "Talking to Aaron" | the role list and finish lines ship in `@orthograph/agent-kit`; how the owner wants to be spoken to is the `voice` choice |
| `.agents/skills/conductor` | starts, briefs and lands threads; keeps the owner's view current | the manager definition; the factory automates its loop |
| `.agents/skills/spike` | one question, throwaway code, a README | ships as is; it has nothing project-specific |
| `.agents/skills/reviewer` and `.claude/agents/reviewer.md` (a link to it) | judges a diff against its brief and the rules | the reviewer definition; its "standing rules" (builders never change journeys, generated files never edited, no secrets) are the framework's and come from `RULES.md`; the layout comes from the model |
| `.agents/skills/hashtags` | the owner's own `#shortcuts` | stays the project's own: scaffolded, never generated |
| `design/goals/01-the-whole-framework-locally.md` | one long run: prompt, bound, done check | the goal template (section 4) |
| `AGENTS.md`, "The code's own rules" | Effect everywhere, names from paths, generated headers, pinned dependencies, the six slots | `generated/agents/RULES.md`, from the mounted languages and lint; the project's `AGENTS.md` keeps only what is its own |
| `brief` (`cli/src/modules/brief`) | one job, its files, its done check | already generated from the model; the template the builder definition points at |

The test that the kit is right is that this repository can switch to it. Once Orthograph's own design is a Orthograph model
(the factory, F5), `ortho generate` should rewrite our reviewer, conductor and goal files. Anything still
written by hand after that is either truly ours (hashtags, the owner's voice) or a template missing a slot.

## 8. Plugins bring their own skills

A plugin package may ship skills and agent-definition fragments next to its declarations. Mounting it adds them to the
kit under the mount's name. Unmounting removes them.

```text
@orthograph/stripe/agents/skills/map-an-error/SKILL.md     → generated/agents/skills/stripe-map-an-error/
@orthograph/wallets/agents/skills/choose-a-signer/SKILL.md → generated/agents/skills/wallets-choose-a-signer/
@orthograph/language-solidity/agents/skills/fill-a-contract-blank/
@orthograph/language-noir/agents/skills/fill-a-circuit-blank/
@orthograph/web/agents/skills/build-a-screen/
```

They are filled from the mount, not the package. Stripe's `map-an-error` lists only the errors of the calls this
mount includes, and names the operations that call them:

```markdown
## Calls acme reaches, and the errors to map          (regenerated from blueprint/adapters/stripe.ts)
- refunds.create             StripeCardDeclined, StripeInvalidRequest, StripeRateLimited
  called by organization.refund (step refund)
```

A language's skills are what make a blank in that language fillable: the builder definition names the language, and
the kit hands it the skill for that language's blanks. `check` treats skills like any output. Two mounts that ship the
same skill name are told apart by the mount prefix, and an edited one is drift.

## Questions this raised

1. **Where the generated kit lives.** A: directly in `.agents/skills/`, with headers. B: under `generated/agents/`,
   linked from `.agents/skills/ortho` and `.claude/`. C: read from the package at run time. **B**: `generated/` stays
   the one never-edited place, and the drift check needs no new paths.
2. **The CI workflow.** A: a fully generated `.github/workflows/ortho.yml`, drift-checked outside `generated/`. B: a
   thin scaffolded workflow calling `ortho ci <stage>`, with the plan generated. C: a published GitHub Action.
   **B**: the file GitHub reads is yours and short; the logic regenerates.
3. **The header in generated Markdown.** A: an HTML comment on the line after the frontmatter. B: a `generated-from`
   frontmatter field. C: none; drift by path only. **A**: same words as the code rule, and the loaders still see the
   frontmatter first.
4. **One projection or two.** A: the builder projection renders both `bp` and the agent kit. B: a separate `agents`
   projection built on `builder`. **B**: a team can mount a different kit, or none, without losing the builder's tools.
5. **Which agents' forms to render first.** A: the neutral `.agents/skills/` form, plus Claude Code and the Pi harness.
   B: also Codex and Amp from day one. C: the neutral form only. **A**: those are the two we run; others read the
   neutral form through links.
6. **How much of the model goes into the definitions.** A: full lists inline (big diffs on every change). B: each
   role's own slice inline, the rest through `describe`. **B**: definitions stay stable, and the agent asks for what
   it needs.
