# K44: two builds, the Orthograph alpha and Capxul; the superagent and the experiments park

**Decided 25 November 2026** with Aaron, by voice, after he came back from two days on other work. It narrows K42: the
way goals work stays (a goal is a long-running agent, the framework goal always runs, the lander brings work into
`main`, plugins are built when an app first needs them), but only two things are built now. The framework goal builds
the first, and K43's Capxul gets a new critical path.

## The problem

Read on 25 November 2026 from `main` (79ee7b3a, then a8294d08) and every branch:

- **The Claude-led goals stopped; Amp's kept going.** Goal 18, the framework goal, last landed on 24 November (#907),
  and Goal 17's branch, `goal/superagent`, hasn't moved since midnight. Goal 16 (Capxul) and the lander, both run in
  Amp, kept landing: the lander's last merge into `main` was #1042 at 08:52 UTC on the 25th. The old goals K42 stopped
  are parked. Seventeen pull requests are open, most of them drafts.
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

(Superseded by K47, 26 November 2026: three goals build; Coworker is the third.)

- **Goal 18, the framework goal, builds the Orthograph alpha** (`design/goals/18-framework.md`, slices 4 to 12): the npm
  preview, TypeScript end to end, with the chain basics. It works on `main` by its own pull requests. It keeps every
  job K42 gave it (K42, call 4: "a lane that should just always be running"): the board, the loop that ranks what runs
  next, settling a collision between two goals (K42, section 3, case 2), and bringing grills to Aaron.
- **Goal 16, Capxul** (`design/goals/16-capxul.md`): K43's product, down the critical path in section 3. It works on
  `goal/capxul`, and the lander brings its green slices into `main`.

The lander (Goal 19) keeps running as it is (K42, section 8). Goal 17, the superagent, parks where it stands: its brief
is set to `parked` on `main`, and its 11 claims on the board are released. The sync reads a running goal's status from
its own branch; it now keeps a goal parked on `main` parked, whatever its branch says, so `goal/superagent` needn't
change.

**Who fixes a framework gap.** One rule, K42's (section 3): a gap belongs to the goal that claims it first, and that
goal fixes it in its own slice. Capxul keeps the gaps it has claimed (`lane:goal-16`) and builds each as its path meets
it. The framework goal fixes the unclaimed ones that any TypeScript app hits. A fix reaches the alpha when it lands on
`main`, whichever goal made it.

### 2. The alpha

The alpha is K28's preview: Gate M1 on `main` and the framework on npm under `next`. Gate M1 doesn't wait for the
portal's graphs (M1.50, `M1-50-after-cutover.md`), and those graphs are portal screens, which wait (call 2). This
decision adds that someone outside the repository installs it, creates an app with one command, declares, generates, writes
handlers, proves and runs it, and calls it through the generated CLI, SDK and MCP. What it holds:

- **The TypeScript core:** the blueprint API, compiler, generators, projections, the Effect runtime, the Cloudflare host,
  prove, the CLI, logbook, lint, the portal's server and the preset.
- **The chain basics** (call 4): keys and signing, wallets, the chain adapter and its ABI codec, money, and the follower.
  The relayer ships once #784 is fixed, or marked experimental until then. The on-chain checks of these pieces run on
  `main` again.
- **A command that creates an app** (call 3): `ortho new app <name>`, beside the existing `ortho new adapter`, and
  `npm create orthograph`.
- **No portal screens** (call 2): the portal's server and blueprint feed ship; a request for the screens says plainly
  that they aren't in this release.
- **Publishing that works:** a real version, published with pnpm so `workspace:` links and the `bin` are rewritten, the
  starter inside the preset, the preset's new workspace exempting Orthograph's own packages from pnpm's minimum release
  age, and a dry run that refuses each of those mistakes.
- **A getting-started page and help text** for every command and flag.
- **Framework fixes no goal has claimed** that any TypeScript app hits, the starter's sign-in bugs first: #446 (an
  agent's key can mint a person's key) and #449 (API keys refused after ten calls a day). Capxul's claimed gaps reach
  the alpha if they land on `main` before it ships (section 3).
- **One acceptance check** in CI: install from a registry, create an app, prove it, run it and call it through its
  generated CLI, SDK and MCP; then the same from npm.

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
8. **Later, with the chain** (Goal 16's slice 2): each person's and each company's Safe, acting on it from the CLI, MCP
   and an agent, and getting paid on chain.

**The framework gaps Capxul has claimed**, built as the path meets them (section 1's rule): #1034 (the generated CLI
can't pass a list or a struct; its checks and build are open as #1038 and #1041), #972 (a handler can't move a second
thing's state), #1001 (prove's clock can't step past seven days), #759 (prove doesn't check that a call writes only what
its operation declares), #971 (a handler's writes can happen outside their step's span), and #742's items, among them
item 4 (a thing with more fields than D1's 100 columns). #1001 and #972 come before payroll. #1018 is fixed (#1019,
#1023, #1029).

Appraisals and recruitment are built or checked and stay. The CRM (slice 11), the network and incorporation help are
off the path.

### 4. The releases

- **The alpha** is the preview (section 2).
- **The beta** is the framework with every piece Capxul's books, HR and payroll pulled, extracted into Orthograph's
  packages and published, with Capxul running on it. K42 made it what the superagent proves; the superagent is parked
  (call 9), so this is the building agent's call under Aaron's standing authority (`AGENTS.md`, "Who decides"), and his
  word overrides it. It keeps his call that the beta is the framework, which the apps dogfood (K42, call 11).
- **1.0** is the same for the rest of Capxul core: banking through Bridge, budgets, and the Safe, plus the release
  slices (M7.01 to M7.04, M7.06 and M7.13).

### 5. Parked, not deleted

Parked means the code stays in the repository untouched and its goal stops; nothing is deleted.

- **Goals:** 17 (the superagent).
- **Packages:** `agents`, `portal-next`, `shell`, `theme` and `language-solidity`. The chain packages stay in the alpha.
- **Examples:** `superagent`, `work` and `budgets`.
- **The experiments:** the Solidity output and Foundry, the contract client, the vault's module as a framework piece, the
  Aztec club, pay by handle, workflows and agents as framework features, and the new portal.
- **Open pull requests** of the parked goals stay open as they are, and nobody merges them (Superseded by K47, 26 November 2026, for #781 and #905: Coworker's goal lands the agent runtime and the outbox from them, in pieces); the lander doesn't land
  them. One is ready rather than a draft: #957, into `goal/superagent`.

## What was not chosen

- **The superagent first** (K42, call 9). It would make the agent runtime, the sandbox and the launch the critical path
  before any of Capxul's books or payroll; Aaron isn't building the superagent now (call 9).
- **Full ERPNext compatibility first.** 485 record types is the catalogue, not the promise; the path takes what Capxul
  promises (call 7) and leaves the rest listed.
- **A new goal for the alpha, with the framework goal parked.** An earlier draft of this decision did that. It left the
  framework goal's jobs (collisions, grills, the board) with no owner, and it reversed Aaron's K42 call 4 with no word
  from him. The framework goal builds the alpha instead.
- **Getting paid on chain first** (K43, section 3). It needs the token adapter, the follower wired to `on:`, wide things
  and the pages before any HR or payroll; call 5 puts the chain later.
- **Dropping the parked code.** Deleting is permanent; parking keeps every option.

## Supersedes

- `AGENTS.md`: "The framework goal (Goal 18) always runs: it ranks what can run now, starts it and keeps the board." → "Two goals build (K44): the framework goal (Goal 18), which builds the Orthograph alpha, and Capxul (Goal 16). The framework goal always runs"
- `AGENTS.md`: "An app goal (the superagent, Goal 17, first;" → "Capxul dogfoods the framework"
- `.agents/skills/conductor/SKILL.md`: "the superagent proves it; 1.0 is the framework as Capxul core proves it" → "Capxul's books, HR and payroll prove it; 1.0 is the framework as the rest of Capxul core proves it (K44)"
- `.agents/skills/github/SKILL.md`: "(what the superagent proves)" → "(what Capxul's books, HR and payroll prove, K44)"
- `tools/github/plan.mjs`: "Ships in the beta: the framework the superagent proves (K42)" → "Ships in the beta: the framework Capxul's books, HR and payroll prove (K44)"
- `design/goals/16-capxul.md`: "## The superagent goes first" → "## The critical path (K44)"
- `design/goals/17-superagent.md`: "release: beta           # K42: the beta is every framework piece the superagent proves" → "release: null           # parked by K44"
- `design/goals/18-framework.md`: "The apps (the superagent first, then Capxul)" → "Capxul"
- `design/goals/18-framework.md`: "built first because it then helps build Capxul" → "the alpha is slices 4 to 12"
- `design/goals/18-framework.md`: "the beta proved by the superagent" → "the alpha, then the beta Capxul's books, HR and payroll prove"
- `design/goals/16-capxul.md`: "The first feature: one person gets paid" → "The Safe and getting paid on chain, later with the chain"
- `design/decisions/K43-capxul-core.md`: "The first feature stays Goal 16's" → "Capxul's critical path starts with the books (K44, section 3)"
- `design/goals/map.md`: "superagent runs first (K42, section 3)" → "Capxul is the one app building now (K44)"
- `design/milestones.md`: "The superagent goes first," → "Two things are built now (K44): the Orthograph alpha and Capxul,"
- `design/milestones.md`: "from there: the beta is what the superagent proved, 1.0 what Capxul core proved." → "from there: the alpha is the npm preview, the beta what Capxul's books, HR and payroll proved, 1.0 the rest of Capxul core."
- `design/milestones.md`: "the superagent pulled, extracted and published, the superagent running on it (K42)" → "Capxul's books, HR and payroll pulled, extracted and published, Capxul running on it (K44)"
- `design/milestones.md`: "K42 and K43 replaced this order: the superagent goes first, then Capxul, starting with getting paid." → "K44 replaced this order: the Orthograph alpha and Capxul, starting with the books, HR and payroll."
- `design/handoff.md`: "the beta (the framework the superagent proves, K42)" → "the beta (the framework Capxul's books, HR and payroll prove, K44)"
- `design/handoff.md`: "the superagent goes first, then Capxul core." → "two builds now, the Orthograph alpha and Capxul (K44)."
- `design/handoff.md`: "The superagent's next slice is the critical path (K42)." → "Two builds are the critical path (K44)"
- `design/milestones.md`: "Since K42 the critical path is the superagent's next slice" → "Since K44 the critical path is the Orthograph alpha and Capxul's next feature"
- `design/milestones.md`: "`npm create orthograph` is M2.09, the beta" → "`npm create orthograph` is M2.09's create-app part, which K44 puts in the alpha"
- `.agents/skills/conductor/SKILL.md`: "it is on the superagent's next slice, then on Capxul's next feature" → "it is the alpha's next slice, or on Capxul's next feature"
- `.agents/skills/github/SKILL.md`: "never deletes anything" → "never deletes an issue, label or milestone"
- `design/handoff.md`: "superagent proved, 1.0 what Capxul core proved." → "preview, the beta what Capxul's books, HR and payroll prove, 1.0 what the rest of Capxul core proves."
- `design/milestones.md`: "then Capxul's first feature running on Orthograph." → "then Capxul's books, HR and payroll running on Orthograph (K44)."
- `design/milestones.md`: "Capxul's first feature runs in its staging." → "Capxul's books, HR and payroll run in its staging (K44)."
- `design/milestones.md`: "Capxul's first feature on Orthograph, in its staging: one person gets paid" → "Capxul's first features on Orthograph, in its staging: the books, HR and payroll (K44, section 3)"
- `tools/github/board.mjs`: "Capxul's first milestone" → "Capxul's milestone for getting paid, later with the chain (K44)"
- `docs/canon/status.md`: "| **Beta** (the framework the superagent proves, K42) |" → "| **Beta** (the framework Capxul's books, HR and payroll prove, K44) |"
- `docs/canon/status.md`: "the beta is what the superagent proves and 1.0 what Capxul core proves (K43)" → "the alpha is the npm preview, the beta what Capxul's books, HR and payroll prove, and 1.0 the rest of Capxul core (K44)"
- `.agents/skills/kanban/STATE.md`: "**Beta:** the framework with every piece the superagent pulled, extracted and published, the superagent running on it (K42)." → "**Beta:** the framework with every piece Capxul's books, HR and payroll pulled, extracted and published, Capxul running on it (K44)."

## What else it touches

- **Briefs:** Goal 18's gains the alpha as slices 4 to 12, and its loop ranks the alpha and Capxul's next feature.
  Goal 16's slices take section 3's order, with a new slice 12 (budgets, the accounting side) and slice 13 (Capxul's
  journeys in CI); its release label becomes `beta`. Goal 17's is set to `parked` on `main` with a K44 note. The goal
  map lists the three goals that build or land.
- **Labels, by hand at merge:** the sync sets a release label only when it makes an issue, and a slice's label is its
  goal's. So, by hand: Goal 16's goal issue (#426) and its slices for the beta (1, 3 to 9) move from `release:1.0` to
  `release:beta`; its slices 2, 10 and 12 (the Safe and getting paid, Bridge, budgets) carry `release:1.0`, the new
  slice 12 included; slice 11, the CRM, keeps `release:1.0` until it is scheduled, since the Project shows an issue
  with no release label at its goal's release, `beta`. Goal 18's existing issues (#718 to #721) move from
  `release:1.0` to `release:preview`, and Goal 17's lose `release:beta`.
- **The board's links:** the sync now removes a "blocked by" link between two of a goal's slices that its brief no
  longer gives, before it adds any, so Goal 16's reordered slices leave no stale link (#713 blocked by #428) and no
  cycle. Links to snags, asks and other goals' slices stay.
- **Parked goals' pages:** the sync now keeps a goal parked on `main` parked, whatever its branch says. Besides Goal
  17, that shows Goals 5, 9 and 15 as parked on GitHub (#309, #356, #416), as their briefs on `main` already say, and
  writes Goals 10 and 11's pages (#373, #386) from `main`'s newer "Where it stands".
- **Goal 17's claims:** its 11 rows on the board are set to `none`, so the issues lose `lane:goal-17`.
- **Dated records:** K42 gains "Superseded by K44" beside its call 9, its section 1's goals, its section 3's "the
  superagent runs first", its section 4's second rank and its section 6's beta; K43 beside its section 3's first
  feature; `M7-capxul.md` beside its section 4; K33 beside "never deletes".
- **The board:** Goal 18's slice 4 re-sorts it: the rows the superagent pulled go to the alpha, to Capxul or to "Not yet
  needed", the chain basics to the alpha, and `board.mjs`'s release rule, pulled-by list and app milestones, and
  `roadmap.mjs`'s ranking, follow section 4. Until then the board's release rule is K42's, and a K44 note says so.
