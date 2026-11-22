# M7-capxul: Capxul's plugins mapped

**Decided 22 November 2026 by Goal 16's lead** (Claude Code, claude-opus-5-5), slice M7.10, under AGENTS.md "Who
decides". It sorts every part of Capxul into one of three bins, in K30's words (`K30-the-model-and-the-map.md:11-14`):

- **Orthograph has it**: in the core or the standard library, built on `goal/stage-1` or planned by a named goal slice.
- **Orthograph must build it**: a gap no goal owns yet, or a gap a goal owns and Capxul needs sooner. Each one is an
  Ask issue to the owner, or a line for `design/later.md` when nobody owns it.
- **Capxul's own**: K30's "ours". It lives in Capxul's repository, mounted from its blueprint, and is extracted into
  the standard library only when a second app needs it (K30, "extract"; Aaron's rule: build it once, use it, then
  extract it).

A fourth bin, **drops out**, is Capxul's development machinery that Orthograph already does for every app.

It then settles what Capxul's first feature is, and what it waits on (section 4), which the slice M7.11 builds.

## What was read

| Source | Where | At |
|---|---|---|
| Capxul Next, the rebuild's starting point (K30: "the one repository Capxul already has") | `AaronAbuUsama/capxul-next`, read from a scratch clone; never written to | `07eb6796`, its `master`, 16 November 2026 |
| Capxul classic, the product people use today (front end only; its back end is the hosted `@capxul/sdk` at `4.20.0-beta.42`) | `Xelmar-tech/Capxul`, branch `dev`, a scratch clone | `0fbbdac`, 10 November 2026 |
| The Capxul calls of 20 November and the board | `design/history/artifacts-2026-11-21/capxul-next.data.json`; memory of the same calls | `main` |
| Foreman's test drive on Capxul's first slice | `design/foreman/test-drive-capxul.md` | `main` |
| Orthograph as built | `goal/stage-1` | `eb3ff614` |
| Orthograph as planned | `design/goals/*.md`, `design/goals/map.md`, `design/milestones.md`, `design/later.md` | `main` `af24252a` |

Cites below are `next:` for Capxul Next (from its root; `bp:` is short for `next:packages/blueprint/src/things/`),
`classic:` for Capxul classic, `s1:` for `goal/stage-1` and `main:` for `main`.

## 1. The problem, in code

Capxul has its own blueprint, in its own format, read by its own generator. Nothing of it runs on Orthograph:

```ts
// next:packages/core/src/handlers.ts:21-31 — Capxul's own registry, one file per domain
export const WorldHandlers = WorldRpcs.toLayer({
  ...Organizations.world, ...People.world, ...Board.world, ...Budgets.world,
  ...Documents.world, ...Approvals.world, ...Reports.world, ...World.world, ...Record.world,
});
```

Its money is a decimal string in one asset, which Orthograph's values can't say yet (`s1:packages/orthograph/src/modules/values/types.ts:32-48`
has `uint(bits)`, `text`, `email`, `id`, `refAny` and a raw schema):

```ts
// next:packages/blueprint/src/common/values.ts:78-80
export const Asset = Schema.Literals(["USDC"]);
/** An amount as a decimal string with at most 6 places, so that no amount is ever a binary fraction. */
export const Amount = pattern(/^(0|[1-9]\d*)(\.\d{1,6})?$/);
```

If nobody sorts Capxul's parts, each gets written twice, once as a standard plugin for Plugged In's stages and once
inside Capxul (K30, section 2), and Capxul's first feature waits on goals it doesn't need.

## 2. The map

Each row is one Capxul plugin: a feature an app mounts. "Next" and "classic" say where Capxul has it today.

### Features

| Capxul plugin | What it does | Next | Classic | Bin | Where it comes from in Orthograph |
|---|---|---|---|---|---|
| **Keys** (the signer) | a key that signs, from the person's own wallet, a passkey vault, or Openfort | cast of test keys; sign-in "not designed yet" (`next:packages/blueprint/src/protocol/sign-in.ts:1-4`) | Openfort embedded wallet (`classic:.env.example`, `OPENFORT_PUBLISHABLE_KEY`) | **has it**: the wallets feature, with browser, node, server and world signers (`s1:packages/wallets/README.md:3-20`, M1.29 ✅). The Openfort filler is **Capxul's own** (one vendor, one app); a passkey vault **must be built**, later | Goal 3 (built) |
| **Sign-in** | a person signs in, by email code today, by wallet later | none | email code through Brevo, then onboarding (`classic:apps/web/modules/auth/`) | **has it**: Better Auth in the host today (`s1:packages/host-cloudflare/src/modules/auth/README.md:1-8`), `@orthograph/auth` (M2.05, M2.06), wallet linking by SIWE (M2.13). **Must build**: SIWE for a Safe, which signs by ERC-1271; the spike proved ordinary keys only (`main:design/ledger.md`, AUT-23) | Goal 3 |
| **Accounts** | every account is a Safe, personal or company; personal ones are ordinary deployed Safes (Aaron, 20 November) | personal Safe from a hash of the email (`next:packages/contracts/src/companies-house/CompaniesHouseClaimer.sol:41-57`) | Openfort wallet for a person, a Safe for an organisation | **Capxul's own** thing (an `account` with planned, deployed, claimed), thin over the **`safe` adapter**, which Orthograph has planned (ST3.04) | Goal 13, ST3.04 |
| **Party** | a person or business Capxul's user deals with: a client, a supplier, a payee | Frappe CRM (`next:packages/frappe-app/capxul/features.py:22-37`) | contacts and address book (`classic:apps/web/modules/dashboard/components/shared/contacts`) | **Capxul's own** | none needed |
| **Invoice** (and payment request) | raise an invoice that carries a pay link; anyone pays it from any wallet, with no sign-in | a Frappe document (`bp:document/verbs/create.ts:12-25`) | invoices, requests and public checkout (`classic:apps/web/app/checkout/`) | **Capxul's own**. Line items are a second thing with the invoice's id, which works today | `Blueprint.anyone` for the pay link (`s1:packages/orthograph/src/modules/roles/types.ts:29-36`) |
| **Payment** | money leaving an account for a party; settled only by the chain | `doc.submit` holds a Safe payment, then `Budgets.spend` and `PaymentSent` (`next:packages/core/src/approvals/payments.ts:3-6`) | send money, withdraw (`classic:…/components/shared/send-money`) | **Capxul's own** thing, on the standard library's **`erc20` adapter** (ST2.02), the **chain follower** (M6.09) and **events in** (`on:`, M5.03) | Goals 12, 4, 11 |
| **Ledger entry** (the books) | double entry: debits equal credits; a posted entry never changes | ERPNext's books, through Frappe (`next:packages/frappe-app/README.md:3-5`) | none | **Capxul's own**. It needs money as a value: **must build** (section 3) | — |
| **Approval** | the one place a signature an operation asked for is handed over; the last one sends | `approval.sign` (`bp:approval/verbs/sign.ts:30-47`) | `/approve/<id>` from the CLI (`classic:apps/web/app/approve/`) | **Capxul's own**, as K30 said (`K30-the-model-and-the-map.md:168-170`), built on the standard library's owners' signatures as a workflow (ST3.06) | Goal 13, ST3.06 |
| **Budget** | spend control that binds people, on chain | `Budgets.sol`, a hat per budget (`bp:budget/verbs/create.ts:25-61`) | budgets as permissions given to members | **has it, planned**: `@orthograph/budgets` (ST3.05). Capxul's monthly, quarterly and yearly periods and "a child fits inside its parent" are its choices of the feature (`next:docs/decisions.md:78`) | Goal 13, ST3.05 |
| **Company and Seat** (members, Directors, invitations) | a company, the people in it, and how they came in | company, member, invitation, board, director (`bp:company/`, `bp:invitation/lifecycle.ts:23-49`) | recipients and members, organisation settings | **has it, planned**: `@orthograph/organizations` (M2.07), adopted under Capxul's word "company" (K22: M2.19, M2.20), with a Director as a `holds` role (K20: M2.17, M2.18). Below it, **Capxul's own** rules, listed in section 2.1 | Goal 3 |
| **Permissions** | officer hats: manage-books, issue-invoices, manage-people | `next:packages/blueprint/src/common/values.ts:92-102` | none | **Capxul's own**, on the standard library's **`hats` adapter** (ST3.04) | Goal 13 |
| **Pay run** (payroll) | many payments at once, now or on a schedule | Frappe HRMS | payroll groups, pay now, schedule (`classic:…/components/organization/payroll`) | **Capxul's own**, later. A scheduled run needs workflows (Goal 8) and moves made by time (Goal 9) | Goals 8, 9 |
| **Handle and network** | a handle, a profile, and a shared network where members find and message each other | none | none | handles: **has it, planned** (`@orthograph/handles`, ST1.03). The network is **Capxul's own**: a second Orthograph app Capxul runs, reached through an adapter (the board, "Network adapter") | Goal 3 |
| **Agents** | an agent that spends only what its role allows | `AgentOwner.sol`, not deployed (`next:packages/contracts/src/agents/AgentOwner.sol:70-88`) | none | **has it, planned**: agents (Goal 10, M4.01 to M4.10) and an agent under its own hat (ST3.07) | Goals 10, 13 |
| **Withdrawals to a bank** | money out to a bank or mobile money | Bridge, strategy only (`next:docs/roadmap.md:63`) | destinations and withdrawals in the SDK | **Capxul's own**, later, with a Bridge adapter Capxul writes | — |
| **Reports and history** | trial balance, aged invoices, receipts, exports | `report.run` on ERPNext (`bp:report/verbs/run.ts:12-25`) | transactions and receipts | **must build**: views (M5.05) and reports are off the 1.0 path; until then Frappe's desk keeps them (Aaron, 20 November: "Frappe's screens keep working first") | nobody |
| **Equity** (cap table, share classes, options, rounds, vesting, escrow) | | contracts deployed on the seeded chain, used by no operation (`next:packages/contracts/deployments/devnet.json`); parked (`next:docs/grounding.md:50`) | none | **Capxul's own**, parked | — |
| **Feature access** | switches per feature | Frappe's switches (`next:packages/frappe-app/capxul/features.py`) | 37 flags, all on (`classic:packages/feature-access/src/constants/feature-access.ts`) | **drops out**: in Orthograph a mount is the switch. Limiting a mount to one environment **must be built** (test drive, finding 10) | nobody |
| **Support** | send a support ticket | none | Convex and Mattermost (`classic:apps/web/app/api/support-ticket/route.ts`) | **Capxul's own**, later | — |

#### 2.1 Capxul's own rules, kept above the standard plugins

These are Capxul's business, not the framework's, and stay in Capxul's blueprint and handlers:

- Only the founder invites (`next:docs/decisions.md:41`; `bp:invitation/verbs/send.ts:44-45`).
- The founder governs the Board: adding a Director and setting the threshold are the founder's acts (`next:docs/decisions.md:40`).
- A threshold is at most the founding Directors (`bp:company/verbs/create.ts:34-38`); a grant or a budget needs that many Directors' approvals.
- Founding is one step, with its Directors named and its opening capital moved and booked (`next:docs/decisions.md:75,77`).
- A personal account is found from a hash of the email, never the email itself (`next:docs/decisions.md:39`).
- Every payment settles exactly one sealed document, whose hash it carries (`next:docs/decisions.md:38`).
- A Director must hold a claimed account (`bp:company/refusals.ts:18,70`).
- No streaming pay (`next:docs/decisions.md:42`).

### Adapters and outside services

| Capxul uses | For | Bin | Where it comes from |
|---|---|---|---|
| Safe (with its 4337 module and factory) | every account | **has it, planned**: the `safe` adapter (ST3.04) | Goal 13 |
| Hats and Hats Signer Gate | Directors, officer hats, signer seats | **has it, planned**: the `hats` adapter (ST3.04) | Goal 13 |
| Zodiac Roles | Companies House's roles; Budgets pays through it (`next:packages/core/src/chain/abi.ts:7`) | **Capxul's own** adapter, from its ABI (ST2.02's `--from-abi`), unless the budgets feature (ST3.02) picks it | Goal 12's tool |
| USDC (ERC-20) | the only asset | **has it, planned**: the `erc20` adapter (ST2.02) | Goal 12 |
| A relayer, a bundler and a paymaster | gas, in the hosted version (Aaron, 20 November) | **has it, planned**: the relayer (M6.07). A 4337 bundler and paymaster are **Capxul's own**, if it keeps them | Goal 4 |
| The chain's events into the app | a payment settles only from the chain | **has it, planned**: the follower (M6.09) and `on:` (M5.03) | Goals 4, 11 |
| Openfort | a key for people who have none | **Capxul's own**, a hosted filler of the keys socket | — |
| Frappe, ERPNext, HRMS, Frappe CRM, and the site service | books, HR, CRM; the business site | **Capxul's own**, as K30 said of the bench; Frappe's doctype files read as a source through an adapter (`K3-stores-and-sources.md`) | — |
| Email (Brevo in classic; none in Next) | sign-in codes, invitations | **must build**: a mail adapter with a local sink. Resend (M5.09) is off the 1.0 path | nobody |
| Bridge | bank rails | **Capxul's own**, later | — |
| Price feeds | currency rates | **Capxul's own**, later; Next fixes the currency today (`next:packages/frappe-app/capxul/setup.py:191-195`) | — |
| PostHog | product analytics (Aaron, 20 November) | **Capxul's own** adapter | — |
| Axiom | telemetry | **has it**: telemetry falls out, and monitors go to the sink (M7.14) | Goals 3, 15 |
| Ponder, Neon, Alchemy, AWS EC2 and SSM, Cloudflare | indexing, a database branch per world, infrastructure, the bench host | **drops out** for the app (the follower, the stores, `ortho env up`); the bench host stays **Capxul's own** | Goals 3, 4 |

### Development machinery: drops out

world, site, snapshot, cluster, clock, check, run, journey, ratchet, starting point, and `record.export`
(`next:docs/roadmap.md:52-63` lists them as the pipeline). Orthograph does each for every app: worlds, starting worlds,
journeys, the ratchets, the logbook, and the world's clock (Goal 9). Capxul's "starting point" is Orthograph's
"starting world"; Orthograph's word wins, since Capxul moves onto it.

## 3. What Orthograph must grow for Capxul

Each gap, and who acts. The first feature (section 4) needs none of the unowned ones.

| Gap | Capxul needs it for | Owner | Action |
|---|---|---|---|
| Money as a value: signed or fixed-point, knowing its token and decimals, the same in Effect and Solidity (THI-07) | Invoice, Payment, Ledger entry, Budget | nobody: `main:design/later.md:46-48`, "waits for a design pass" | for the conductor. Capxul's floor until then: its own `Amount`, a raw schema value as Next has it, and a ledger line with a debit and a credit, both never negative |
| SIWE for a Safe (ERC-1271) | signing in with a Safe account | Goal 3, M2.13 | asked by #486 |
| A mail adapter with a local sink | sign-in codes, invitations | nobody (M5.09 is Resend, off the 1.0 path) | for the conductor |
| Views, richer lists (ranges, sort by field, totals) and reports | trial balance, aged invoices, activity | nobody (M5.05 off the 1.0 path; reports not planned) | for the conductor; Frappe's desk carries them meanwhile |
| A repeat that changes nothing, and idempotency by intent (K21) | founding sent twice is resumed; one send per approval | nobody (M3.24 to M3.26 off the 1.0 path) | for the conductor; Capxul's handlers refuse a second send meanwhile |
| A mount limited to one environment | switches, and a stand-in mounted only in development | nobody (test drive, finding 10) | for the conductor |
| Roles across things (`holds`, K20) and adopting a mounted thing (K22) | Director and member roles; "company" for the organisations plugin | Goal 3, M2.17 to M2.20 | planned; nothing to ask |

Already closed since the test drive: uniqueness over two fields is built, `Blueprint.invariant.unique` with a tuple
(ST1.14 ✅), so its finding 4 no longer holds.

## 4. Capxul's first feature, for M7.11

**The call: one person gets paid.** It is Aaron's of 20 November ("build first: one person getting paid"), cut to its
floor:

1. A person runs Capxul and brings their own key. Their personal account is an ordinary Safe owned by that key.
2. They add a client as a party.
3. They raise an invoice, which carries a pay link.
4. The client opens the link and pays it from any wallet, without signing in. The token lands in the account.
5. The transfer on chain settles the invoice. Nothing else can.
6. A ledger entry is posted.

Paying a supplier from the account (the board's step 7) is Capxul's second feature: it needs the Safe to execute a
transaction, which the first does not. Companies, seats, budgets and approvals come after both.

The journeys, for the author who is not the builder: pay an invoice by its link and see it settled; a second transfer
for a settled invoice changes nothing; an invoice can't be marked paid by any call, only by the chain; a stranger can
read an invoice by its link but not the person's other invoices; the ledger balances after each payment.

**What it waits on**, narrowed from "stage 3" in the brief, which said more than the feature needs:

| Needs | What | Owner | Status, 22 November |
|---|---|---|---|
| M7.10 | this map | Goal 16 | this pull request |
| M7.05 | signed verdicts from CI, so the staging run is a verdict | Goal 15 | asked by #444; taken |
| ST2.02 | the `erc20` adapter: typed `transfer` and `Transfer` | Goal 12 | ready; asked early by #485 |
| ST3.04 | the `safe` adapter, reading a Safe's owners; Capxul also needs it to give a one-owner Safe's address before it is deployed, and to deploy it | Goal 13 | ready; asked by #484 |
| M6.09 | the chain follower | Goal 4 | asked early by Goal 12 (#475); Goal 16 added to it |
| M5.03 | events in: `on:` for an adapter's events, idempotent by event id | Goal 11 | asked early by Goal 12 (#477); Goal 16 added to it |
| M1.51, M7.03, M7.04 | Orthograph from npm, and an environment brought up and destroyed, so Capxul's own repository can stand up its staging | Goal 3 | on Goal 3's path |

It does not wait on budgets, hats, owners' signatures, organisations, roles across things, workflows or money as a
value. It is built in `capxul-next`, Capxul's own repository (K30, section 2), consuming Orthograph from npm as any
app would, once Capxul's own goal there starts. Its record lands here early, per K38 ("a slice built outside this
repository").

## 5. Open, for the conductor

- **Does Capxul gate 1.0?** K30 says Capxul "never gates 1.0" (`K30-the-model-and-the-map.md:164-167`); Gate M7 needs
  M7.10 and M7.11 (`main:design/milestones.md`, M7.12; `main:design/goals/15-release.md:70`). One has to give way. This
  goal doesn't own either; it builds M7.11 either way.
- **K38's issue numbers are swapped.** K38 names the asks "(#443 and #444)" for M7.05 and M8.09 in that order
  (`main:design/decisions/K38-early-landing.md:58`); on GitHub #444 is M7.05 and #443 is M8.09.
- **The classic back end was not read.** Classic's features run on the hosted `@capxul/sdk`, built in a separate
  "infrastructure" repository (`classic:docs/campaigns/sdk-headless-migration.md:29-35`). The map takes classic's
  features from its screens and flags; the SDK's own rules weren't checked.

## Supersedes

Nothing. Test drive call 3 ("Capxul's own code first, extracted when a second app needs it") was made while the
organisations plugin existed only on paper. It still holds until M2.07 lands; Capxul's companies come after its first
two features, by which time Capxul mounts `@orthograph/organizations` as its second real user.
