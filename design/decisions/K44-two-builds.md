# K44: two builds, the Orthograph alpha and Capxul; the superagent and the experiments park

**Decided 25 November 2026** with Aaron, by voice, after he came back from two days on other work. It narrows K42: the
way goals work stays (a goal is a long-running agent, the lander brings work into `main`, plugins are built when an app
first needs them), but only two things are built now. K43's Capxul gets a new critical path.

## The problem

Read on 25 November 2026 from `main` (79ee7b3a) and every branch:

- **The work stalled at about 06:00 UTC.** Every goal branch was landed in `main` by the lander, the old goals are
  parked, and no Claude-led goal is running. Seventeen pull requests are open, most of them drafts.
- **Orthograph works inside the repository and not outside it.** A fresh app went from nothing to declared, generated,
  proved and running in about thirty minutes, with the generated CLI, SDK and MCP all answering. From npm it doesn't
  work: nothing is published; published the way the docs say, the packages would break (`workspace:` links, a `bin` that
  isn't in the tarball) and the preset would ship without its starter; a new app's install trips pnpm 11's minimum
  release age; the portal's screens need the HeroUI Pro licence to build; there is no command that creates an app and no
  getting-started page.
- **On-chain is plumbing.** Keys and signing, wallets, the chain adapter with its ABI codec, money and the follower are
  built; the relayer is built with three open bugs (#784). Above them, the Solidity output, the contract client, the
  vault and Aztec exist only as spikes, and the on-chain suite doesn't run on `main` (`ci.yml`, the `e2e-on-chain` job).
- **Capxul's work went into HR.** Company, people, holidays, attendance, expenses and recruitment are built with
  journeys; leave, appraisals and the ledger have red checks; payroll and the books beyond the ledger are only listed;
  against its catalogue of 485 record types, 28 are built. CI runs none of Capxul's journeys.

## Aaron's calls

Heard through speech to text and kept as heard; "Capsule" is Capxul.

1. **The alpha is the npm preview, TypeScript end to end, with the apps paused.** Asked "Is the alpha the npm preview,
   TypeScript end to end, with the apps paused?": "yes".
2. **The portal's screens wait.** Asked whether the alpha ships without them: "agreed". The portal's future (the
   licence, or finishing the new portal) is still to discuss.
3. **A command that creates an app is a must.** Asked whether it can wait: "no this is a mist" (a must).
4. **The chain basics are in the alpha.** Of keys and signing, wallets, the chain adapter, the codec and the follower,
   and the relayer: "these should be included".
5. **Capxul doesn't need the chain now.** "It's fine if the chain side is not there. What we should focus on is what
   else do we need to do that is similar to this stuff but can be done with where we are today."
6. **HR and payroll are on Capxul's critical path.** "I think HR is on the critical path ... it came from Payness which
   was an on-chain payroll tool ... the core offering is still ... payroll HR"; "Payroll is definitely on the critical
   path".
7. **Every money movement is ERPNext-shaped and double entry.** "All of the internals of capsules are ERPNext shaped
   ... on the accounting side of it as well everything should be double entry book keeps".
8. **Budgets stay on the path; their chain part can live outside the framework.** "Again on the critical path, but ...
   we can do the on chain side of it like deploying it outside of the framework".
9. **Two builds; the experiments park.** "We want to park all the experiments, we want to build orthograph and we want
   to build capsule. Those are two things that we actually need to build. Everything else is like secondary." Asked
   whether the superagent parks too, reversing K42's call 9: "yes".
10. **The order.** Asked whether the order is the books first, then HR's basics, then payroll: "go".

## The decision

### 1. Two goals build

- **Goal 20, the Orthograph alpha** (`design/goals/20-alpha.md`): the npm preview, TypeScript end to end, with the chain
  basics. It works on `main` by its own pull requests.
- **Goal 16, Capxul** (`design/goals/16-capxul.md`): K43's product, down the critical path in section 3. It works on
  `goal/capxul`, and the lander brings its green slices into `main`.

The lander (Goal 19) keeps running as it is (K42, section 8). Goal 17, the superagent, parks where it stands. Goal 18,
the framework goal, parks too: with two builds, each goal ranks its own slices and Aaron sets the order between them.
Its board stays, written by the sync on every push to `main`.

### 2. The alpha

The alpha is K28's preview: the framework on npm under `next`. Done when someone outside the repository installs it,
creates an app with one command, declares, generates, writes handlers, proves and runs it, and calls it through the
generated CLI, SDK and MCP. What it holds:

- **The TypeScript core:** the blueprint API, compiler, generators, projections, the Effect runtime, the Cloudflare host,
  prove, the CLI, logbook, lint, the portal's server and the preset.
- **The chain basics** (call 4): keys and signing, wallets, the chain adapter and its ABI codec, money, and the follower.
  The relayer ships once #784 is fixed, or marked experimental until then. The on-chain checks of these pieces run on
  `main` again.
- **A command that creates an app** (call 3): `ortho new <app>`, and `npm create orthograph` beside it.
- **No portal screens** (call 2): the portal's server and blueprint feed ship; a request for the screens says plainly
  that they aren't in this release.
- **Publishing that works:** a real version, published with pnpm so `workspace:` links and the `bin` are rewritten, the
  starter inside the preset, the preset's new workspace exempting Orthograph's own packages from pnpm's minimum release
  age, and a dry run that refuses each of those mistakes.
- **A getting-started page and help text** for every command and flag.
- **The framework fixes Capxul found that any TypeScript app hits:** #1018 (an unset optional field from a read by id),
  #1034 (the CLI can't take a list or a struct), #972 (a handler can't move a second record), #1001 (prove's clock can't
  step past about a week), #742 item 4 (things past D1's 100 columns), #759 and #971 (prove misses writes outside a step),
  and the starter's sign-in bugs #446 (an agent's key can mint a person's key) and #449 (API keys refused after ten calls
  a day).
- **One acceptance check** in CI: install from a registry, create an app, prove it.

Aaron runs the publish himself: it is outward-facing and needs his npm account.

### 3. Capxul's critical path

Off chain first (call 5), every money movement double entry in ERPNext's shapes (call 7):

1. **Capxul's journeys run in CI**, so its green is CI's word, not its goal's.
2. **The books, double entry:** the chart of accounts, fiscal years, cost centres, journal entries and the general
   ledger (their checks are #1017); then parties, payments, sales and purchase invoices, period closing, and the trial
   balance, profit and loss and balance sheet.
3. **HR's basics finished:** leave (its checks are #1026), timesheets and onboarding. What is built stays.
4. **Payroll:** salary components and structures, their assignment, payslips, the pay run and taxes, each pay run
   posting to the books.
5. **Money in and out posts to the books:** expense claims, Bridge deposits and transfers, as payments and ledger
   entries.
6. **Budgets:** the accounting side; the on-chain module is deployed outside the framework when it is wanted (call 8).
7. **Bridge for real:** the generated adapter mounted, Bridge's webhooks deciding KYC and KYB, real bank details.
8. **Later, with the chain:** each person's and each company's Safe, acting on it from the CLI, MCP and an agent, and
   getting paid on chain (Goal 16's slice 2).

Appraisals and recruitment are built or checked and stay. The CRM (slice 11), the network and incorporation help are
off the path.

### 4. The releases

- **The alpha** is the preview (section 2).
- **The beta** is the framework with every piece Capxul's books, HR and payroll pulled, extracted into Orthograph's
  packages and published, with Capxul running on it. K42 made it what the superagent proves; the superagent is parked
  (call 9), so this is the framework goal's call under Aaron's standing authority, and his word overrides it.
- **1.0** is the same for the rest of Capxul core: banking through Bridge, budgets, and the Safe, plus the release
  slices (M7.01 to M7.04, M7.06 and M7.13).

### 5. Parked, not deleted

Parked means the code stays in the repository untouched and its goal stops; nothing is deleted.

- **Goals:** 17 (the superagent) and 18 (the framework goal).
- **Packages:** `agents`, `portal-next`, `shell`, `theme` and `language-solidity`. The chain packages stay in the alpha.
- **Examples:** `superagent`, `work` and `budgets`.
- **The experiments:** the Solidity output and Foundry, the contract client, the vault's module as a framework piece, the
  Aztec club, pay by handle, workflows and agents as framework features, and the new portal.
- **Open pull requests** of the parked goals stay as drafts; the lander doesn't land them.

## What was not chosen

- **The superagent first** (K42, call 9). It would make the agent runtime, the sandbox and the launch the critical path
  before any of Capxul's books or payroll; Aaron isn't building the superagent now (call 9).
- **Full ERPNext compatibility first.** 485 record types is the catalogue, not the promise; the path takes what Capxul
  promises (call 7) and leaves the rest listed.
- **Getting paid on chain first** (K43, section 3). It needs the token adapter, the follower wired to `on:`, wide things
  and the pages before any HR or payroll; call 5 puts the chain later.
- **Dropping the parked code.** Deleting is permanent; parking keeps every option.

## Supersedes

- `AGENTS.md`: "The framework goal (Goal 18) always runs: it ranks what can run now, starts it and keeps the board." → "Two goals build (K44): the Orthograph alpha (Goal 20) and Capxul (Goal 16)."
- `AGENTS.md`: "An app goal (the superagent, Goal 17, first;" → "Capxul dogfoods the framework"
- `.agents/skills/conductor/SKILL.md`: "the superagent proves it; 1.0 is the framework as Capxul core proves it" → "Capxul's books, HR and payroll prove it; 1.0 is the framework as the rest of Capxul core proves it (K44)"
- `.agents/skills/github/SKILL.md`: "(what the superagent proves)" → "(what Capxul's books, HR and payroll prove, K44)"
- `tools/github/plan.mjs`: "Ships in the beta: the framework the superagent proves (K42)" → "Ships in the beta: the framework Capxul's books, HR and payroll prove (K44)"
- `design/goals/16-capxul.md`: "## The superagent goes first" → "## The critical path (K44)"
- `design/goals/17-superagent.md`: "release: beta           # K42: the beta is every framework piece the superagent proves" → "release: null           # parked by K44"
- `design/goals/18-framework.md`: "The apps (the superagent first, then Capxul)" → "The apps"
- `design/goals/map.md`: "superagent runs first (K42, section 3)" → "Capxul is the one app building now (K44)"
- `design/milestones.md`: "The superagent goes first," → "Two things are built now (K44): the Orthograph alpha and Capxul,"
- `design/milestones.md`: "from there: the beta is what the superagent proved, 1.0 what Capxul core proved." → "from there: the alpha is the npm preview, the beta what Capxul's books, HR and payroll proved, 1.0 the rest of Capxul core."
- `design/milestones.md`: "the superagent pulled, extracted and published, the superagent running on it (K42)" → "Capxul's books, HR and payroll pulled, extracted and published, Capxul running on it (K44)"
- `design/milestones.md`: "K42 and K43 replaced this order: the superagent goes first, then Capxul, starting with getting paid." → "K44 replaced this order: the Orthograph alpha and Capxul, starting with the books, HR and payroll."
- `design/handoff.md`: "the beta (the framework the superagent proves, K42)" → "the beta (the framework Capxul's books, HR and payroll prove, K44)"
- `design/handoff.md`: "the superagent goes first, then Capxul core." → "two builds now, the Orthograph alpha and Capxul (K44)."
- `docs/canon/status.md`: "| **Beta** (the framework the superagent proves, K42) |" → "| **Beta** (the framework Capxul's books, HR and payroll prove, K44) |"
- `docs/canon/status.md`: "the beta is what the superagent proves and 1.0 what Capxul core proves (K43)" → "the alpha is the npm preview, the beta what Capxul's books, HR and payroll prove, and 1.0 the rest of Capxul core (K44)"
- `.agents/skills/kanban/STATE.md`: "**Beta:** the framework with every piece the superagent pulled, extracted and published, the superagent running on it (K42)." → "**Beta:** the framework with every piece Capxul's books, HR and payroll pulled, extracted and published, Capxul running on it (K44)."
- `.agents/skills/kanban/STATE.md`: "Goal 17 (the superagent) goes first" → "Goal 20 (the Orthograph alpha) and Goal 16 (Capxul) build (K44)"

## What else it touches

- **Briefs:** Goal 20's is new. Goal 16's slices take section 3's order, with a new slice 12 (budgets, the accounting
  side) and slice 13 (Capxul's journeys in CI); its release label becomes `beta`. Goals 17 and 18 are set to `parked`
  with a K44 note. The goal map lists the three running goals.
- **Dated records:** K42 gains "Superseded by K44" beside its calls 9 and 11's beta, its section 1's goals and its
  section 6's beta; K43 beside its section 3's first feature.
- **The board:** its rows pulled by the superagent are re-sorted by Goal 20's slice 1, as the alpha or Capxul pulls them
  or into "Not yet needed".
- **The conductor skill** stays as Goal 18's loop, for when it resumes; a K44 note says it is parked.
