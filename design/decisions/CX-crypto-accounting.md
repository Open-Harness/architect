# CX-crypto-accounting: how a dollar-reporting company accounts for the USDC in its Safe

**Status: draft, 26 November 2026.** Proposed by Goal 16's 📐 designer thread, started by Goal 16's lead
(session_01S8RF7ASqmdxbN37WdpZMcB), to answer Aaron's two questions of 26 November 2026 (kept as heard: "the value can
change ... How is that supposed to be accounted for?" and "crypto assets ... as a treasury asset. So how does that
work?"). **Aaron answered the first draft the same day** (section 7); this version follows his answers. It builds on
CX-money-global-payroll (#1121, on `goal/capxul` once it lands; until then on
`origin/goal-16/money-global-payroll-design`) and CX-composable-pieces. Nothing is superseded in this pull request;
section 8 lists what would change.

This is research and a recommendation, not accounting advice. Capxul's books are production and hold real money, so
question 1 asks for a qualified accountant's review before a customer relies on it.

## In short

A Capxul company reports in dollars and holds USDC in its own Safe. It can't redeem USDC with Circle directly, so for
the books USDC is a crypto asset, not cash. That means it's carried at its market price. At each month end, someone
types that day's USDC price, and the books mark the Safe's USDC to it. If USDC sits at 99.85 cents, a hundred thousand
USDC shows as $99,850 and a $150 loss goes to profit and loss; when it's back at a dollar, the $150 comes back as a
gain. Spending USDC during the month books no gain or loss of its own. That's all: one price a month, in the core
books, with no extra piece and no settings.

Bitcoin and ether are left for later. Two things wait on Aaron: an accountant's review, and how tax counts the cost of
each USDC spent.

## 1. Recommendations

### (a) USDC

1. **Fair value, through net income.** A Capxul company holds USDC in its own self-custodial Safe and has no direct
   redemption right with Circle; Circle's terms call such a holder "User Type B", which "may not redeem USDC with
   Circle" (Aaron: "it cant"; section 7). Without that right USDC is not a financial asset (KPMG Q8.4.10; PwC 2.1.2)
   and so not cash or a cash equivalent. It is measured as a crypto asset under ASC 350-60: fair value at each period
   end, the change in net income. Whether it is in ASC 350-60's scope or an ordinary intangible at cost less impairment
   is a judgment for the accountant (question 1); the books below are the same either way, except that impairment only
   ever writes down.
2. **One price a month.** Every movement books at its own realised rate, as CX-money-global-payroll says. At each month
   end, a person types one USDC→USD price into `rates`, marked as a market price, until a price feed is its own call.
   Nothing else is a setting.
3. **The accounts.** *USDC (Safe)*, one per Safe, holds the units at cost: each receipt at its realised rate, each
   payment out at the account's average cost. Beside it, *USDC fair-value adjustment*, a dollar-only account, holds the
   mark. Together they are the balance-sheet line "USDC (digital asset)", apart from cash. Two income accounts:
   *Gain or loss on remeasurement of USDC* for the mark, and *Realised gain or loss on USDC* for a payment whose
   dollar value differs from the cost it relieves (usually nil). Bridge never holds USDC: it moves money in and out of
   the Safe (Aaron: "its never in bridge its in the safe"), so there is no Bridge USDC account.
4. **The month-end mark.** The adjustment's target is units times the typed price, less cost. The mark posts the change
   in that target to the remeasurement account. It never reverses: next month's mark starts from this one.
5. **What the reports show** (ASC 350-60's disclosures, through KPMG and PwC): units, cost and fair value at each
   period end; each year a roll-forward of additions, dispositions, gains and losses; cumulative realised gains and
   losses; and the cost method, average cost.

**Worked example.** USDC (Safe) receives 100,000 USDC from a customer paying a $100,000 invoice.

| Date | Event | Entry | After |
|---|---|---|---|
| 2 Nov | Customer pays a $100,000 invoice in USDC | Debit *USDC (Safe)* 100,000 USDC, $100,000; credit *Receivable* $100,000 | Units 100,000; cost $100,000; adjustment $0 |
| 30 Nov | Price typed: 0.9985 | Target 100,000 × 0.9985 − 100,000 = −$150. Debit *Remeasurement* $150; credit *Adjustment* $150 | Balance sheet $99,850; November loss $150 |
| 10 Dec | Pay a contractor's $1,000 bill with 1,000 USDC | Debit *Payable* $1,000; credit *USDC (Safe)* 1,000 USDC, $1,000 at average cost | Units 99,000; cost $99,000; realised gain or loss nil |
| 31 Dec | Price typed: 1.0000 | Target 99,000 × 1 − 99,000 = $0; change +$150. Debit *Adjustment* $150; credit *Remeasurement* $150 | Balance sheet $99,000; December gain $150 |

The year's roll-forward: additions $100,000, dispositions $1,000, remeasurement losses $150 and gains $150, closing
$99,000. Had the price been 0.97 at 31 December, the mark would have posted a further $2,820 loss (target −$2,970);
a real depeg needs no other path.

### (b) Bitcoin and ether, later

Out of scope for now (section 7). Adding them later means, on top of this: an asset kind for a coin with no token
contract (`Blueprint.asset.token` assumes one), lots per wallet with a disposal method for tax (FIFO by default), and a
price from one principal market per asset at a fixed cut-off. The month-end mark above then works unchanged; section 3
keeps the research.

### (c) Where it sits

In core, as Aaron said ("its part of the thing, this is onchain offchain solution"):

- **`rates`** gains a source on every row: *realised* (from a movement), *typed*, or *market* (a typed month-end price).
- **`ledger`** gains a measurement on each account whose asset is not the company's: *exchange* (ERPNext's revaluation,
  for pounds and euros) or *fair value* (USDC), the fair-value adjustment and remeasurement accounts, the month-end mark,
  and the two reports.

There is no `treasury` piece.

### (d) What the framework lacks

Nothing new. The conversion of a USDC amount (6 places) to dollars (2) at a rate is CX-money-global-payroll's gap 6
(Company currency, #882), which must be exact. A month-end schedule in the company's zone already exists,
`Blueprint.time.every("1 month", { on: { day: "last" }, zone })` (`packages/orthograph/src/modules/time/types.ts`),
though the mark can equally stay an operation a person or an agent calls. A price feed is a later outside dependency,
Aaron's call.

### (e) Slices

Both come after CX-money-global-payroll's currency slice (accounts in several assets, both amounts on every line).

| # | Slice | Done when |
|---|---|---|
| U1 | `rates`: a source on every row | A journey types USDC→USD 0.998500000 as a *market* price for 30 November; it reads back with its source, and a payment's own rate reads back as *realised* |
| U2 | `ledger`: *fair value* on the USDC account, the month-end mark and its two reports | The worked example as a journey: after 30 November the balance sheet shows $99,850 and a $150 loss; the 10 December payment books no gain or loss; 31 December posts a $150 gain; after every step the adjustment equals units × the latest price − cost; the holdings report shows 99,000 units, cost $99,000, fair value $99,000, and the roll-forward 100,000 / 1,000 / 150 / 150 / 99,000 |

### (f) Questions for Aaron

1. **An accountant's review.** Recommended: yes. Before a customer's books rely on the USDC month-end mark, a certified
   public accountant with digital-asset experience reads this record and the worked example, and confirms the fair-value
   measurement. This is production and money. It is an outside spend, so it's your call.
2. **The tax cost of each USDC spent.** For tax, USDC is property, so every payment out is a disposal with a gain or loss
   against its cost, tiny but reportable (section 4). Recommended: the accountant confirms whether a cost of one dollar
   per USDC is acceptable; if not, each receipt into the Safe is kept as a lot, taken first in, first out, which is the
   IRS default for a self-custodial wallet.

## 2. USDC under US GAAP: the research

The first draft offered a second path, for a company with a direct redemption right (a Circle Mint account): USDC as a
receivable at one dollar, with a depeg check. Aaron ruled it out (section 7). The research behind it stays below.

**Scope of ASU 2023-08.** ASC 350-60 covers assets that are intangible and "do not provide the asset holder with
enforceable rights to or claims on underlying goods, services, or other assets" (ASC 350-60-15-1(b)); the intangible
definition "specifically excludes financial assets" (BC18), and enforceability "may require judgment" (BC20). KPMG:
criterion (b) "is structured to scope out any crypto token that provides its holder with enforceable rights", and for
many stablecoins "the unit of account is the right to the cash" (Q2.2.30).

**What it is instead.** KPMG Q8.4.10: a stablecoin is a financial asset if "the holder has a contractual right to
redeem the stablecoin directly from the issuer or has the ability to obtain such right without facing significant
barriers", the issuer settles only in cash or financial assets and can't refuse; otherwise "it would likely be
accounted for as a crypto intangible asset". PwC 2.1.2 agrees ("conditions that limit redemption at the discretion of
the issuer would likely adversely impact the ability to classify the holding as a financial asset") and sends a
financial-asset stablecoin to ASC 320, 321 or 310, with fair value permitted (2.1.3). EY's Technical Line (updated
March 2025) says it "may meet the definition of a financial asset that is subject to ASC 310 or ASC 320 ... or meet the
definition of an intangible asset". Where a token without the right falls (ASC 350-60 at fair value, or ASC 350-30 at
cost less impairment) depends on whether it then passes all six criteria; that is question 2's judgment.

**Circle's terms** (updated 15 October 2026): a holder without a Circle Mint account is "User Type B", not a customer;
"You may not redeem USDC with Circle unless and until you open a Circle Mint account"; Circle "commits to redeem 1 USDC
for 1 USD, subject to these Terms", may suspend redemption during downtime, and "does not guarantee that the value of
one (1) USDC will always equal 1 USD ... on other platforms".

**The GENIUS Act** (S.1582, 2025) requires a payment stablecoin issuer to hold reserves "on an at least 1 to 1 basis"
in cash, deposits and short Treasury bills (s. 4(a)(1)(A)), publish redemption procedures (s. 4(a)(1)(B)), and gives
holders priority over the reserves in insolvency (s. 11). That supports a small expected credit loss.

**Cash equivalent?** Not automatically: the ASC 230 definition is "readily convertible to known amounts of cash" and
"so near their maturity" (KPMG Q8.4.20), and "a stablecoin that does not meet the definition of a financial asset
cannot be classified as a cash equivalent" (PwC). FASB's proposed ASU (Topic 230, File 2026-ED400, issued 18 August
2026, comments closed 19 November 2026) would let a stablecoin with an on-demand, direct redemption right and one-to-one
segregated short-term reserves be a cash equivalent; a holder that can only sell on a secondary market would not (Case
B, 230-10-55-26). No final standard as of today. KPMG reports the SEC staff has not objected to cash-equivalent
classification with a guaranteed one-to-one redemption within two business days. FASB's separate project on transfers
of crypto assets expects a proposal in the first quarter of 2027.

**Public holders.** Coinbase, 2022 to 2024: "USDC is accounted for as a financial instrument; one USDC can be redeemed
for one U.S. dollar on demand from the issuer", "carried at amortized cost, which approximates their fair value". From
31 December 2025 Coinbase reclassified payment stablecoins as cash equivalents, previously "under ... ASC 310,
Receivables", citing "near-instant, one-to-one redemption". PayPal's 2025 10-K counts PYUSD in cash equivalents: "a
contractual right to redeem with the third-party issuer". Circle's own holdings are issuer accounting and don't
compare. No filer was found describing how it measured the March 2023 depeg; Coinbase only notes "a temporary
disruption to USDC services".

**A depeg.** As a receivable at amortized cost the market quote is not booked; an allowance reflects the expected
loss on the issuer and its reserves, and fair value is disclosed (ASC 825). At fair value, through the fair value
option or ASC 350-60, it is remeasured through net income. As an ASC 350-30 intangible it is written down to the lower
price with no reversal. This reading of the standards is ours, not quoted.

## 3. Crypto treasury assets under ASU 2023-08: the research, kept for later

- **Measurement:** fair value, "with the gain or loss associated with remeasurement ... reported in net income ...
  regardless of whether they have quoted prices in an active market" (ASC 350-60-35-1, via PwC 2.4.1.2).
- **Presentation:** separately from other intangibles on the balance sheet; current or noncurrent isn't addressed
  (45-1, PwC 5.3.1). Remeasurement is reported separately in net income (45-2); PwC says generally within operating
  income, KPMG says operating or not by facts and circumstances. Crypto received as consideration and sold "nearly
  immediately" (hours or days) is an operating cash flow (45-3).
- **Fair value:** the principal market is "the market with the greatest volume and level of activity ... that the
  entity ... can access", "a single market, not an average"; no blockage factor (ASC 820-10-35-36B); a consistent
  cut-off, generally "the last trading price prior to midnight of the appropriate time zone" (PwC 4.1).
- **Cost:** the ASU "does not address initial measurement"; ASC 350-30-30-1 "generally requires capitalization of
  transaction costs" (KPMG; PwC 2.4.1.1). The entity "should adopt a method (e.g., specific identification, FIFO) to
  identify the units sold" and discloses it annually (50-2).
- **Disclosure:** interim and annual, each significant holding's name, cost basis, fair value and units, and the rest in
  aggregate; restrictions with their nature and duration (50-6). Annually, a roll-forward of additions, dispositions,
  gains and losses; the nature of additions and dispositions; "cumulative realized gains and cumulative realized
  losses", which are against original cost and so differ from remeasurement gains (KPMG's example).
- **Effective:** fiscal years beginning after 15 December 2024, interim periods included; early adoption allowed;
  modified retrospective, a cumulative-effect adjustment to opening retained earnings (KPMG).
- **Holders:** Strategy adopted 1 January 2025, adding $12.75 billion to retained earnings, Coinbase as principal
  market (Level 1), changes in "Unrealized loss on digital assets" within operating expenses. Tesla adopted from 1
  January 2024, specific identification, gains in "Other income (expense), net". Block early-adopted in 2023, FIFO,
  cost "inclusive of transaction costs", gains in "Other income, net".
- **Deferred tax:** Strategy's adoption raised its deferred tax liability by $3.97 billion. Deloitte's roadmap, seen
  only as a search snippet, notes a deferred tax asset on losses "may need ... a valuation allowance if there are no
  other sources of capital gains".

## 4. Tax, briefly (flagged, not solved)

- Digital assets are **property** (Notice 2014-21, A-1; irs.gov). Every exchange is a disposal: selling ETH, redeeming
  USDC, and paying a contractor in USDC (FAQ 14), each with a gain or loss, near zero for USDC but reportable.
- **Basis by wallet** from 1 January 2025 (Treas. Reg. 1.1012-1(j)): units not in a broker's custody go out FIFO
  unless specifically identified "on its books and records" no later than the sale; in a broker's custody,
  identification is made to the broker, and a standing order counts. Rev. Proc. 2024-28 governed allocating basis as of
  1 January 2025; Notice 2025-7 gave 2025 relief. So tax needs lots per wallet and a written lot method
  (question 2; bitcoin and ether later).
- **Form 1099-DA:** gross proceeds for 2025 sales, basis for assets acquired after 2025. Corporations are exempt
  recipients, though a broker may still send one; qualifying stablecoin sales of $10,000 or less a year need not be
  reported by a broker using the optional method. A C-corporation should rely on its own lots, not on 1099-DAs.
- **Contractors** paid in crypto: report the fair value in dollars on the payment date (Notice 2014-21, A-13, now
  Form 1099-NEC); the threshold is $2,000 for payments after 2025.
- **Character:** capital; a corporation's capital losses offset only capital gains, carried back 3 and forward 5 years
  (Pub. 542). The wash-sale rule covers "stock or securities"; we read it as not reaching crypto, but no IRS text says
  so.
- **Book and tax differ:** fair value for books, cost for tax, so a deferred tax line once the mark and the
  tax cost differ (the accountant's to book).
- **Corporate minimum tax:** only above $1 billion of average income, with an election to ignore unrealised gains
  (Notice 2025-49, s. 5.03); not a small customer's concern.
- **States:** Delaware's franchise tax uses gross assets from the book balance sheet, so marks move it; state income tax
  is not researched here.

## 5. IFRS, briefly (noted, not designed)

Under IFRS, crypto is an intangible (IAS 38) or inventory (IAS 2), not fair value through profit (IFRIC, June 2019);
USDC needs its own analysis, and the IASB opened a project on both on 19 November 2026; `ledger`'s measurement is where
a non-US company's would go.

## 6. ERPNext's own handling, and where it falls short (`a6f54f9c`)

- **What it does.** Currency Exchange (`erpnext/setup/doctype/currency_exchange`) holds a date, from, to and a rate of
  9 places. `get_exchange_rate` (`erpnext/setup/utils.py`, line 136) takes a stored row first, then the inverse row,
  then Pegged Currencies (only if `allow_pegged_currencies_exchange_rates`), then the outside provider. So a typed
  month-end price for USDC already outranks any peg.
- **Revaluation.** Exchange Rate Revaluation (`exchange_rate_revaluation.py`) picks every balance-sheet ledger account
  of root type Asset, Liability or Equity whose `account_currency` is not the company's, and **not of `account_type`
  Stock** (lines 198–209). For each it divides the booked base balance by the account-currency balance for the current
  rate, takes the new rate from `get_exchange_rate` on the posting date, and posts the difference (lines 275–291) as a
  multi-currency Journal Entry to the company's single `unrealized_exchange_gain_loss_account` (lines 358–366). Accounts
  whose units are nil but whose base balance isn't are cleared to it as well. Reversing it is a separate entry
  (`reversal_of`). A `rounding_loss_allowance` below one ignores dust.
- **Carrying USDC through it.** Mechanically it works: a USDC "currency", an account in it, a rate row at month end,
  and revaluation posts units times rate less booked value, into the account itself.
- **Where it falls short.**
  1. *One gain-or-loss account, named for exchange.* ASC 350-60 wants crypto remeasurement reported separately in net
     income. Fix: USDC's own remeasurement account (section 1(a)).
  2. *No lots.* An account's carrying rate is its average (booked base over units). A sale books the received amount
     against that average, which is neither FIFO nor specific identification, so neither the realised gain against
     cost nor the tax basis can be read back. ERPNext's FIFO lives only in its stock ledger, and revaluation skips Stock
     accounts, so modelling ETH as a stock item gives lots but no fair value. For USDC, average cost is enough for
     the books (section 1(a)); lots wait on question 2 and on bitcoin and ether.
  3. *Revalue-and-reverse.* Built for foreign currency, where the next period starts from the booked rate. For USDC,
     the mark sits in its own adjustment account and moves from month to month, so cost stays readable. Fix: no
     reversal for *fair value*.
  4. *No price provenance.* A Currency Exchange row doesn't say where a rate came from. Fix: U1's source.
  5. *Precision.* Frappe's currency precision tops out at 9 places, short of ether's 18 (later); Orthograph's base-unit
     money avoids this.

## 7. Aaron's answers

Aaron answered on 26 November 2026, in writing, as replies to the lead's questions on the first draft. His words,
exactly, and how they are read:

- On "If it can't [redeem directly]: USDC is probably carried at its market price": "it cant". So fair value.
- On guiding customers to a direct redemption right: "cant be done". So no Circle Mint path and no depeg stop.
- On USDC at Bridge: "its never in bridge its in the safe which is self custodial". So the Safe holds all USDC;
  Bridge only moves money in and out. The question is dropped.
- On `treasury` as an optional piece: "its part of the thing, this is onchain offchain solution". So holding USDC is
  core, in `rates` and `ledger`, with no separate piece; bitcoin and ether are out of scope for now.
- On the defaults (FIFO, principal market, cut-off, depeg threshold, typed prices): "too complicated should jusolding
  usdct be h", read as "should just be holding USDC". So one typed price a month and no settings.

Still open: questions 1 and 2 in section 1(f).

## 8. What would change once applied

Nothing is applied in this pull request. When it is:

- **CX-money-global-payroll** (#1121), a dated record, keeps its words and gains "Superseded by CX-crypto-accounting,
  <date>" beside item 5's "USDC to US dollars is a standing row of one (ERPNext's Pegged Currencies) until a rate says
  otherwise" and item 9's "By CX-bridge's reading, Bridge lands deposits as USDC in custody and sends from it, so the
  company's Bridge account is a USDC account too". Its open question on how a small US company classifies USDC is
  answered here, pending the accountant.
- **CX-bridge**, a decided record, says Bridge "lands a deposit as USDC in Capxul's custody and sends a transfer from
  it". Aaron's answer contradicts it: the USDC lands in the company's Safe. It keeps its words and gains the note. Its
  Bank Transaction holding USDC amounts is unaffected. Whether Bridge's checks (#769) model custody is for the Bridge
  checks author to confirm.
- **Live comments** that repeat CX-bridge's words are rewritten:
  `examples/capxul/blueprint/things/bank-account/verbs/open.ts` (line 8), `examples/capxul/blueprint/things/bank-transaction/verbs/land.ts` (line 7) and
  `examples/capxul/plugins/bridge/src/stand-in/webhooks.ts` (line 57).
- **CX-composable-pieces**: `rates`' row adds the source; `ledger`'s row adds the fair-value measurement and the
  month-end mark. No piece is added.
- **`examples/capxul/blueprint/assets/usdc.ts`**: its comment says USDC is held in the company's Safe and marked to
  market each month end.

Lines for this record's `## Supersedes` section, added when it is applied (not now, so `tools/ci/supersedes.sh` stays
green):

```
- design/decisions/CX-bridge.md: "Bridge lands a deposit as USDC in Capxul's custody and sends a transfer from it" → "Bridge lands a deposit as USDC in the company's Safe, and a transfer is paid from the Safe"
- examples/capxul/blueprint/things/bank-account/verbs/open.ts: "landing as USDC in Capxul's custody" → "landing as USDC in the company's Safe"
- examples/capxul/blueprint/things/bank-transaction/verbs/land.ts: "reached Capxul's custody as USDC" → "reached the company's Safe as USDC"
- examples/capxul/plugins/bridge/src/stand-in/webhooks.ts: "to Capxul's custody as USDC" → "to the company's Safe as USDC"
- design/decisions/CX-money-global-payroll.md: "USDC to US dollars is a standing row of one (ERPNext's Pegged Currencies) until a rate says otherwise" → "USDC to US dollars is marked each month end at a typed market price (CX-crypto-accounting)"
```

## Appendix: sources

Checked on 26 November 2026 unless marked. Paragraph numbers in ASC 350-60 are cited through KPMG and PwC: fasb.org
refused the ASU's own page to our fetcher (the PDF at `storage.fasb.org` was read for 15-1 and BC18 to BC20).

**Standards and proposals**
- FASB, ASU 2023-08: https://storage.fasb.org/ASU%202023-08.pdf
- FASB, proposed ASU, Topic 230, cash equivalents and certain digital assets (2026-ED400):
  https://storage.fasb.org/Proposed%20ASU%20Statement%20of%20Cash%20Flows%20%28Topic%20230%29.pdf
- FASB, July 2026 technical plan: https://storage.fasb.org/July%202026%20Technical%20Plan.pdf
- FASB to ASAF, October 2026, crypto asset transfers:
  https://www.ifrs.org/content/dam/ifrs/meetings/2026/october/asaf/ap7b-cryptoassets-fasb.pdf
- IFRIC agenda decision, Holdings of Cryptocurrencies (June 2019):
  https://www.ifrs.org/content/dam/ifrs/supporting-implementation/agenda-decisions/2019/holdings-of-cryptocurrencies-june-2019.pdf
- IASB, November 2026 meeting decisions:
  https://www.ifrs.org/news-and-events/news/2026/11/iasb-decisions-from-the-november-2026-meeting/

**Firm guidance**
- KPMG, Handbook: Crypto assets (April 2026): https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2026/crypto-assets.pdf
- KPMG, Defining Issues on ASU 2023-08 (December 2023):
  https://kpmg.com/kpmg-us/content/dam/kpmg/frv/pdf/2023/defining-issues-fasb-asu-crypto-assets.pdf
- KPMG, crypto transfers project (September 2026):
  https://kpmg.com/us/en/frv/reference-library/2026/fasb-makes-progress-crypto-asset-transfers-project.html
- PwC Viewpoint, crypto assets guide: sections 2.1
  (https://viewpoint.pwc.com/dt/us/en/pwc/accounting_guides/crypto-assets-guide/crypto_assets_guide/ch2_holding_crypto_assets/21_ini_recog_measure.html),
  2.4 (https://viewpoint.pwc.com/dt/us/en/pwc/accounting_guides/crypto-assets-guide/crypto_assets_guide/ch2_holding_crypto_assets/24_crypto_assets_accounted.html),
  4.1 (https://viewpoint.pwc.com/dt/us/en/pwc/accounting_guides/crypto-assets-guide/crypto_assets_guide/chapter_4_fair_value/41_fair_value.html),
  5 (https://viewpoint.pwc.com/dt/us/en/pwc/accounting_guides/crypto-assets-guide/crypto_assets_guide/ch5disclosure-joined.html)
- EY, Technical Line 2022-07, updated 28 March 2025:
  https://www.ey.com/content/dam/ey-unified-site/ey-com/en-us/technical/accountinglink/documents/ey-tl16494-221us-03-28-2025.pdf
- Deloitte, Roadmap: Digital Assets (not readable by our fetcher; cited by CX-money-global-payroll):
  https://dart.deloitte.com/USDART/home/codification/assets/asc350-60/roadmap-digital-assets/chapter-2-classification/2-3-crypto-assets-within-scope

**Issuer and law**
- Circle, USDC Terms (updated 15 October 2026): https://www.circle.com/legal/usdc-terms
- GENIUS Act, S.1582, enrolled: https://www.govinfo.gov/content/pkg/BILLS-119s1582enr/html/BILLS-119s1582enr.htm

**Filings (SEC EDGAR)**
- Coinbase 10-K 2022: https://www.sec.gov/Archives/edgar/data/1679788/000167978823000031/coin-20221231.htm
- Coinbase 10-K 2024: https://www.sec.gov/Archives/edgar/data/1679788/000167978825000022/coin-20241231.htm
- Coinbase 10-K 2025: https://www.sec.gov/Archives/edgar/data/1679788/000167978826000015/coin-20251231.htm
- Coinbase 10-Q Q1 2023: https://www.sec.gov/Archives/edgar/data/1679788/000167978823000073/coin-20230331.htm
- PayPal 10-K 2025: https://www.sec.gov/Archives/edgar/data/1633917/000163391726000024/pypl-20251231.htm
- Circle 10-K 2025: https://www.sec.gov/Archives/edgar/data/1876042/000187604226000062/crcl-20251231.htm
- Strategy 10-Q Q1 2025: https://www.sec.gov/Archives/edgar/data/1050446/000095017025063536/mstr-20250331.htm
- Tesla 10-K 2024: https://www.sec.gov/Archives/edgar/data/1318605/000162828025003063/tsla-20241231.htm
- Block 10-K 2023: https://www.sec.gov/Archives/edgar/data/1512673/000162828024006354/sq-20231231.htm

**Tax**
- Notice 2014-21: https://www.irs.gov/pub/irs-drop/n-14-21.pdf
- IRS, digital assets: https://www.irs.gov/filing/digital-assets
- IRS, virtual currency FAQ:
  https://www.irs.gov/individuals/international-taxpayers/frequently-asked-questions-on-virtual-currency-transactions
- Treas. Reg. 1.1012-1: https://www.ecfr.gov/current/title-26/section-1.1012-1
- TD 10000:
  https://www.federalregister.gov/documents/2024/07/09/2024-14004/gross-proceeds-and-basis-reporting-by-brokers-and-determination-of-amount-realized-and-basis-for
- Rev. Proc. 2024-28: https://www.irs.gov/pub/irs-drop/rp-24-28.pdf
- Notice 2025-7: https://www.irs.gov/pub/irs-drop/n-25-07.pdf
- Form 1099-DA instructions, 2025: https://www.irs.gov/pub/irs-prior/i1099da--2025.pdf; current:
  https://www.irs.gov/instructions/i1099da
- Forms 1099-MISC and 1099-NEC instructions: https://www.irs.gov/instructions/i1099mec
- Publication 542: https://www.irs.gov/publications/p542; Publication 550: https://www.irs.gov/publications/p550
- Form 4626 instructions: https://www.irs.gov/instructions/i4626
- Notice 2025-49: https://www.irs.gov/pub/irs-drop/n-25-49.pdf; Notice 2025-46:
  https://www.irs.gov/pub/irs-drop/n-25-46.pdf; Notice 2026-07: https://www.irs.gov/pub/irs-drop/n-26-07.pdf
- Delaware franchise tax calculator: https://corp.delaware.gov/frtaxcalc/

**ERPNext at `a6f54f9c`** (read, never copied)
- `erpnext/accounts/doctype/exchange_rate_revaluation/exchange_rate_revaluation.py` and `.json`
- `erpnext/setup/utils.py` (`get_exchange_rate`)
- `erpnext/setup/doctype/currency_exchange/currency_exchange.json`
- `erpnext/accounts/doctype/pegged_currencies/pegged_currencies.json`
- `erpnext/accounts/doctype/currency_exchange_settings/currency_exchange_settings.py`

**Not verified**
- The AICPA practice aid's stablecoin section (members only) and Deloitte's roadmap text (not fetchable).
- The ASC 350-60-50 paragraph number of each disclosure other than 50-2 and 50-6.
- Whether costs to sell are excluded at remeasurement, stated in those words by any guide (our reading of ASC 820).
- That the wash-sale rule doesn't reach digital assets (no IRS statement found).
- Any state's corporate income tax treatment of digital assets.
- Whether FASB has redeliberated the cash-equivalents proposal since comments closed on 19 November 2026.
