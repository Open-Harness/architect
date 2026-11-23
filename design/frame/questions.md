# Open questions: one round

Part of the frame ([`README.md`](README.md)). **Decided, 17 November 2026: every recommendation below was taken**
([`../decisions/K2-forman-frame.md`](../decisions/K2-forman-frame.md)). Kept as the reasoning behind each call.
Each follows the grill template: the problem in code, what it touches, the options as code, what happens,
a rubric, a recommendation. The answer key is at the end.

**Terms used below.**

- **The frame**: the documents in `design/frame/`.
- **Home**: where a thing's state lives (`lives`): a database row, an actor (one Durable Object per instance), or a chain.
- **View**: a read model the system keeps from events, declared like a thing, for lists and lookups across homes.
- **Pi Durable**: the agent loop library chosen in H1 (transcripts, compaction, steering, crash recovery).
- **Effect Workflow**: Effect's durable workflow engine; on Cloudflare one execution is one Durable Object, each step
  memoised (`@effect/platform-cloudflare` 4.1.3, usable now under R1).
- **layer/4**: the branch Codex was working on (15 commits past `main`, its decisions in `design/decisions/D4.md`).

## Q1 — How is data declared and shown: homes, views and the data map?

> **Widened on 18 November by [`K3`](../decisions/K3-stores-and-sources.md).** Aaron took the views from C, and then
> asked for several databases and for sources we don't own. Option B's "every thing imports a store" is avoided by a
> default store, and the home list is now open.

**The problem, in code.** A thing says where it lives, and that is all the model knows about data. A thing that lives
as an actor can't be listed (F5), and nothing shows anyone where data is or how to reach it.

```ts
// origin/layer/3:packages/blueprint/src/modules/things/types.ts:27-35
/** Who owns its state: a D1 row with a version column (the default), or a Durable Object per instance (D1 #1). */
readonly lives: Lives;
export type Lives = "database" | "actor";
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| `Blueprint.read` (L2.04) | lists take `where`, `order`, `page`, but only over database things |
| host-cloudflare `actors`, `database` | each home is a different runtime path |
| the agents and factory examples | runs and tasks are actors; their lists are views |
| deployment's environment file | binds each home to D1, a Durable Object namespace, R2 |
| the builder's `bp` API | what an agent can query |

**The options**

**A · Homes only, plus a map**

```ts
// blueprint/things/allowance/thing.ts
export default Blueprint.thing({ description: "…", fields: { … }, lives: "actor" });
// generated/data/map.md is written from the model; lists over actors are hand-written handlers
```

**B · A stores folder**

```ts
// blueprint/stores/main.ts
export default Blueprint.store.d1();
// blueprint/things/allowance/thing.ts
import main from "../../stores/main.ts";
export default Blueprint.thing({ description: "…", fields: { … }, lives: main });
```

**C · Homes, plus declared views, plus a generated map and console**

```ts
// blueprint/things/allowance/thing.ts: the home stays one word
export default Blueprint.thing({ description: "…", fields: { … }, lives: "actor" });

// blueprint/views/allowances-by-organization.ts: a list the system keeps from events
export default Blueprint.view(Allowance, {
  from: [allowance.events.granted, allowance.events.spent, allowance.events.revoked],
  key: Allowance.fields.organization,
});
// generated: the read in the SDK, CLI and MCP; generated/data/map.md; a data page in the portal
```

**You do X → what happens**

| Scenario | A · Homes only | B · Stores | C · Homes plus views |
|---|---|---|---|
| list an organisation's allowances, which live as actors | you hand-write an index | still impossible across actors | declare a view; the read is generated |
| move a thing from database to actor | change one word; your lists break | change its store; lists break | change one word; views keep working |
| an agent asks "what data is there?" | reads the map | reads the stores | reads the map, with views and their sources |
| a new environment | bound by the host's defaults | each store bound by hand | bound by the host's defaults; views go where their key lives |

**Rubric**

| Axis | A · Homes only | B · Stores | C · Homes plus views |
|---|---|---|---|
| Floor-first | ⚠️ ships, leaves F5's hole | ❌ new folder, hole stays | ✅ closes the hole |
| Reversibility | ✅ | ⚠️ every thing imports a store | ✅ views are additive |
| Blast radius | ✅ small | ❌ every thing changes | ⚠️ new declaration kind |
| Correctness | ❌ hand-written indexes drift | ⚠️ | ✅ views built from events, replayable |
| Fit | ✅ today's shape | ❌ a second home concept | ✅ events already exist |

**Recommendation: C.** It keeps today's one-word home and closes the list hole with a declaration built from events the
model already has.

## Q2 — What runs long work: agent runs and multi-step processes?

**The problem, in code.** H1 chose Pi Durable for agent runs and kept Effect Workflow as a fallback, partly because the
two-week rule kept `@effect/platform-cloudflare` out. Under R1 it is usable now, and the app needs durable processes too
(waiting for a webhook, sending a notification once, work across actors).

```text
design/decisions/H1-agent-harness.md §8: "Option E … ships CloudflareWorkflowEngine: one workflow execution is one
Durable Object … It is not usable today under our rule … Triggers to switch to E: … (4) Aaron wants the agent run to
be a declared Architect workflow (L5.04)."
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| the agent feature and the factory | every builder run is one of these |
| notifications, payments | waits and at-least-once delivery |
| the outbox in host-cloudflare `actors` | how events leave an actor |
| telemetry | one trace shape for both, or two |

**The options**

**A · Two engines, each on its own job**

```ts
// agent runs: Pi Durable inside the agent feature's actor (H1 as decided)
// app processes: Effect Workflow, declared
export default Blueprint.workflow({ steps: { charge: Blueprint.step.call(stripe.calls.paymentIntents.create),
  settled: Blueprint.step.await(stripe.events.paymentSucceeded) } });
```

**B · Effect Workflow for everything; Pi only as the loop inside activities**

```ts
// one engine: a run is a workflow, each model turn and tool call an activity
Workflow.make("AgentRun", { payload, idempotencyKey }) // body loops turn activities until done
```

**C · Pi Durable for everything**

```ts
// app processes written as Pi Durable sessions too
```

**You do X → what happens**

| Scenario | A · Two engines | B · Effect for all | C · Pi for all |
|---|---|---|---|
| a builder run crashes mid-turn | Pi resumes it, transcript intact | resumes, but we write transcript storage and compaction | Pi resumes it |
| a payment waits two days for a webhook | a workflow sleeps on a durable clock | same | awkward: Pi is shaped for chat |
| one trace across a run and the work it starts | joined at the seam | one shape | one shape |
| Pi changes its API | only agent runs are touched | Pi is small inside activities | everything is touched |

**Rubric**

| Axis | A · Two engines | B · Effect for all | C · Pi for all |
|---|---|---|---|
| Floor-first | ✅ both exist today | ⚠️ we write what Pi gives | ❌ wrong shape for processes |
| Reversibility | ✅ each behind a seam | ⚠️ | ❌ |
| Blast radius | ✅ | ⚠️ | ❌ |
| Correctness | ✅ each does what it was built for | ✅ | ⚠️ |
| Fit | ✅ H1 as decided, plus L5.04 | ⚠️ reopens H1 | ❌ |

**Recommendation: A.** Pi Durable for agent runs, as H1 decided; Effect Workflow for declared processes, now usable.
The factory's manager loop is one of those processes: a workflow per mission, waiting on durable deferreds completed by
logbook events, never polling ([`examples/factory.md`](examples/factory.md)). The agents example reaches the same
answer and keeps Effect Workflow as the exit if Pi breaks the seam twice in a quarter (H1's triggers).

## Q3 — What happens to Codex's layer/4 work?

**The problem, in code.** Codex worked on `layer/4`: 15 commits past `main`, a decision record on kits and dependencies,
and six end-to-end author checks. Much of it agrees with the frame; its words are the old ones (kits, dependencies).

```text
origin/layer/4:design/decisions/D4.md:11  "A kit is an installed package with a pure descriptor, pure exported
declarations, and separate target/host runtime entry points. A project selects it once in blueprint/kits/<alias>.ts."
origin/layer/4:e2e/layer3/  01-kit-selection, 02-kit-runtime-and-closure, 03-dependency-selection,
                            04-dependency-runtime, 05-graph-integrity, 06-collisions (.test.ts)
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| the frame's plugins and mounting | D4's kit is the frame's feature; its dependency is the adapter |
| the recut milestones | whether these checks start the new plan |
| `main` | nothing of layer/4 is merged |

**The options**

**A · Harvest it into the recut**

```text
keep: D4's pure descriptor, per-host runtime entries, one mount file per alias, secrets by reference
rename: kits → features, dependencies → adapters, blueprint/kits/ → blueprint/features/, blueprint/adapters/
keep the six e2e checks, renamed, as the first checks of the plugins milestone
```

**B · Drop it; recut from main**

```bash
git branch -m layer/4 archive/codex-layer-4   # kept for the record, nothing carried over
```

**C · Merge it as is, then change it**

```bash
# merge layer/4 to main with the old words, then rename in a later step
```

**You do X → what happens**

| Scenario | A · Harvest | B · Drop | C · Merge as is |
|---|---|---|---|
| the plugins milestone starts | six checks already written | written again | checks exist, under old words |
| a reader opens `main` | one vocabulary | one vocabulary | two vocabularies until the rename |
| Codex's evidence | kept, cited | archived | merged |

**Rubric**

| Axis | A · Harvest | B · Drop | C · Merge as is |
|---|---|---|---|
| Floor-first | ✅ reuses real checks | ❌ redoes work | ⚠️ |
| Reversibility | ✅ | ✅ | ❌ old words on main |
| Blast radius | ⚠️ a rename pass | ✅ | ❌ |
| Correctness | ✅ checks re-run under the new words | ✅ | ⚠️ |
| Fit | ✅ D4 mostly agrees with the frame | ⚠️ | ❌ |

**Recommendation: A.** D4 already decided much of what the frame proposes; keep its checks and rename them in the recut.

## Q4 — How are the packages laid out under `@formants`?

**The problem, in code.** Today's packages are the build's internal split, named for Architect.

```text
origin/layer/3:packages/  blueprint cli compiler generators host-cloudflare lint logbook portal preset prove std
                          target-effect target-solidity
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| every plugin author | what they import and publish |
| `forman add` | how it finds a plugin by name |
| the package rules (Nx boundaries) | compiler and generators never run in production |

**The options**

**A · One front door, one package per plugin, language and host**

```ts
import { Blueprint } from "@formants/forman";      // the API and the `forman` command
// @formants/language-effect  @formants/language-solidity  @formants/host-cloudflare
// @formants/stripe  @formants/wallets  @formants/auth  @formants/sdk (a projection)
```

**B · The kind in every name**

```ts
// @formants/feature-wallets  @formants/adapter-stripe  @formants/projection-sdk  @formants/language-effect
```

**C · Today's split, renamed**

```ts
import { Blueprint } from "@formants/blueprint";
// @formants/compiler  @formants/generators  @formants/prove  @formants/cli  @formants/target-effect  …
```

**You do X → what happens**

| Scenario | A · One front door | B · Kind in the name | C · Today's split |
|---|---|---|---|
| start a project | `npm create formants` then one dependency | same | five dependencies |
| add Stripe | `forman add @formants/stripe` | `forman add @formants/adapter-stripe` | same as A |
| a plugin changes kind | name stays | renamed | name stays |

**Rubric**

| Axis | A · One front door | B · Kind in the name | C · Today's split |
|---|---|---|---|
| Floor-first | ✅ | ✅ | ⚠️ exposes the build's insides |
| Reversibility | ⚠️ npm names are forever | ⚠️ | ⚠️ |
| Blast radius | ✅ internal packages stay internal | ✅ | ❌ |
| Correctness | ✅ the kind lives in the descriptor | ⚠️ the name can disagree with it | ✅ |
| Fit | ✅ matches the frame's plugin kinds | ⚠️ | ❌ |

**Recommendation: A.** One package a user installs; the compiler, generators and prover ship inside it or as its
dependencies; plugins named for what they are.

## Q5 — One role model: `holds` or `owner.of`?

**The problem, in code.** The docs and the code decide roles two different ways.

```js
// design/docs/source/files.starter.js:52: a role is a membership the principal holds
holds: (principal, organization) => Membership.holds(organization, principal, ["owner"]),
```

```ts
// origin/layer/3:packages/blueprint/src/modules/roles/types.ts:15-19: a role is a rule over the thing, scoped by path
readonly rule: (instance: InstanceOf<T>, principal: Extract<Principal, { kind: "person" }>) => boolean;
readonly of: <const P extends string>(path: P) => RoleOf<T, P>;
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| the new principals (agent, service, system) | the rule's type takes only `person` today |
| `who may call` eval and the docs | judge and explain the same rule |
| auth as a mounted feature | it owns memberships |

**The options**

**A · `owner.of` (the code), widened to every principal**

```ts
export const owner = Blueprint.role(Organization, { rule: (org, who) => who.kind === "person" && org.owners.includes(who.person) });
allowed: [owner.of("organization").via(Via.session), Blueprint.role(Payment, { service: stripe })]
```

**B · `holds` (the docs): roles are memberships**

```ts
allowed: [Membership.holds("organization", ["owner"])]
```

**C · Both: `holds` as sugar that compiles to a rule**

```ts
export const owner = auth.roles.holds(Organization, ["owner"]); // a Role, so `.of(...)` and the eval still apply
```

**You do X → what happens**

| Scenario | A · `owner.of` | B · `holds` | C · Both |
|---|---|---|---|
| Stripe calls `payment.settle` | `role(Payment, { service: stripe })` | no membership to hold | as A |
| an app without auth's memberships | works | can't express roles | works |
| a common membership check | a rule each time | one line | one line |

**Rubric**

| Axis | A · `owner.of` | B · `holds` | C · Both |
|---|---|---|---|
| Floor-first | ✅ built | ❌ docs only | ✅ |
| Reversibility | ✅ | ⚠️ | ✅ sugar can be removed |
| Blast radius | ✅ | ❌ | ✅ |
| Correctness | ✅ one checked rule | ⚠️ only memberships | ✅ one checked rule |
| Fit | ✅ the code | ⚠️ | ✅ auth owns memberships |

**Recommendation: C.** The code's rule is the model; `holds` is declared in `orthograph`, beside `rule` and `who`, and produces a role (K20, 20 November 2026).

## Smaller calls

These came out of writing the story, the generators and the examples. Each is bounded and local, too small for the
full template, so each gets its options and a recommendation in a line or two. The linked document shows the code.

**From the story** ([`story.md`](story.md))

- **S1. Where a prose journey lives.** A: the same file, `story:` first, `steps:` added later. B: a separate
  `journeys/stories/*.md`. C: only in the portal. **A**: one file, one name; the model sees both forms.
- **S2. Who may turn a story into steps.** A: any agent that is not the builder of the operations it calls. B: one
  named journey-author role. **A**, checked by the scorer from the run's authorship.
- **S3. A step that passes on empty handlers.** A: allowed, labelled "proved by the description". B: refused. **A**:
  role and state checks are real guarantees, and the label shows them.
- **S4. What a planning conversation leaves behind.** A: the blueprint and its blanks, each blank asking its question
  in plain words. B: also the conversation, saved. **A**: the chat is not a source of truth.
- **S5. Diagrams.** A: read and draw machines first. B: also sequence diagrams as journeys. **A first.**
- **S6. Ratchets.** A: per operation. B: also project-wide. **Both, per operation first.**
- **S7. Watch findings.** A: an `improve` task briefed with the trace. B: an attention to a person. **A for budgets and
  refusal rates; B for anything about money or security.**

**From the generators** ([`generators.md`](generators.md))

- **S8. Where the generated agent kit lives.** A: directly in `.agents/skills/`. B: under `generated/agents/`, linked
  from `.agents/skills/forman` and `.claude/`. C: read from the package at run time. **B**: `generated/` stays the one
  never-edited place.
- **S9. The CI workflow.** A: fully generated. B: a short scaffolded workflow calling `forman ci <stage>`, the plan
  generated. C: a published GitHub Action. **B.**
- **S10. The header in generated Markdown.** A: an HTML comment after the frontmatter. B: a frontmatter field. C:
  none. **A.**
- **S11. One projection or two.** A: the builder projection renders `bp` and the kit. B: a separate `agents`
  projection built on `builder`. **B**: a team can mount another kit, or none.
- **S12. Which agents' forms first.** A: the neutral form, plus Claude Code and the Pi harness. B: also Codex and Amp.
  C: neutral only. **A.**
- **S13. How much model goes into the definitions.** A: full lists inline. B: each role's slice inline, the rest
  through `describe`. **B.**

**From the agents and factory examples** ([`examples/agents.md`](examples/agents.md), [`examples/factory.md`](examples/factory.md))

- **S14. What stands in for a model in a world.** A: a small open model on a local OpenAI-compatible server, the free
  hosted models in staging. B: Pi's `faux` provider. C: no journey runs a model. **A**: B is our own fake (Q1 of the
  last round rules it out); C leaves durability unproved.
- **S15. Who may start an agent run.** A: only a person, unless the app's mount allows agents. B: anyone signed in. C:
  only `system`. K40 (22 November 2026) replaces all three: an agent is its own thing, made by any operation allowed
  to create one, under that operation's roles.
- **S16. The factory's run and the agents feature's run.** A: the factory references one. B: the agents run gains
  mission fields. C: the factory calls Pi itself. **A**: features never contain each other.
- **S17. What the factory runs on.** A: the last released Forman. B: `main`. C: the revision it is building. **A.**
- **S18. How the factory reads the logbook.** A: a hand-written adapter now, generated once the logbook publishes a
  model. B: rebuild the logbook as a Forman app first. C: a copied `fact` thing. **A.**

**From the feature examples** ([`examples/`](examples/README.md))

- **S19. How a world sends an adapter's event.** A: a journey step `s.<mount>.sends(event)`, signed by the world. B:
  the stand-in sends it. C: only in the cloud pass. **A**; conformance covers the vendor's side.
- **S20. Money going out defaults to people only.** A: the adapter marks money-moving calls, and operations using them
  are `.notVia(Via.agent)` unless opted in. B: each operation decides. **A.**
- **S21. Who registers a webhook.** A: the adapter's `provision` step at `promote`, with a restricted release key. B:
  `promote` prints the line for a person. **A, falling back to B** where the vendor has no API for it.
- **S22. Our own events driving our operations.** A: the same `on:` as adapter events, called as `system`. B: a new
  `Blueprint.reaction`. **A**: one mechanism.
- **S23. Email over SMTP or HTTP.** A: SMTP, so Mailpit stands in as real software. B: HTTP, sandbox in staging only.
  **A**, B only for providers without SMTP.
- **S24. An event that can't be delivered.** A: a defect shown by `watch`, kept for a redelivery command. B: a
  dead-letter thing the app declares. **A now.**
- **S25. A chain call's waiting state.** A: a generated in-between state on the machine (`spending`). B: hidden in the
  relayer. **A**: honest to callers.
- **S26. How much fuzzing runs on every check.** A: a fixed seed set in `check`, the long run in CI. B: always long.
  **A**, the CI seed in the verdict.
- **S27. One vault per organisation or one for all.** A: per organisation, as L4.07 plans. B: one with a mapping. **A.**
  (Settled otherwise by K25, 20 November 2026: an organisation is not deployed. One budgets module per network, which
  each organisation's Safe enables; the money stays in the Safe.)
- **S28. Is "leaks nothing" a journey check or an eval?** A: a built-in eval on every operation with a private field.
  B: a journey check. **A.**
- **S29. Where custody is proved first.** A: in Solidity with wallets, so Noir inherits it. B: only with Noir. **A.**
- **S30. A proof the local network didn't verify.** A: the verdict says so, and production needs a verdict from a
  verifying network. B: local is enough. **A.**
- **S31. Python clients: exceptions or results.** A: typed exceptions by default. B: a result type. **A**, B as a choice.
- **S32. Python client built from OpenAPI or the model.** A: OpenAPI. B: the model, which keeps refusal codes and
  visibility. **B**, reversing `projections.md` 3.12.
- **S33. A local stand-in for PyPI.** A: a local index (devpi or pypiserver), labelled. B: skip release locally. **A.**

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | data: homes, views, map | C · homes plus declared views, generated map and console |
| Q2 | long work | A · Pi Durable for agent runs, Effect Workflow for processes |
| Q3 | Codex's layer/4 | A · harvest into the recut |
| Q4 | packages under `@formants` | A · one front door, plugins by name |
| Q5 | role model | C · rules as the model, `holds` declared in `orthograph` (K20) |
| S1–S33 | smaller calls | as marked in bold on each |

## Answer key

Answer by number and letter, for example "Q1 C, Q2 A, Q3 A, Q4 A, Q5 C", or "all recommended". For the smaller calls,
name only the ones you'd change ("all recommended except S20 B"); the rest stand as marked.
