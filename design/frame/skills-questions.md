# Skills: questions for Aaron

One batched round, 18 November 2026, for [`skills.md`](skills.md). Everything else in that design was the building
agent's call (recorded in [`../decisions/K4-agent-skills.md`](../decisions/K4-agent-skills.md)). These four are yours,
because each one decides what "workable" means, how much an agent may do without you, how you work day to day, or
something outward-facing.

**Terms used in this round.**

- **Skill**: a `SKILL.md` folder saying how to do one job on a Orthograph project. Any agent can follow it.
- **Kit**: the skills, role definitions and rules that the `agents` projection writes into `generated/agents/`, from
  `@orthograph/agent-kit`.
- **Floor**: a skill whose steps use only `ortho` shell commands, so it runs before code mode and `ortho mcp` exist.
- **Outside agent**: Claude Code, Codex, Amp or Pi's coding agent, run by a person, with its own shell.
- **The contract**: what `blueprint/` declares. Callers, journeys and verdicts all depend on it.
- **Loosening**: a contract change that makes the system promise less: a budget raised, a role widened, a declared
  error removed, a `.notVia(Via.agent)` dropped.
- **Attention**: the factory's way of waiting for a person's yes (`attention.approve`, `owner.notVia(Via.agent)`).

## Q1 — Should "workable" at M2 include the first skills, or do skills wait for M3.12?

**The problem, in code.** "Workable" is the end of M2 (K2, Aaron's call 5), and the M2 gate says nothing about agents.
The whole kit is one slice in M3:

```markdown
<!-- design/milestones.md:161 -->
| M3.12 ∥ | The `agents` projection, built on `builder`: skills, role definitions and rules under `generated/agents/`, neutral, Claude Code and Pi forms, the Markdown header (S8, S10 to S13) | M3.05 | build | a model change rewrites the kit; a hand edit fails the drift check | L |
```

```markdown
<!-- design/milestones.md:115-119, Gate M2 -->
**Gate: workable.** `nx run e2e:m2`: (1) `npm create orthograph demo` scaffolds Plugged In at stage 1 with auth and handles
mounted and nothing copied, and `ortho prove --env local` is green; (2) a new `notes` feature … (3) the sign-up and
sign-in journeys pass through the SDK, the CLI and MCP; (4) no environment file names a secret by string.
```

So a team that starts a Orthograph project at M2, which is when Capxul starts, gets no skills at all for one whole
milestone. Their agents would learn Orthograph from the docs, the way ours learn it from `AGENTS.md`.

**What it touches**

| Dependent | Why it cares |
|---|---|
| Gate M2 (`e2e:m2`) | a new check would join it |
| M2.09 `ortho new` | it would write `generated/agents/` and the links |
| M3.12 | it shrinks to the forms, the roles and the gated sections |
| Capxul's plugins, built after M2 | their builders would have the floor skills from day one |

**The options**

**A · As planned: skills in M3.12**

```markdown
<!-- design/milestones.md, unchanged -->
| M3.12 ∥ | The `agents` projection … neutral, Claude Code and Pi forms … | M3.05 | build | … | L |
```

**B · A floor in M2, grown in M3.12**

```markdown
<!-- design/milestones.md, a new M2 slice, and Gate M2 gains a fifth check -->
| M2.13 ∥ | The `agents` projection's floor: the neutral form only, fixed text and the shell column, no gates or roles, for `describe-this-app`, `add-a-thing`, `add-an-operation`, `write-a-journey`, `make-a-journey-executable`, `fill-a-blank`, `prove-an-operation`, `watch-an-environment`, `review-a-change`; written by `ortho new` | M2.09 | build | `npm create orthograph demo` has `generated/agents/skills/` drift-checked, and check 4 passes with only those skills and a shell | M |
| M3.12 ∥ | The rest: the Claude Code and Pi forms, the roles, the model slots and gated sections, the other skills and every eval | M3.05, M2.13 | build | … | L |
```

**C · Hand-written pages in the docs until M3.12**

```text
generated/docs/building/fill-a-blank.md      a docs page, not a skill: no trigger, not loaded by any agent
```

**You do X → what happens**

| Scenario | A · M3.12 | B · floor in M2 | C · docs pages |
|---|---|---|---|
| Capxul starts its first plugin right after M2 | its agents read the docs and guess | its agents load `fill-a-blank` and run `ortho brief` | its agents may find the page if told to |
| A blueprint change adds an operation | nothing to update | the floor is fixed text; the open-blanks list comes in M3.12 | a page may go stale |
| M2's length | unchanged | one more medium slice, in parallel | small |
| What M3.12 then builds | everything | forms, roles, slots, evals | everything, and the pages are thrown away |

**Rubric**

| Axis | A · M3.12 | B · floor in M2 | C · docs pages |
|---|---|---|---|
| Floor-first | ❌ nothing until M3 | ✅ the real files, on the real path | ⚠️ text, but not skills |
| Reversibility | ✅ | ✅ the slice can move back | ✅ |
| Blast radius | ✅ none | ⚠️ Gate M2 gains a check | ✅ docs only |
| Correctness | ⚠️ no agent help when work starts | ✅ drift-checked from day one | ❌ can drift unseen |
| Fit | ✅ as planned | ✅ the same projection, grown later | ❌ a second home for the same facts |
| Parallelizability | ✅ | ✅ runs beside M2.10 and M2.11 | ✅ |

**Recommendation: B.** "Skills are core" should mean a project has them the day it is made. The floor is the same
generator writing the same path, so M3.12 grows it instead of replacing it.

## Q2 — May an agent change the contract without you?

**The problem, in code.** A planner may write all of `blueprint/` except journeys (generators.md section 3, the role
table), and a builder may not. But nothing stops a planner, or a manager acting on a watch finding, from loosening the
contract. The versioner can't even see it: a budget and a role are "patch".

```ts
// packages/compiler/src/modules/compare/internal/versions.ts:10-11
/** The parts of an operation that callers depend on: what goes in, what comes out, and what it can refuse with. */
const BREAKING = new Set(["payload", "answer", "errors", "refusals"]);
```

```ts
// packages/compiler/src/modules/compare/internal/versions.ts:45
return { kind: "changed", what: `${change.name}.${part}`, ...(detail ? { detail } : {}), bump: BREAKING.has(part) ? "major" : "patch" };
```

So `allowed: [grantee]` widened to `allowed: [anyMember]` is a patch, and `budget: { p95: "150 millis" }` raised to
`"400 millis"` is a patch. Story section 6 says budgets "never loosen without a description change", and this is the
description change.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `change-a-declaration` | it must know when to stop and ask |
| `turn-a-finding-into-a-task`, the factory's manager | an `improve` task could be "solved" by raising the budget |
| `review-a-change` | it checks that a loosening was approved |
| `ortho impact` and CI | the classifier lives here; CI enforces it |
| Ratchets (story section 6) | a loosened declaration resets what the ratchet holds |

**The options**

**A · Free: review and ratchets catch it**

```ts
// unchanged. A planner's pull request merges when CI is green and a reviewer passes it.
```

**B · Loosening waits for a person**

```ts
// packages/compiler/src/modules/compare/internal/loosens.ts (new): beside the version bump, not instead of it
const LOOSENS: Record<string, (before: unknown, after: unknown) => boolean> = {
  budget: (a, b) => p95(b) > p95(a),                 // a slower promise
  allowed: (a, b) => widens(a, b),                   // more callers may call
  errors: (a, b) => removed(a, b).length > 0,        // a refusal promised to callers is gone
  via: (a, b) => droppedNotVia(a, b, "agent"),       // an agent may now do what only a person could
};
```

```text
$ ortho impact
allowance.spend.budget   150ms to 400ms   patch   loosens: needs a person
→ CI: the check job fails until a person approves (a GitHub review by a person today; an approved attention once the factory runs)
```

**C · Every blueprint change waits for a person**

```text
$ ortho impact
allowance.spend.memo added   minor   blueprint changed: needs a person
```

**You do X → what happens**

| Scenario | A · free | B · loosening waits | C · every change waits |
|---|---|---|---|
| Watch finds `spend` over budget overnight | the manager may raise the budget and the finding disappears | the agent must make it faster, or ask you to raise it | the same as B, and any other fix to the blueprint waits too |
| An agent adds a new operation from your idea | merges on green | merges on green | waits for you |
| An agent widens who may revoke | a reviewer may notice | stops for you | stops for you |
| Your morning | nothing to approve | a few loosening approvals, each named | every blueprint change |

**Rubric**

| Axis | A · free | B · loosening waits | C · every change waits |
|---|---|---|---|
| Floor-first | ✅ | ✅ the floor is a CI check on `impact` | ✅ |
| Reversibility | ⚠️ a loosening can ship before anyone sees it | ✅ | ✅ |
| Blast radius | ✅ none | ⚠️ a new classifier and a CI rule | ❌ every planner run blocks |
| Correctness | ❌ the system can promise less without anyone choosing it | ✅ only a person makes it promise less | ✅ |
| Fit | ⚠️ undercuts the ratchets | ✅ the same shape as S7 and S20 (money and security go to a person) | ⚠️ the factory stalls on you |

**Recommendation: B.** Adding to the contract is safe for agents; promising less is a choice a person makes. It keeps
the factory moving and the ratchets honest.

## Q3 — How hard should a builder in Claude Code be fenced from the journeys?

**The problem, in code.** Unattended runs and CI can't read journeys: the tools are all they have, and the copy has
none. An outside agent has its own shell:

```markdown
<!-- design/frame/builder.md:24 -->
| Enforcement | partial: the person is the backstop; `check` still catches writes outside the brief | total: the tools are all it has | total |
```

```ts
// e2e/layer1/04-agent-writes-a-handler.test.ts:18, the fence check 4 uses
const DENIED = ["journeys/", "blueprint/journeys/", "blueprint/starting-worlds/", "test/", "node_modules/", ".ortho/"];
```

The brief's own list is about writing only (`packages/cli/src/modules/brief/service.ts:3-5`). A Claude Code builder
can `cat blueprint/journeys/revoke-then-spend.ts` and write a handler that passes the test instead of doing the job.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `fill-a-blank` | what it tells the agent to open, and where |
| M3.11 `work task claim` | it already writes the brief and a branch; it could write a copy |
| The scorer (H2.7) | it puts the journeys back either way |
| How you use Claude Code on Orthograph | what a build session looks like |

**The options**

**A · Trust and the verdict**

```markdown
<!-- generated/agents/skills/fill-a-blank/SKILL.md -->
You never read journeys. The verdict is CI's: it puts them back and runs them.
```

**B · Claude Code deny rules, generated**

```jsonc
// generated/agents/claude/settings.json, linked as .claude/settings.json
{
  "permissions": {
    "deny": ["Read(./blueprint/journeys/**)", "Read(./blueprint/starting-worlds/**)", "Edit(./blueprint/**)", "Edit(./generated/**)"]
  }
}
// The shell still reads: `cat blueprint/journeys/x.ts` is not a Read. Claude Code only.
```

**C · A copy without the journeys, made by the claim**

```bash
work task claim build:allowance.spend
# claimed. Your copy: ~/.ortho/claims/allowance.spend (no journeys, no starting worlds, no tests)
# open your agent there; when done:
work task hand-in build:allowance.spend
# copies back src/allowance/spend.ts only; CI puts the journeys back and judges it
```

**You do X → what happens**

| Scenario | A · trust | B · deny rules | C · journey-less copy |
|---|---|---|---|
| You ask Claude Code to fill `allowance.spend` | it works in the project; it could read the journeys | `Read` is refused; `cat` is not | it works in a copy where the journeys don't exist |
| You use Codex instead | the same as Claude Code | no fence at all | the same fence |
| The agent edits a second file | `check` refuses it | `check` refuses it | hand-in copies only the brief's path |
| Effort for you | none | none | one claim and one hand-in per task |

**Rubric**

| Axis | A · trust | B · deny rules | C · journey-less copy |
|---|---|---|---|
| Floor-first | ✅ | ✅ | ⚠️ needs M3.11's claim, or a `ortho claim` before it |
| Reversibility | ✅ | ✅ | ✅ |
| Blast radius | ✅ | ✅ one generated file | ⚠️ the claim and hand-in commands |
| Correctness | ❌ a fence of words | ⚠️ leaks through the shell | ✅ nothing to read |
| Fit | ⚠️ unlike unattended runs | ❌ one agent only | ✅ the same fence as check 4 and the harness, for every agent |

**Recommendation: C, with B added for Claude Code.** The copy is the one fence that holds for every agent, and it is
the fence the harness and check 4 already use. B costs one generated file and catches the honest mistake.

## Q4 — Where does an idea start, before there is a project?

**The problem, in code.** `shape-an-idea` reads and writes a model, so it needs a project. The kit lives inside one:

```text
# design/frame/generators.md section 2, the tree `ortho new` scaffolds
  .agents/skills/ortho  ──link──▶  generated/agents/skills
  generated/agents/                 G  RULES.md, skills/, claude/, pi/, the role templates filled in
```

```markdown
<!-- design/packages.md:41 -->
Nothing is published to npm before M7; every milestone before it publishes to the local Verdaccio.
```

So the very first conversation, before `npm create orthograph`, has no skill to follow.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `shape-an-idea` | whether it can run with no model |
| `ortho new` (M2.09) | whether it is the first step of every idea |
| Publishing (M7) | a global or marketplace form is outward-facing |
| Capxul | its ideas start in chat today |

**The options**

**A · Project first**

```bash
npm create orthograph allowances
cd allowances && claude
# the agent loads shape-an-idea and writes straight into blueprint/
```

**B · A global skill, installed by the CLI**

```bash
npx @orthograph/cli skills install --global
# copies shape-an-idea into ~/.agents/skills and ~/.claude/skills; it runs `npm create orthograph` when the idea is ready
```

**C · A published Claude Code plugin, at M7**

```bash
claude plugin install ortho@orthograph
# a marketplace plugin with the project-free skills; outward-facing, after M7's publishing
```

**You do X → what happens**

| Scenario | A · project first | B · global skill | C · plugin |
|---|---|---|---|
| You have an idea in a chat with no project | you make one first, in seconds | the skill starts the chat and makes the project | the same as B, once installed |
| The skill's text changes | it updates with the project's kit | a stale global copy | updates with the plugin |
| Before M7 | works | works, from the local registry | not possible |
| Something outside your machine changes | nothing | nothing | a public listing |

**Rubric**

| Axis | A · project first | B · global skill | C · plugin |
|---|---|---|---|
| Floor-first | ✅ works the day `ortho new` does | ⚠️ a second install path | ❌ waits for M7 |
| Reversibility | ✅ | ⚠️ copies on people's machines | ❌ public once listed |
| Blast radius | ✅ none | ⚠️ files outside the project | ⚠️ outward-facing |
| Correctness | ✅ always the project's own kit | ❌ drifts from the projects it makes | ✅ versioned |
| Fit | ✅ the kit lives in `generated/` (S8) | ❌ against S8 | ⚠️ fine after M7 |

**Recommendation: A now, C reconsidered at M7.** An empty project is the canvas for an idea, it costs seconds, and the
skill is then always the project's own.

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | When the first skills reach a project | B: a floor in M2 (a new slice, M2.13), grown in M3.12 |
| Q2 | May an agent change the contract without you | B: adding is free; loosening waits for a person |
| Q3 | How hard to fence a builder in Claude Code | C: a copy without the journeys, made by the claim; B added for Claude Code |
| Q4 | Where an idea starts | A: make the project first; a published plugin is reconsidered at M7 |

**Answer key.** Reply with one letter per question, for example "1B 2B 3C 4A", or "all recommendations". Only Q1 changes
the plan for M2; the other three are first needed in M3 (Q2, Q3) and M7 (Q4), and nothing is built on them before
you answer.
