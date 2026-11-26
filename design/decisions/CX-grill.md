# CX-grill: Capxul's licence, record types, money and paid services

**Decided 23 November 2026** by Aaron, by voice. The conductor of the Space that leads Goal 16 put the questions to him
and relayed his answers (thread T-01a2093c-2b96-76f0-917b-43d5cfea3710). This is Goal 16's slice 3 (#709), the grill
on K43's open list, and it settles #730 to #734.

His words were heard through speech to text and are kept as heard, lightly cleaned up by the conductor. Under each
answer, **Aaron's call** is what he said, and **the goal's reading** is how Goal 16's lead applies it, under the
standing authority in `AGENTS.md`. His word overrides any reading.

## 1. The licence (#730): AGPL-3.0, by delegation

**Aaron's call:** "I'm not too bothered. You can just crack on, choose what you want." He delegated it.

**The goal's reading:**

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

**Aaron's call,** declining the narrow first cut: "I want to document all the record types that we need, which is
pretty much all of them, and then have them all together." Capxul takes essentially every ERPNext and Frappe HRMS
doctype its books, HR and payroll use, all listed in one place.

**The goal's reading:**

- Every Frappe CRM doctype joins them for slice 11.
- The one place is `examples/capxul/doctypes.md`, written by slice 6 (#712). Each row gives the doctype, its source
  file, the Capxul part that takes it, and its kind.
- A doctype that is not taken is listed with its reason.
- Several companies, fiscal years and cost centres are kept. Several currencies are catalogued too, but each record
  type that carries an exchange rate is flagged, and section 3 decides how it is held. M6-money keeps a per-row
  currency for later.
- Slice 4's spike (#710) is the catalogue's starting point. It scaffolded Sales Invoice, Payment Entry and GL Entry into
  10 things, and with three more doctypes 18 things, through `ortho check`. It also measured how much can be
  scaffolded.

## 3. Money (#732): base units, and a mismatch is Orthograph's question

**Aaron's call:** "Yes, it should be base units unless otherwise. And if there's a reason for it to be otherwise,
then maybe we need to think about Orthograph's money units." Every amount is in base units. Where a case doesn't fit,
the question is Orthograph's money units, not a workaround in Capxul.

**The goal's reading:**

- Every Capxul amount is Orthograph money (`M6-money.md`, on `goal/on-chain`): an integer in base units that names its
  asset. ERPNext's decimal Currency fields are translated to it.
- Where an ERPNext amount doesn't fit (exchange rates, `base_*` amounts beside a foreign amount, rounding adjustments,
  a currency taken from a company's row), it is filed as a Gap about Orthograph's money units. The Gap goes in Goal
  16's milestone under K42's collision rule, so the money value changes for every app.
- Getting paid (slice 2) starts with one fixed asset, USDC, so it waits on no money gap.

**Aaron's call, 24 November 2026** (relayed by the conductor from the Space): "for now, can't we just assume dollars?
It's always going to be tied to some sort of crypto asset, because that's what the thing's in. Can't we just assume that
for now?" For now every Capxul company keeps its books in one dollar asset. (Superseded by CX-money-global-payroll, 26 November 2026: "A company keeps its books in its own reporting currency, with accounts in any currency.")

**The goal's reading:**

- The one asset is USDC (Superseded by CX-money-global-payroll, 26 November 2026: "Today's companies report in USDC"), the fixed asset getting paid already starts with. Every Capxul amount is `Blueprint.money` of
  it, so no amount names a currency of its own row.
- A company's own currency and exchange rates are deferred by this call. (Superseded by CX-money-global-payroll, 26 November 2026: "A company's own currency and exchange rates are built in slice 7.") Company currency (#882) is parked and unclaimed (Superseded by CX-money-global-payroll, 26 November 2026: "Company currency (#882) is claimed by Goal 16")
  (its status row's lane is `none`), and its checks (#923) stay an unmerged draft that can be picked up as they stand. The catalogue's `FX` rows are deferred with
  it: each is taken in USDC alone, and its exchange-rate and `base_*` fields are left out until a new call from Aaron (Superseded by CX-money-global-payroll, 26 November 2026: "each is taken with its exchange-rate and `base_*` fields as its slice builds it").
- Expense claims no longer wait on a company's currency: their amounts are USDC.

## 4. Paid services (#733): deferred; build everything now

**Aaron's call:** "I don't think any of that kind of matters now. The main thing is just to build everything out and
then we will sort out paid services afterwards. That's going to be the Bridge API thing ... We'll just turn on what's
paid later. We just need to build." And then: "They don't connect their own Bridge account. We're serving Bridge
ourselves. Capxul is serving Bridge to customers. There's no bring-your-own Bridge account, nothing like that." Build it
all now, and decide what is paid afterwards. Capxul serves Bridge to its customers, and no company connects its own
Bridge account.

**The goal's reading:**

- Every Capxul company's KYC, KYB and bank accounts go through Capxul's own Bridge account. The free direct Bridge
  adapter the goal had proposed is dropped.
- Slice 10 builds the Bridge adapter and the features on it in full: KYC and KYB, bank accounts, and their upkeep.
- How they are gated, sold or reached from a self-hosted Capxul is designed later, once they work. It holds up neither
  slice 6 nor slice 10.
- Help with incorporation stays in slice 10, after the bank accounts. It is built like the rest, and its selling comes
  later too.
- K43's rule stands that the paid services contain no translated code. The Bridge features go in their own plugin
  folder, so gating them later stays a mount, not a rewrite.

## 5. The network (#734): dropped

**Aaron's call:** "Drop network altogether. We're just going to drop it for now altogether." The network (other
companies and their agents reached through the CRM, plus meetups, mixers and workshops) is not part of Goal 16.

**The goal's reading:** Slice 11 (#717) builds the CRM module without it, and no slice waits on it. Bringing it back
would take a new call from Aaron.

## Still open

- Orthograph's own licence (section 1), before the npm preview. It is not Goal 16's to decide.
- How Capxul's Bridge features are gated and sold, once they are built (section 4).

## Supersedes

- `design/goals/16-capxul.md`: "currency (#882), not on listing" → "Expense claims are in USDC, the one dollar asset every Capxul company uses for now"
- `examples/capxul/doctypes.md`: "which is a question for Orthograph's money units, not a" → "These are deferred by Aaron's call of 24 November 2026"
- `design/goals/16-capxul.md`: "Bridge and the paid services as board items, each at its stage" → "Bridge as board items, each at its stage, with every record type Capxul takes in one catalogue (CX-grill)"
- `design/goals/16-capxul.md`: "The books, HR, payroll, the paid services and the CRM, as slice 6 writes them" → "The books, HR, payroll, Bridge's features built in full (their gating comes later, CX-grill) and the CRM, as slice 6 writes them"
- `design/decisions/K43-capxul-core.md`: "Frappe HRMS's licence is still to be read from its" → "Frappe HRMS is GPL-3.0 (CX-grill)"
- `design/decisions/K43-capxul-core.md`: "It becomes a grill when Capxul reaches the CRM." → "the network is dropped for now (CX-grill)"
- `design/goals/16-capxul.md`: "6 · The provisional map: books, HR, payroll, CRM, Bridge and the paid services" → "6 · The provisional map: books, HR, payroll, CRM and Bridge"
- `design/goals/16-capxul.md`: "10 · The paid services: KYC and KYB, bank accounts through Bridge, incorporation" → "10 · Bridge in full: KYC and KYB, bank accounts and incorporation, through Capxul's own Bridge account"
- `design/goals/16-capxul.md`: "Aaron, for the first design conversation" → "nobody: slice 3's grill is decided (CX-grill)"
