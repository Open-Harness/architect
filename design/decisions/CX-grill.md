# CX-grill: Capxul's licence, record types, money and paid services

**Decided 23 November 2026** by Aaron, by voice, relayed by the Capxul on Orthography conductor
(thread T-01a2093c-2b96-76f0-917b-43d5cfea3710). This is Goal 16's slice 3 (#709), the grill on K43's open list. It
settles #730 to #734.

Heard through speech to text and kept as heard, lightly cleaned up by the conductor.

## 1. The licence (#730): AGPL-3.0, by delegation

Aaron: "I'm not too bothered. You can just crack on, choose what you want." So the goal's recommendation stands.

- All of Capxul's software, core and modules, carries **AGPL-3.0**. GPL-3.0 section 13 allows combining GPL-3.0 work
  with AGPL-3.0 work, so the ERPNext and HRMS translations sit under AGPL alongside the CRM's.
- The licences, read on 23 November 2026 from GitHub's licence API: ERPNext GPL-3.0, Frappe HRMS GPL-3.0, Frappe CRM
  AGPL-3.0, Frappe MIT. This answers K43's open question about HRMS's licence.
- `examples/capxul/` carries its own `LICENSE` file, separate from Orthograph's, until Capxul moves to its own
  repository.
- The lawyer's read still comes afterwards and blocks nothing (K43, call 7).
- Orthograph itself has no licence yet (no `LICENSE`, no `license` in `package.json`). That is a separate question, and
  it must be answered before the npm preview.

## 2. Record types (#731): all of them, documented in one place

Aaron, declining the narrow first cut: "I want to document all the record types that we need, which is pretty much
all of them, and then have them all together."

- Capxul takes essentially every ERPNext and Frappe HRMS doctype a business's books, HR and payroll use, and later
  every Frappe CRM doctype, rather than a chosen subset.
- They are listed together in one catalogue, written by slice 6 (#712) and kept as `examples/capxul/doctypes.md`. Each
  row gives the doctype, its source app, the Capxul part that takes it, and its stage on the board.
- Each doctype that is dropped is listed with the reason. Several companies, several currencies, fiscal years and cost
  centres are kept unless building shows a reason not to.
- Slice 4's spike (#710), which put 18 doctypes through `ortho check`, is the catalogue's starting point and tests how
  much of it can be scaffolded.

## 3. Money (#732): base units, and a mismatch is Orthograph's question

Aaron: "Yes, it should be base units unless otherwise. And if there's a reason for it to be otherwise, then maybe we
need to think about Orthograph's money units."

- Every Capxul amount is Orthograph money (`M6-money.md`, on `goal/on-chain`): an integer in base units that names its
  asset. ERPNext's decimal Currency fields are translated to it.
- Where an ERPNext amount doesn't fit (exchange rates, `base_*` amounts beside a foreign amount, rounding adjustments,
  a currency taken from a company's row), Capxul does not work around it. It files the case as a Gap about
  Orthograph's money units, in Goal 16's milestone, so the money value changes for every app.
- Getting paid (slice 2) starts with one fixed asset, USDC, so it waits on no money gap.

## 4. Paid services (#733): deferred; build everything now

Aaron: "I don't think any of that kind of matters now. The main thing is just to build everything out and then we will
sort out paid services afterwards. That's going to be the Bridge API thing ... We'll just turn on what's paid later.
We just need to build." And then: "They don't connect their own Bridge account. We're serving Bridge ourselves.
Capxul is serving Bridge to customers. There's no bring-your-own Bridge account, nothing like that."

- **Capxul serves Bridge to its customers.** Capxul is Bridge's one developer customer. Every Capxul company's KYC,
  KYB and bank accounts go through Capxul's Bridge account, and no company connects its own. The goal's option of a
  free direct Bridge adapter for a company's own Bridge key is dropped.
- Slice 10 builds the Bridge adapter and the features on it in full: KYC and KYB, bank accounts, and their upkeep.
- How they are gated, sold or reached from a self-hosted Capxul is designed later, once they work. It holds up neither
  slice 6 nor slice 10.
- K43's rule stands that the paid services contain no translated code. Keep the Bridge features in their own plugin
  folder, so gating them later stays a mount, not a rewrite.

## 5. The network (#734): dropped

Aaron: "Drop network altogether. We're just going to drop it for now altogether." The network (other companies and
their agents reached through the CRM, plus meetups, mixers and workshops) is not part of Goal 16. Slice 11 (#717)
builds the CRM module without it, and no slice waits on it. Bringing it back would take a new call from Aaron.

## Still open

- Orthograph's own licence (section 1), before the npm preview. It is not Goal 16's to decide.
- How Capxul's Bridge features are gated and sold, once they are built (section 4).

## Supersedes

- `design/goals/16-capxul.md`: "Bridge and the paid services as board items, each at its stage" → "Bridge as board items, each at its stage, with every record type Capxul takes in one catalogue (CX-grill)"
- `design/goals/16-capxul.md`: "The books, HR, payroll, the paid services and the CRM, as slice 6 writes them" → "The books, HR, payroll, Bridge's features built in full (their gating comes later, CX-grill) and the CRM, as slice 6 writes them"
- `design/decisions/K43-capxul-core.md`: "Frappe HRMS's licence is still to be read from its" → "Frappe HRMS is GPL-3.0 (CX-grill)"
- `design/decisions/K43-capxul-core.md`: "It becomes a grill when Capxul reaches the CRM." → "the network is dropped for now (CX-grill)"
