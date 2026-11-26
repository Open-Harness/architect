# AGENTS.md

`CLAUDE.md` points here. Every agent (Claude, Codex, Amp) reads the same rules.

## What this repository is

Orthograph, the framework (command `ortho`, packages `@orthograph/*`); what you write with it is the blueprint. The name
was decided on 18 November 2026 (`design/decisions/K6-orthograph.md`), and `design/naming.md` maps every name. Its documentation is the canon,
`docs/canon/`, and its status page, `docs/canon/status.md`, says what is built and maps the packages (K41). Its design is
in `design/`: the milestones (`milestones.md`: M0 to M7, each slice with what it needs and the check that proves it), the
decisions (`decisions/`), `spikes.md` and `spikes/`. The retired frame and the old docs page are records in
`design/history/retired-2026-11-23/`. Layers 1 and 2 are recorded in `build-plan.md`.

## Who decides (Aaron, 16 November 2026)

The building agent owns the architecture. Aaron's words: be independent and autonomous, make the architectural
decisions, and where docs disagree, take ownership and make them consistent. So:

- When code and design disagree, or two design files disagree, decide which is right, fix the other in the same
  change, and record the call in `design/decisions/` with the evidence. Nothing waits on Aaron for this, including
  items marked decided, as long as the change serves the goal in `README.md`.
- **One way to supersede.** When a decision changes what an older doc says, the same change does three things. Live
  docs (design pages, skills, docs, code) are rewritten to the new words. Dated records keep their words, as
  `design/naming.md` rule 6 says, and gain "Superseded by <id>, <date>" beside the changed words. The new decision lists
  each replaced phrase under `## Supersedes`, one line each (`- <old doc>: "<old words>" → "<new words>"`), and
  `git grep` then finds each old phrase only in the dated records and `design/process/`. This holds from 19 November 2026; older "superseded by" notes stand as written.
- Keep Aaron's own calls (the ones dated with his name) unless building proves one wrong; then change it, record why,
  and tell him in the next report.
- Come back to Aaron only when truly blocked: money beyond the cap, a credential, production, something outward-facing
  or irreversible, or a fork where the goal itself is unclear.

## How work flows

- **Milestones.** Orthograph is built in milestones M0 to M7 (`design/milestones.md`; layers 1 and 2 came first). An
  app goal builds what it needs in its own slice, unless a running goal has claimed it or its paths (K42); a milestone
  is done when its gate passes on `main`. The running goals and the collision rule are in `design/goals/map.md`. Ideas
  for later go in `design/later.md`, never into code.
- **Goals.** A goal is one long-running agent, today a thread that manages other threads, later a superagent (K42).
  Two goals build (K44): the framework goal (Goal 18), which builds the Orthograph alpha, and Capxul (Goal 16). The
  framework goal always runs: it ranks what can run now, keeps the board, settles collisions and brings grills to
  Aaron. Capxul dogfoods the framework: it builds its app and the framework gaps it claims. The lander (Goal 19) always
  runs: it brings each app goal's green slices into `main`. The superagent (Goal 17) is parked. A goal exists while its
  agent runs. Its brief in `design/goals/` has one done check; it works one commit per slice, each ending green with
  its "done when" check. It loops generate, run, fix until the check passes, then moves on. Its work reaches `main` by
  pull requests, merged when CI is green and a 🔍 reviewer subagent passed it. Threads are optional, for work that truly runs in
  parallel. A goal may run in any harness (Claude Code, Codex, OpenCode, Amp) and coordinates through the repository and
  GitHub: its brief's "Where it stands", its claims on the board, and Snag issues (K42;
  `design/decisions/K33-github-native.md`; the `github` skill says how).
  A slice lands early, by a branch cut at the commit that ends it and merged into `main` by a merge commit, which is how the lander brings app work into `main` (K42, section 8;
  `K38-early-landing.md`).
- **Spikes** answer one question in throwaway code under `spikes/<name>/`, on a `spike/<name>` branch. Each ends with
  a README (question, tried, found, the decision it supports, open risks) and is merged into `main` for the record.
  Spike code is never imported by packages.
- **Decisions** are made just in time, in the decision step placed before the first step that needs it, and recorded
  in `design/decisions/<id>.md` with the evidence. Don't reopen one without new evidence.
- **Journeys and checks come first.** A different agent from the builder writes an operation's journeys and checks,
  and they fail on empty handlers before the builder starts (the `author` skill). A builder never edits journeys, the
  evals or the runner's generic checks; on `m1` and the goal branches it may only remove lines from the ratchet lists, a file per check
  in an e2e suite's `expected-failing/` (`e2e/m1/`, `e2e/ui-layer/` and the rest; CI-ratchet-suites) and a file per test file in `packages/<package>/expected-failing/` (G11), or delete a file there. Authors' branches end in `-check` and builders' in `-build`. A builder that needs a
  check changed stops and asks its author. A slice that changes acme's wire, its model or its checked-in `generated/` lands as a
  pair, `goal-3/<slice>-check` and `goal-3/<slice>-build`, because layer 1 and layer 2 have no ratchet (G12,
  `design/decisions/G12-paired-landing.md`).
- **Merge your own pull requests when CI is green,** every review thread is resolved and a 🔍 reviewer that wrote none
  of it has passed it. The 🔍 pass is the gate. Codex is advisory (`design/decisions/CI-codex-advisory.md`): comment
  "@codex review" when it is available, and answer any finding it posts before the merge, but nobody waits on it; if
  Codex is down or slow, the pull request merges without it. Push on until actually blocked, and never end a turn waiting on CI without a background watcher that wakes you (`design/decisions/CI-integration.md`). GitHub enforces CI and
  threads, admins included (`design/decisions/CI-branch-protection.md`): `main` and `m1` require their
  CI jobs and every conversation resolved. `main` requires `builder-paths` too: a `-build` pull
  request may not touch journeys, evals or checks. On a docs-only pull request `e2e-layer1` and `e2e-layer2`
  pass without running their steps (`design/decisions/CI-docs-fast-path.md`). Open pull requests as drafts: a draft runs no CI, so test
  locally, get the 🔍 pass, then mark it ready and CI runs once; keep at most two ready pull requests per lane in CI at
  once (`design/decisions/CI-drafts.md`). CI goes by the pull request's live draft state, never the event's payload, so a
  push just before `gh pr ready` still runs CI (`design/decisions/CI-drafts-race.md`). Bring a branch up to date by merging its base in, never by
  rebasing, so the commits a reviewer already read keep their identity.

## The code's own rules (enforced by lint and check as soon as they exist)

- Effect everywhere; no `async`, `await`, `try`, `throw`, `Date.now`, `new Date()`, `setTimeout` or plain
  `Effect.sleep` outside named entry files. Every wait goes through `Timers`; all handler, workflow and keeper work is
  counted work.
- Names come from paths and exported identifiers; a declared name is never written as a string outside `generated/`.
- Generated files open with a `// Generated from … Do not edit.` line (naming the blueprint or the declaration's path;
  after a shebang when there is one) and are never edited, except an ABI adapter's `src/generated/` written by hand to
  `--from-abi`'s shape until its first run overwrites it (CX-from-abi). Scaffolds start
  with `// Scaffolded from <path>. Yours from now on.`
- Package rules (Nx module boundaries): `orthograph` (the front door, the `Blueprint` API) depends only on Effect;
  generated code imports only the language's runtime, `orthograph`, the host and project code, and in `generated/web/`
  also `@ui-sdk/*`, `react` and `@orthograph/web` (K29); `compiler` and `generators`
  never run in production.
- Pin dependency versions exactly, and use versions published at least three days before you add them (Aaron, 17
  November 2026). A younger version needs an override: its name in `minimumReleaseAgeExclude` in
  `pnpm-workspace.yaml`, with a comment giving the reason, and a line in `design/decisions/R1-release-age.md`.
- Inside each package, `src/` follows the six-slot module shape in `~/AGENTS.md` (`main.ts` as the only entry file;
  `modules/<name>/{README.md,types.ts,service.ts,internal/,<name>.test.ts}`), no source file over about 250 lines; an
  adapter generated from an ABI has `src/index.ts` as its entry and `src/generated/` beside its modules (CX-from-abi).

## Standing rules from Aaron

- Ask Aaron only when blocked (see "Who decides"), and batch the questions.
- Spend at most $10 a day on cloud resources, across everything. Layer one needs no cloud at all.
- Every world, stage and site you make is destroyed; nothing is left running. Touch only your own resources.
- On the shared Mac, stop only the processes you started, by PID; never run a machine-wide `pkill` or `killall`.
  Before you report, list what still runs from your worktree (`pgrep -fl "$(pwd)"`) and stop what is yours.
- Never print a key or connection string, or write one to a file or a commit. Never create a cloud credential without
  Aaron's written yes.
- Keep people's emails and personal details private.
- A Claude Code cloud session never connects to Aaron's computer: a session that does is limited to his trusted devices
  for good, and no cloud thread or scheduled task can reach it again.
- Aaron listens rather than reads: write to him as the `threads` skill says, "Talking to Aaron".

## Threads

Every thread is one type, titled with its emoji; the skills are in `.agents/skills/`: `threads` (the types and each agent's
word for starting, messaging, reading and archiving a thread), `conductor` (the loop), `spike` (running a spike),
`author` (writing journeys and checks, and proving each fair), `reviewer` (the 🔍 review), `hashtags` (Aaron's `#shortcuts`), `portal-design` (designing portal and console screens:
the process and the style guide), `kanban` (the board Aaron and the conductor track every slice on, its data saved
in the repo, and `STATE.md`, where the project stands), `ui-sdk` (UI SDK's own skill, vendored at the pinned version, for
the generated pieces, pages and the portal's components on it; its `README.md` says how we use it) and `github` (how the
work lives on GitHub: a milestone per goal, the issue kinds and forms, labels, the pull request template and the sync, K33).
On `goal/on-chain`, the `goal-4` skill is how Goal 4's lead works and resumes; its state is
`.agents/skills/goal-4/STATE.md`. `.claude/skills` and `.claude/agents/reviewer.md`
are links to it; edit them only in `.agents/skills/`.
