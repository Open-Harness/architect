# CX-crypto-accounting: how a dollar-reporting company accounts for USDC and for crypto held as a treasury asset

**Status: draft, 26 November 2026.** Proposed by Goal 16's 📐 designer thread, started by Goal 16's lead
(session_01S8RF7ASqmdxbN37WdpZMcB), to answer Aaron's two questions of 26 November 2026 (kept as heard: "the value can
change ... How is that supposed to be accounted for?" and "crypto assets ... as a treasury asset. So how does that
work?"). It builds on CX-money-global-payroll (on `origin/goal-16/money-global-payroll-design`) and
CX-composable-pieces. Nothing is superseded until Aaron answers section 7; section 8 lists what would change.

This is research and a recommendation, not accounting advice. Capxul's books are production and hold real money, so
question 1 asks for a qualified accountant's review before any customer relies on it.

## In short

USDC is not cash and is not a crypto asset like bitcoin. It is a promise that Circle will pay one dollar for each
coin, so it is a claim on Circle. If the company can redeem directly with Circle, it carries USDC at one dollar and
watches for a real depeg. A tiny dip, like 99.85 cents, is not booked; it is reported. A real break is booked as a
credit loss. If the company cannot redeem directly, the coin is carried at its market price instead, and every small
wobble goes through profit and loss. So the first advice to customers is to hold USDC with a direct redemption right.

Bitcoin and ether are different. Since this year's rule, a company marks them to market every month end, the gain or
loss goes into profit, and it keeps every purchase as a separate lot for tax. That is a new optional piece, `treasury`.

What waits on Aaron: an accountant's review, and five choices, each with a recommendation.

## 1. Recommendations

### (a) USDC

1. **Classify by the redemption right, per account.** A USDC account whose holder can redeem directly with the issuer
   (a Circle Mint account; Bridge's terms to be confirmed, question 3) is a **financial asset**: a receivable from
   Circle carried at its redemption value, one dollar a coin, less any expected credit loss (ASC 310 and 326; KPMG
   Q8.4.10, PwC 2.1.2, Coinbase's 10-Ks through 2024). A USDC account with no such right (a Safe held by a company with
   no Circle Mint account is "User Type B" in Circle's terms, which may not redeem) is measured at **fair value**
   through net income, as a crypto asset, unless the accountant concludes otherwise (question 2).
2. **The rate.** Every movement books at its own realised rate, as CX-money-global-payroll already says. At period end,
   a redemption-value account takes a **policy rate of 1.000000000** (a `rates` row whose source is *policy*) and posts
   nothing. Beside it, `rates` keeps the **market price** at the company's cut-off (source *market*, its venue named),
   used for the disclosure and for a **depeg check**: if the market price is below the policy rate by more than the
   threshold (recommended 0.5%, so below 0.995), or the issuer has suspended redemptions, the period close stops and
   asks for a credit-loss decision. A fair-value account takes the market price and is remeasured.
3. **The accounts.** One USDC account per wallet or custodian (the Safe; Bridge), presented on its own line,
   "Stablecoins (USDC)", outside cash and cash equivalents until the accountant says otherwise (FASB's August 2026
   proposal, and Coinbase's and PayPal's 2025 reclassifications, point to cash equivalents for directly redeemable coins
   later; measurement doesn't change either way, KPMG Q8.4.20). Under it: *Allowance for stablecoin credit loss* (a
   US-dollar asset account with a credit balance), *Stablecoin credit loss* (expense), *Gain or loss on remeasurement of
   digital assets* (income, for fair-value accounts), and *Stablecoin redemption and network fees* (expense).

**Worked example.** The company holds 100,000 USDC in its Safe, received for $100,000. At 30 November the market price
at the cut-off is 0.9985.

| Case | Entry at 30 November | Balance sheet |
|---|---|---|
| Redemption right, check passes (0.15% below one, inside 0.5%) | None. `rates` holds USDC→USD 1.000000000 *policy* and 0.998500000 *market* | Stablecoins $100,000; disclosed fair value $99,850 |
| No redemption right, fair value | Debit *Gain or loss on remeasurement* $150; credit *USDC (Safe)* $150, 0 USDC | Stablecoins $99,850. At 1.0000 in December, the reverse: $150 gain |
| Redemption right, real break (market 0.97, Circle's reserves impaired, the accountant expects 2% loss) | Debit *Stablecoin credit loss* $2,000; credit *Allowance* $2,000 | Stablecoins $100,000 less allowance $2,000. A later recovery reverses the allowance |

Movements: paying a contractor's $1,000 bill with 1,000 USDC books no difference. Redeeming 10,000 USDC at Bridge for
$9,990 books $10 to *fees*, not to a gain or loss. For tax, each of those is still a disposal of property with a gain
of about nothing (section 4).

### (b) Crypto held as a treasury asset (BTC, ETH)

1. **Fair value every period, gain or loss in net income** (ASC 350-60, from ASU 2023-08, required for fiscal years
   beginning after 15 December 2024). Price: one **principal market** per asset, the one the company can reach and
   normally trades in (ASC 820; PwC 4.1), taken at a fixed **cut-off**, the last trade before midnight in the company's
   time zone (PwC), price times units, with no discount for size. Strategy uses Coinbase as its principal market.
2. **Lots.** Every acquisition is a lot (units, date, cost including fees, wallet). Disposals take lots by a method the
   company records: **FIFO per wallet by default**, specific identification by a standing order (Treas. Reg.
   1.1012-1(j); Block uses FIFO, Tesla specific identification). Lots give the cost basis the disclosure needs, the
   realised gain against cost, and the tax basis, which is cost and never the mark.
3. **The period-end mark** posts, per asset account, the difference between the units at the market price and the
   lots' carrying amount, to *Gain or loss on remeasurement of digital assets*; there is no reversal next period (the
   carrying amount moves from mark to mark). A sale books the proceeds against the sold lots' carrying amount, the
   difference to *Realised gain or loss on digital assets*. The difference between the carrying amount and tax basis is
   a deferred tax item the accountant books (ASC 740).

**Worked example** (federal tax at 21%, state left out).

| Date | Event | Entry | ETH lots after |
|---|---|---|---|
| 3 Nov | Buy 1 ETH at $3,000 plus a $5 fee, paid in USDC | Debit *ETH (custodian)* 1 ETH, $3,005; credit *USDC* 3,005 USDC, $3,005 | Lot A: 1.0 ETH, cost $3,005, carrying $3,005 |
| 30 Nov | Mark at $3,400 (principal market, cut-off) | Debit *ETH* $3,400 − $3,005 = $395, 0 ETH; credit *Gain on remeasurement* $395 | Lot A: carrying $3,400 |
| 15 Dec | Sell 0.4 ETH at $3,500, $3 fee: proceeds $1,397 | Debit *USDC* $1,397; credit *ETH* 0.4 ETH, $1,360 (0.4 of $3,400); credit *Realised gain* $37 | Lot A: 0.6 ETH, cost $1,803, carrying $2,040 |
| 31 Dec | Mark at $3,300 | Debit *Loss on remeasurement* $2,040 − $1,980 = $60; credit *ETH* $60 | Lot A: carrying $1,980 |

Results for the year: book gain $395 + $37 − $60 = **$372**. Taxable gain, proceeds less tax basis, $1,397 − $1,202 =
**$195**, which is also the "cumulative realised gain" ASC 350-60 discloses (KPMG). The **$177** between them is the
carrying amount, $1,980, less tax basis, $1,803: a deferred tax liability of about **$37** at 21%. The year's
roll-forward: additions $3,005, remeasurement gains $395, dispositions at carrying amount $1,360, remeasurement losses
$60, closing $1,980.

### (c) Where it sits

- **`rates`** (core) gains a source on every row (*realised*, *typed*, *policy*, *market*) and, for a *market* row, its
  venue and the cut-off instant. A crypto price is just a rate between two assets; nothing new is needed beyond that.
- **`ledger`** (core) gains a **measurement** on each account whose asset is not the company's: *exchange* (ERPNext's
  revaluation, for pounds and euros, the default), *redemption* (a policy rate, no revaluation, the depeg check at
  close) or *fair value*. Each measurement names its own gain-or-loss account rather than the company's one unrealised
  exchange account. `ledger` declares an optional contract, *remeasure an account at period end*. With no filler, a
  *fair value* account is a `check` error.
- **`treasury`** (new, optional) fills that contract. It holds the lots, the lot method, buy, sell and transfer between
  wallets (each posting through `ledger`'s `post`), the mark, and four reports: holdings, the annual roll-forward,
  realised gains against cost, and tax lots with the book-tax difference. A company that holds only USDC with a
  redemption right never mounts it. It is chosen at build time like every optional piece and is not in the *Capxul core*
  preset.

### (d) What the framework lacks

1. **A non-contract asset.** `Blueprint.asset.token({ symbol, decimals })` is read as a token contract whose
   `decimals()` the host checks. Bitcoin, native ether and a custodian's balance have no contract. Needed: an asset
   kind for a coin with no contract (for instance `Blueprint.asset.coin({ symbol: "ETH", decimals: 18 })`).
2. **Money times a rate across very different decimals.** CX-money-global-payroll's converting helper (gap 6, Company
   currency, #882) must be exact for 18 decimals against 2, with a rate per whole unit of up to 9 places. 1 ETH at
   $3,400 is 10¹⁸ base units times 3,400 rounded to cents; a per-base-unit rate would be 3.4 × 10⁻¹⁵ and must never be
   stored. This is a requirement on an existing gap, not a new one. The 128-bit amount holds any realistic wei balance.
3. **A month-end schedule in the company's zone.** `Blueprint.time.every` takes a calendar anchor and a zone; whether
   it can say "the last day of each month" is unconfirmed. If not, a gap. The close may also stay a person's or an
   agent's call, as payroll's pay run is today.
4. **An optional build-time contract** (CX-composable-pieces gap 3) is reused for *remeasure an account*; nothing new.
5. **A price feed** is an outside dependency, Aaron's call, after typing prices by hand starts to hurt; not needed to
   build any slice here.

### (e) Slices

All come after CX-money-global-payroll's currency slice (accounts in several assets, both amounts on every line).

| # | Slice | Done when |
|---|---|---|
| T1 | `rates`: a source on every row, venue and cut-off on a *market* row | A journey types USDC→USD 1.000000000 *policy* and 0.998500000 *market* for 30 November; reading "the rate for a redemption account" returns 1, "the market price" returns 0.9985 with its venue |
| T2 | `ledger`: measurement per account; *redemption* with the depeg check at close | Example (a): closing November with 100,000 USDC at market 0.9985 posts nothing and reports fair value $99,850; at 0.97 the close is refused until an allowance entry or a recorded acknowledgement exists |
| T3 | Framework: the non-contract asset | `ETH` declared with 18 decimals compiles; 1 ETH round-trips as 10¹⁸ base units on the wire; a money field of it converts to $3,400.00 at a rate of 3400 |
| T4 | `treasury`: lots, buy and sell by FIFO or specific identification | Example (b): after the 15 December sale, the one lot left holds 0.6 ETH at cost $1,803; with a standing specific-identification order on two lots, the named lot is used |
| T5 | `treasury`: the mark, filling `ledger`'s contract | Example (b): marks post $395 and −$60, the sale posts $37; the ETH account's dollar balance equals the sum of its lots' carrying amounts after every step; without `treasury`, a *fair value* account fails `check` |
| T6 | `treasury`: the four reports | Example (b): roll-forward 3,005 / 395 / 1,360 / 60 / 1,980; cumulative realised gain $195; the tax-lot report shows 0.4 ETH, basis $1,202, proceeds $1,397; book-tax difference $177 |

T1 and T2 are what USDC needs and can go first. T3 to T6 wait on question 4.

### (f) Questions for Aaron

1. **An accountant's review.** Recommended: yes. Before any customer's books rely on T2 or `treasury`, a certified
   public accountant with digital-asset experience reads this record and the worked examples. This is production and
   money, and the answers to questions 2 and 3 are judgments only an accountant (and the customer's auditor) can sign.
   It is an outside spend, so it's your call.
2. **Customers hold USDC with a direct redemption right.** Recommended: yes, Capxul's setup guides each company to a
   Circle Mint account (or confirms Bridge's own redemption terms). It decides whether USDC sits still at a dollar or
   wobbles through profit every month.
3. **USDC at Bridge.** Recommended: treat a Bridge balance as a claim on Bridge, measured like a redeemable stablecoin,
   and ask the accountant whether the company or Bridge holds the asset, and whose credit risk it is. CX-bridge reads
   Bridge as holding USDC in custody.
4. **`treasury` as an optional piece, built after the USDC slices.** Recommended: yes, optional, not in *Capxul core*,
   built when a customer wants to hold bitcoin or ether. The other choice: in core, so every company can.
5. **The defaults.** Recommended: FIFO per wallet, with specific identification by standing order; one principal market
   per asset chosen by the company; midnight in the company's zone as the cut-off; a 0.5% depeg threshold; prices
   typed by hand until a feed is its own call. Each is a setting, so a company's accountant can change it.
6. **USDC lots for tax.** Recommended: when `treasury` is mounted, USDC accounts may keep lots too; without it, Capxul
   reports each USDC disposal at a basis of one dollar. Whether that is acceptable for a company's tax return is the
   accountant's call.

## 2. USDC under US GAAP: the research

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

## 3. Crypto treasury assets under ASU 2023-08: the research

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
  1 January 2025; Notice 2025-7 gave 2025 relief. So books keep lots per wallet, and the lot method is a written
  record, which T4 keeps.
- **Form 1099-DA:** gross proceeds for 2025 sales, basis for assets acquired after 2025. Corporations are exempt
  recipients, though a broker may still send one; qualifying stablecoin sales of $10,000 or less a year need not be
  reported by a broker using the optional method. A C-corporation should rely on its own lots, not on 1099-DAs.
- **Contractors** paid in crypto: report the fair value in dollars on the payment date (Notice 2014-21, A-13, now
  Form 1099-NEC); the threshold is $2,000 for payments after 2025.
- **Character:** capital; a corporation's capital losses offset only capital gains, carried back 3 and forward 5 years
  (Pub. 542). The wash-sale rule covers "stock or securities"; we read it as not reaching crypto, but no IRS text says
  so.
- **Book and tax differ:** fair value for books, cost for tax, so a deferred tax line (section 1(b)). The corporate
  minimum tax (over $1 billion of average income) can ignore unrealised fair-value gains by election (Notice 2025-49,
  s. 5.03); irrelevant to small customers.
- **States:** Delaware's franchise tax under the assumed par value method uses "total gross assets" from Form 1120
  Schedule L, so fair-value marks move it ($400 per million, minimum $400, cap $200,000). State income tax conformity
  varies and is not researched here.

## 5. IFRS, briefly (noted, not designed)

The IFRS Interpretations Committee (June 2019): a cryptocurrency holding is an intangible asset under IAS 38, or
inventory under IAS 2 when held for sale in the ordinary course (broker-traders at fair value less costs to sell). So
there is no fair value through profit as US GAAP now requires; IAS 38 allows cost, or revaluation through other
comprehensive income where an active market exists (IAS 38 para. 72, not fetched). The decision covers only holdings
that create no contract, so USDC needs its own analysis, likely IFRS 9. On 19 November 2026 the IASB added a project on
cryptocurrencies and stablecoins, to explore fair value through profit or loss and whether some stablecoins are cash
equivalents under IAS 7. A non-US company would need a second measurement per account; `ledger`'s measurement setting
is where it would go.

## 6. ERPNext's own handling, and where it falls short (`a6f54f9c`)

- **What it does.** Currency Exchange (`erpnext/setup/doctype/currency_exchange`) holds a date, from, to and a rate of
  9 places. `get_exchange_rate` (`erpnext/setup/utils.py`, line 136) takes a stored row first, then the inverse row,
  then Pegged Currencies (only if `allow_pegged_currencies_exchange_rates`), then the outside provider. So a typed
  *policy* row of one for USDC already outranks a peg, as section 1(a) wants.
- **Revaluation.** Exchange Rate Revaluation (`exchange_rate_revaluation.py`) picks every balance-sheet ledger account
  of root type Asset, Liability or Equity whose `account_currency` is not the company's, and **not of `account_type`
  Stock** (lines 198–209). For each it divides the booked base balance by the account-currency balance for the current
  rate, takes the new rate from `get_exchange_rate` on the posting date, and posts the difference (lines 275–291) as a
  multi-currency Journal Entry to the company's single `unrealized_exchange_gain_loss_account` (lines 358–366). Accounts
  whose units are nil but whose base balance isn't are cleared to it as well. Reversing it is a separate entry
  (`reversal_of`). A `rounding_loss_allowance` below one ignores dust.
- **Carrying USDC and ETH through it.** Mechanically both work: a USDC or ETH "currency", an account in it, a rate row
  at month end, and revaluation posts units times rate less booked value. For USDC at a policy rate of one it posts
  nothing, which is right for a redemption-value account.
- **Where it falls short.**
  1. *One gain-or-loss account, named for exchange.* ASC 350-60 wants crypto remeasurement reported separately in net
     income; a credit loss on USDC is not an exchange difference at all. Fix: a gain-or-loss account per measurement
     (section 1(c)).
  2. *No lots.* An account's carrying rate is its average (booked base over units). A sale books the received amount
     against that average, which is neither FIFO nor specific identification, so neither the realised gain against
     cost nor the tax basis can be read back. ERPNext's FIFO lives only in its stock ledger, and revaluation skips Stock
     accounts, so modelling ETH as a stock item gives lots but no fair value. Fix: `treasury`'s lots.
  3. *Revalue-and-reverse.* Built for foreign currency, where the next period starts from the booked rate. For a
     fair-value asset the carrying amount must move from mark to mark so lots stay true. Fix: no reversal for *fair
     value*.
  4. *No impairment or credit loss.* Nothing models an allowance; under ASU 2023-08 none is needed for BTC or ETH, but
     USDC at redemption value needs a credit-loss entry by hand. Fix: an ordinary journal entry to the allowance
     account, prompted by the depeg check.
  5. *No price provenance.* A Currency Exchange row has no venue or time of day; ASC 820 needs a principal market and
     a cut-off. Fix: T1.
  6. *Precision.* Frappe's currency precision tops out at 9 places, short of ether's 18; Orthograph's base-unit money
     avoids this, but the converting helper must be exact (gap 2).

## 7. Aaron's answers

Not yet asked. The lead brings section 1(f) to him.

## 8. What would change once he answers

Nothing is applied in this pull request. If questions 2, 4 and 5 are answered as recommended, the change would:

- **CX-money-global-payroll**, item 5: "USDC to US dollars is a standing row of one (ERPNext's Pegged Currencies) until
  a rate says otherwise" would become "USDC to US dollars is a policy row of one for an account with a redemption
  right, checked against the market price at each close (CX-crypto-accounting)". Item 8 would add that revaluation
  applies to *exchange* accounts only.
- **CX-composable-pieces**: `treasury` added to the optional pieces; `ledger`'s row adds the *remeasure an account*
  contract; `rates`' row adds the source.
- **`examples/capxul/blueprint/assets/usdc.ts`**: its comment, already proposed by CX-money-global-payroll, would add
  that its measurement follows the account's redemption right.

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
- Whether Bridge's terms give a Capxul customer a direct redemption right, or whose asset a Bridge balance is.
- Whether costs to sell are excluded at remeasurement, stated in those words by any guide (our reading of ASC 820).
- That the wash-sale rule doesn't reach digital assets (no IRS statement found).
- Whether `Blueprint.time.every` can anchor to the last day of a month.
- Any state's corporate income tax treatment of digital assets.
- Whether FASB has redeliberated the cash-equivalents proposal since comments closed on 19 November 2026.
