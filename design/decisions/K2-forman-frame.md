# K2: the Forman frame, decided

> K5 ([`K5-the-whole-shape.md`](K5-the-whole-shape.md), 18 November 2026) refines this frame: the portal is our own
> design on pieces ported from agent-native, actions keep `defineAction`'s field names, and steps and workflows are
> apart. K2 stands where K5 is silent.

Decided 17 November 2026. Aaron took the recommendations on every open question in
[`../frame/questions.md`](../frame/questions.md) ("All open questions are your recommendations … I'm allowing you to
go with your recommendation"), plus the calls he made himself in the same conversation. This record supersedes
`K1-kits.md` section 3 and Codex's `D4.md` (on `layer/4`, unmerged) where they disagree. The frame in
[`../frame/`](../frame/README.md) is the design; this is the list of what is settled.

## Aaron's own calls

1. The framework is **Forman**, command `forman`, npm org **`@formants`** (not yet created: needs Aaron signed in).
   **Superseded 18 November 2026 by [`K6-orthograph.md`](K6-orthograph.md):** the framework is Orthograph, command
   `ortho`, npm scope `@orthograph`.
   **Blueprint** is what you write: the `blueprint/` folder and the `Blueprint.*` API. Capxul keeps `@capxul`.
2. "Target" is renamed **language** (Effect, Solidity, Noir, Python).
3. Dependencies may be three days old, with a named override ([`R1-release-age.md`](R1-release-age.md)).
4. Codex is dropped; we build Forman ourselves.
5. Forman is the sole focus until it is **workable, which is the end of M2**; then Capxul's plugins are built on it.
6. **The factory comes before agents**, each usable without the other, joined seamlessly when both are mounted.
7. From the previous round: stand-ins follow the labelled ladder, never our own fakes (Q1); MCP is a door of the one
   Worker (Q2); an unattended builder may read staging telemetry, redacted, through a read-only token created only
   with Aaron's yes (Q3).

## The big joints (`questions.md` Q1 to Q5)

| # | Decided |
|---|---|
| Q1 | Data: a thing keeps its one-word home (`database`, `actor`, `chain`); lists across homes are declared **views** built from events; the model generates a data map and a portal data page. **Widened by [`K3`](K3-stores-and-sources.md)** (18 Nov): a thing lives in a store of an open kind, and a source we don't own is an adapter. The word "home" is retired (G-03, K5) |
| Q2 | Long work: **Pi Durable** for agent runs (H1); **Effect Workflow** (`@effect/platform-cloudflare`) for declared processes, including the factory's manager loop |
| Q3 | Codex's `layer/4`: **harvested** into the recut; its kit decision and six end-to-end checks are kept, renamed (kits become features and adapters) |
| Q4 | Packages: **one front door**, `@formants/forman`, plus one package per plugin, language and host (`@formants/auth`, `@formants/language-effect`, `@formants/host-cloudflare`) |
| Q5 | Roles: the code's **rule** is the model; the organizations plugin exports `holds` as a shortcut that produces one (Superseded by K20, 20 November 2026: `holds` is declared in `orthograph` itself) |

## Decided in the walkthrough

- **Auth is two feature plugins**: `@formants/auth` (identity: people, sessions, keys, the device flow, OAuth for MCP,
  `AUTH_SECRET`) and `@formants/organizations` (tenancy: organisations, memberships, invitations, owner and member,
  `holds`), which needs auth. Nothing of either is copied into a project.
- **Principals**: `anonymous`, `person`, `agent` (acting for the person who started it), `service(<adapter mount>)`,
  `system`. Ways in are `Via.session`, `Via.key`, `Via.device`, `Via.agent`; a role asks which person, and
  `.via` / `.notVia` decide which ways in may use it.
- **The factory is a feature**, `@formants/work`, with a choice of workers: `people` (default: a person or an outside
  agent such as Claude Code claims a task through the factory's CLI or MCP) and `agents` (an optional need on
  `@formants/agents`: the manager starts an agents run on the task's brief; its finished event returns through `on:`).
  The agents feature knows nothing of the factory. Only a fact closes a task.
- **Agents are a feature**, `@formants/agents`: a `Run` thing, `Blueprint.agent` declarations, model providers as
  adapters, the loop in each run's own Durable Object.
- **Plugins are shown** in `forman describe`, in the generated docs (a page per primitive kind and per mount, an origin
  badge on every thing and operation), in the portal's System view, and to agents through `bp.describe()`.

## The smaller calls (`questions.md` S1 to S33)

Every one is decided as recommended there. In short: prose journeys live in the journey file (S1); any agent but the
builder makes them executable (S2); description-proved steps are allowed and labelled (S3); planning leaves only the
blueprint and its blanks (S4); machines first in diagrams (S5); ratchets per operation, then project-wide (S6); watch
findings become tasks, money and security go to a person (S7); the agent kit is generated under `generated/agents/`
(S8); CI is a short scaffolded workflow calling `forman ci` (S9); generated Markdown carries an HTML-comment header
(S10); a separate `agents` projection built on `builder` (S11); the neutral kit plus Claude Code and Pi forms first
(S12); each role's slice of the model inline (S13); a small local model stands in for providers (S14); only a person
starts a run unless the mount allows agents (S15) (_Superseded by K40, 22 November 2026: an agent is its own
thing, made by any operation allowed to create one_); the factory references an agents run (S16); the factory runs on the
last released Forman (S17); a hand-written logbook adapter until the logbook publishes a model (S18); a world sends an
adapter's event itself (S19); money going out is `.notVia(Via.agent)` by default (S20); webhooks registered by the
adapter's `provision` step (S21); our own events drive operations through `on:` as `system` (S22); email over SMTP so
Mailpit stands in (S23); an undeliverable event is a defect with a redelivery command (S24); a chain call's waiting
state is a generated machine state (S25); fixed fuzz seeds in `check`, the long run in CI (S26); one vault per
organisation (S27); "leaks nothing" is a built-in eval (S28); custody proved first in Solidity (S29); an unverified
local proof is labelled and blocks production (S30); Python clients raise typed exceptions (S31) and are built from
the model, not OpenAPI (S32); a local package index stands in for PyPI (S33).

## The milestones

M0 land and rename; M1 the complete model and plugins; M2 auth and organizations (**workable**); M3 the factory, with
people as workers; M4 agents, proved together with the factory; M5 reach out; M6 on chain; M7 the cloud, then Capxul.
The slices are in [`../milestones.md`](../milestones.md).
