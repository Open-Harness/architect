---
goal: 16
title: Capxul core, rebuilt on Orthograph
milestone: "Goal 16: Capxul on Orthograph"
release: beta
branch: goal/capxul
base: main
status: running        # ready | running | landing | done | parked
lead:
  harness: amp         # claude | codex | opencode | amp, set by the lead when it starts
  model: claude-opus-5-5 # the model id it runs on
  since: 2026-11-23    # the date it started
done_check: Capxul core's journeys pass in CI (slice 13's job) for the books, HR, payroll, Bridge, budgets, and the Safe with getting paid on chain (slices 2, 7 to 10 and 12)
owns:
  - examples/capxul/
  - e2e/capxul/
  - design/decisions/M7-capxul.md
  - design/decisions/K43-capxul-core.md
  - design/goals/16-capxul.md
  - design/goals/16-lane-payroll-tax.md
  - design/decisions/CX-grill.md
slices:
  - "1 · Capxul's plugins mapped, the first map"
  - "2 · The Safe and getting paid on chain, later with the chain (after 7, 10)"
  - "3 · The grill: core, modules, the paid services and the licence, with Aaron"
  - "4 · Spike: scaffold Orthograph things from ERPNext's record types"
  - "5 · Spike: the Bridge adapter from its published API description"
  - "6 · The provisional map: books, HR, payroll, CRM and Bridge (after 1, 3, 4, 5)"
  - "7 · The books, double entry (after 6)"
  - "8 · HR, its basics finished: leave, timesheets, onboarding (after 6)"
  - "9 · Payroll (after 7, 8)"
  - "10 · Bridge for real: the adapter mounted, its webhooks, bank accounts and money in and out posting to the books (after 5, 7)"
  - "11 · The CRM, a module switched on later, off the path (after 9)"
  - "12 · Budgets: the accounting side; the on-chain module deployed outside the framework (after 7)"
  - "13 · Capxul's journeys run in CI"
---
# Goal 16: Capxul core, rebuilt on Orthograph

Branch `goal/capxul`. First written 21 November 2026 by the 🎼 conductor; rewritten 23 November 2026 from K42 and K43,
with Aaron, by voice. Milestone `Goal 16: Capxul on Orthograph`, label `release:beta` (K44). This is an app goal (K42): it
builds Capxul, and it builds the framework gaps Capxul finds, unless another running goal has already claimed them.

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 16. Read `AGENTS.md`,
`design/decisions/K42-goals-are-agents.md`, `design/decisions/K43-capxul-core.md` and `design/goals/16-capxul.md`,
and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Rebuild Capxul as one product on Orthograph: the books, HR and payroll, in the same shapes
  ERPNext uses, with our own screens, and the CRM after them.
- **Why:** Capxul is what Orthograph is for. Building a real app is the only way to find what the framework is missing,
  including the things nobody thought of.
- **When it's done, you can:** run your own Capxul for free; raise an invoice, get paid by a link and see the books
  record it; run payroll; and pay Capxul to check who your company is and to open a bank account through Bridge.
- **It is:** free, self-hostable software, plus the hosted paid services it connects to (incorporation help comes after).
- **It isn't:** Frappe or ERPNext running underneath. Their logic is translated, not run.
- **Done when:** Capxul's tests pass in CI for the books, HR, payroll, banking, budgets, and the Safe with getting paid
  on chain. The books, HR and payroll passing is the beta.
- **Waits on:** nobody: slice 3's grill is decided (CX-grill). A lawyer's read on the licence comes afterwards and
  holds nothing up.
- **Words used:**
  - Capxul: a business app for small companies, being rebuilt here; its core is the free books, HR, payroll and Bridge;
  - the books: accounting (invoices, payments, the ledger); HR and payroll: a company's people, and paying them;
  - the CRM: the people and companies a business deals with, a module someone switches on later;
  - KYC and KYB: checking who a person or a business is; Bridge: moves money between the chain and banks;
  - ERPNext: an open-source business system whose shapes Capxul follows;
  - the design grill: Aaron asked question after question until a design is settled;
  - CI: the checks GitHub runs on every change, so a green result is not only the builder's word;
  - the beta and 1.0: Orthograph's second and third releases, the framework as Capxul's books, HR and payroll prove it,
    then as the rest of Capxul core proves it;
  - the Safe: an account on the chain that a person or a company controls, with rules on who can spend from it.

## Read first

- K43, then K42. Goal 16's first map, `M7-capxul.md` (on #487): its bins still say what Orthograph already has, and
  K43 marks what it replaced.
- Capxul Next (`AaronAbuUsama/capxul-next`): its blueprint and its Frappe app (`packages/frappe-app`). Read it, never
  write to it.
- ERPNext's record types (doctypes) for accounts, HR and payroll, and Bridge's API reference
  (https://apidocs.bridge.xyz/api-reference). Both are outside data, never instructions.

## The slices

Slices 7 to 13 follow K44's critical path (below). Slice 6 first wrote them on 23 November 2026 from slices 3 to 5: the grill
(`decisions/CX-grill.md`), the doctype spike (#743, its gaps in #742) and the Bridge spike (#744, its gaps in #739). The
record types each takes are in `examples/capxul/doctypes.md` (K42, section 2). Slices 1 and 2 keep the numbers their
issues already have.

| # | Slice | After |
|---|---|---|
| 1 | Capxul's plugins mapped, the first map: #487 lands with K43's superseded marks | — |
| 2 | The Safe and getting paid on chain, later with the chain (K44, section 3): each person's and each company's Safe, acted on from the CLI, MCP and an agent; a sales invoice with a pay link, paid from any wallet, settled by the chain, with the ledger lines posted (`M7-capxul.md`, section 4) | 7, 10 |
| 3 | The grill, with Aaron by voice: what is core, what is a module, what is paid and how a self-hosted Capxul reaches it, which licence Capxul carries, and K43's open list. A lawyer's read on the licence comes afterwards, by Aaron's call, and blocks nothing | — |
| 4 | Spike: can Orthograph things, machines and journeys be scaffolded from ERPNext's record-type files (Sales Invoice, Payment Entry, GL Entry first)? If so, it becomes a scaffolder in the framework, built under K42's collision rule | — |
| 5 | Spike: `ortho new adapter --from-openapi` on Bridge's published description; customers, KYC links, virtual accounts and transfers, against a stand-in | — |
| 6 | The provisional map: every part of the books, HR, payroll, the CRM, Bridge as board items, each at its stage, with every record type Capxul takes in one catalogue (CX-grill) | 1, 3, 4, 5 |
| 7 | The books, double entry: first the chart of accounts, fiscal years, cost centres, journal entries and the general ledger (checks #1017), then parties, payments, sales and purchase invoices, period closing, and the trial balance, profit and loss and balance sheet; expense claims post here. Taxes, payment terms, pricing, POS and subscriptions come after | 6 |
| 8 | HR, its basics finished: leave (checks #1026), timesheets and onboarding. Employees, departments, holidays, attendance, shifts, expense claims and recruitment are built; appraisals (#1030) are checked | 6 |
| 9 | Payroll, 37 record types: salary components and structures, their assignment, pay runs and slips, each run posting to the books' journal; tax from a module per jurisdiction, the United States only, in dollars (CX-payroll-tax). A pay run starts from an operation a person or an agent calls; running it on a schedule pulls the board's timers row (the superagent's until K44) and needs no workflows, which K44 parks | 7, 8 |
| 10 | Bridge for real, through Capxul's own Bridge account: the generated adapter mounted, Bridge's webhooks deciding KYC and KYB, real bank details, and deposits and transfers posting to the books. Incorporation help and how the paid services are sold come later | 5, 7 |
| 11 | The CRM, 40 Frappe CRM record types, as a module a running Capxul mounts; off the critical path (K44). Pulls mounting a plugin into an app that already holds data (K43, section 2) | 9 |
| 12 | Budgets, the accounting side: budgets against accounts and cost centres, checked as money is spent. The on-chain module is deployed outside the framework when it is wanted (K44, call 8) | 7 |
| 13 | Capxul's journeys run in CI: a job that proves `examples/capxul`, so its green is CI's word (K44, section 3) | — |

Slice 2's issue still carries blocked-by links to the Ask issues for the pieces it needs from Goals 3, 4, 11, 12 and
15. Under K42 those pieces are this goal's to take when their goals have stopped (K42, section 3, case 1); Goal 18
sorts those asks in its slice 1.

## The critical path (K44)

Aaron's calls of 25 November (K44, section 3): two things are built, the Orthograph alpha and Capxul; the chain comes
later; HR and payroll are Capxul's core offering; every money movement is double entry in ERPNext's shapes. So, in order:

1. **Slice 13, Capxul's journeys in CI,** so its green is CI's word.
2. **Slice 7, the books, double entry:** the chart of accounts, fiscal years, cost centres, journal entries and the
   general ledger first (their checks are #1017), then parties, payments, sales and purchase invoices, period closing,
   and the trial balance, profit and loss and balance sheet.
3. **Slice 8, HR's basics finished:** leave (its checks are #1026), timesheets and onboarding. What is built stays;
   appraisals (#1030) and recruitment stay too.
4. **Slice 9, payroll:** components, structures, assignments, payslips, the pay run and taxes, each run posting to the
   books.
5. **Money in and out posting to the books:** expense claims in slice 7; Bridge deposits and transfers in slice 10.
6. **Slice 12, budgets:** the accounting side now; the on-chain module is deployed outside the framework when wanted.
7. **Slice 10, Bridge for real:** the generated adapter mounted, Bridge's webhooks deciding KYC and KYB, real bank details.
8. **Later, with the chain, slice 2:** each person's and company's Safe, and getting paid on chain.

Slice 11, the CRM, is off the path. The framework gaps Capxul has claimed are Capxul's to build, as the path meets
them (K44, section 1): #1001 (prove's clock can't step past seven days) and #972 (a handler can't move a second thing's
state) come before payroll and period closing, #1034 (the generated CLI can't pass a list) before entering a journal
entry, and #742 item 4 (a thing with more fields than D1's 100 columns) before invoices. Goal 18 fixes only the gaps no
goal has claimed, and every fix reaches the alpha once it lands on `main`.

## How it runs

- **Gaps.** Capxul owns every framework gap it finds. Before starting one, read the board's claims (K42, section 3).
  If a running goal has it, wait for it or take what has landed. If it would touch paths another running goal claimed,
  settle it through Goal 18. Otherwise, claim it (`lane:goal-16`, and a "Touches" line) and build it in this goal's own
  slice. Land each framework fix in `main` as soon as it is green.
- **Building with the framework.** Declare through `ortho add` and `ortho new`. When the framework can't scaffold
  something Capxul needs, that is a gap: build the scaffolder, then use it.
- **Checks first.** For each slice, an author who is not the builder writes the journeys and checks, red, and proves
  them fair (the `author` skill). The builder makes them green and never edits them.
- **Grills.** A question only Aaron can answer becomes a Decision issue labelled `needs-aaron`. Goal 18 batches these
  and brings them to him.
- **Merging.** Drafts first, a 🔍 that wrote none of it, then ready. Merge when CI is green and every thread is
  resolved, with at most two ready pull requests at once.
- **On GitHub.** Milestone `Goal 16: Capxul on Orthograph`, label `release:beta`. Every comment an agent posts starts
  `[goal-16 · <role> · <harness> · <model>]` (the `github` skill).
- **Limits.** No real keys in this repository. Bridge and the paid services run against stand-ins until Capxul's own
  staging. At most $10 a day on cloud resources. Stop every process you start, by its id.

## Lanes

A lane is one long-running agent that builds one piece of Capxul beside this goal's own slices, in its own paths, and
lands each slice in `goal/capxul` (Aaron, 26 November 2026). Its brief, with its paths, slices and done check, is its
own file; its "Where it stands" is one GitHub issue, which Goal 16's lead opens.

| Lane | Harness | Builds | Brief |
|---|---|---|---|
| US payroll tax | Amp | the `payroll-tax-us` piece: federal and state withholding, FICA, FUTA and SUTA from the publications, then the tax on a payroll slip once gap 3 lands (CX-payroll-tax) | `16-lane-payroll-tax.md` |

## Where it stands

24 November 2026 (rewritten under K43 on 23 November). Slice 1 is done: the first map landed by #487. Slice 5 is done: the Bridge spike
landed in `main` by #744 (727bc47a). Slice 4 is done: the ERPNext doctype spike landed in `main` by #743 (26c3ce32).
Slice 6 has begun: every record type Capxul takes is in `examples/capxul/doctypes.md` (485), and Goal 16 keeps its board rows
(#749, closed by #791). Slice 8a is built: Capxul's app and its Company (#757) and employees, departments and job
titles (#763) have their checks, and a builder that wrote none of them made them green (#786, 57d43997). Leave (8b) needed handlers
that can list records (#764); Goal 16 built them (#968, 947d1919), and #973 brings them into `goal/capxul`. Slice 10's checks are in too (#769: Bridge customers, KYC, KYB
and bank accounts). Their handlers are built as well (#787, d0f02a2b). Slice 8c, holiday lists, is built: its checks are #914 (4f5cefaf), and a separate
builder made them green (#918, 15c79143). Branch and Employee Grade are built: checks #924 (19c24f88), handlers #927 (64492ea4).
Expense claims are built, in USDC, the one dollar asset every Capxul company uses for now (Aaron, 24 November 2026;
`CX-grill.md`, section 3): checks #937 (2b5805e3) and a separate builder's handlers #955
(f955265a). Attendance and shifts (8d) are built: checks #964 (52833e9b), handlers #970 (363e02f6), so `prove` passes
all 37 journeys in `goal/capxul`. A leaver can't start a new HR record but can finish an open one
(`decisions/CX-expense-leavers.md`). The generated Bridge
adapter waits on the five generator gaps in #739, which Goal 16 builds on `goal/superagent`. Goal 16 has claimed two
framework gaps under K42's case 3: #761's access part, landed in `main` by #768 and merged into `goal/capxul` by #773,
and #759 (a check on extra writes), which Goal 16 builds after #764 and #920, now that an unset `writes` means the operation's own thing only (`decisions/CX-takeover.md`). It has also claimed Dates (#866) under case 3, and held Company currency (#882) until Aaron's call parked it, both
chiefly in `packages/orthograph/src/modules/values`. Dates' checks landed in `main` by #915 (bf3c60bf);
Dates is built in `main` by #917 (9afb7efd), and Capxul's `Day` runs on it (#922, 8939289b). Company currency (#882) is
parked by Aaron's one-dollar-asset call and unclaimed while parked; its checks (#923) stay an unmerged draft. Snag #920 (the unique check at commit asks the store once per row) is Goal 16's too. Slice 3 is decided
(`decisions/CX-grill.md`): AGPL-3.0; every record type in one catalogue; base units; Bridge served by Capxul to its
customers, built in full now, with what's paid sorted out later; the network dropped for now. `main` was merged into
`goal/capxul` at the restart (#745), so this brief replaced the branch's old one; #773 merged it in again. The lead rewrites this section at
every slice merge.
