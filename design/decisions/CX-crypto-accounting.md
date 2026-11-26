# CX-crypto-accounting: how a dollar-reporting company accounts for USDC, ether and bitcoin in its Safe

**Status: decided, 26 November 2026, by Aaron** (section 8), in answers to two drafts the same day. Proposed by Goal
16's 📐 designer thread, started by Goal 16's lead (session_01S8RF7ASqmdxbN37WdpZMcB), for Aaron's questions of 26
November 2026 (kept as heard: "the value can change ... How is that supposed to be accounted for?" and "crypto assets
... as a treasury asset. So how does that work?"). It builds on CX-money-global-payroll (#1121, on `goal/capxul` once
it lands; until then on `origin/goal-16/money-global-payroll-design`), CX-onchain-safe and CX-composable-pieces.

This is research and a design, not accounting advice. A qualified accountant reviews it before Capxul onboards real
money; building goes ahead now (Aaron, section 8). Capxul prepares books; it doesn't file them.

## In short

A Capxul company reports in dollars and keeps its crypto in its own Safe: USDC, ether, and bitcoin as a wrapped token.
It can't redeem USDC with Circle directly, so all three are crypto assets for the books, carried at market price, not
cash. The price comes from Chainlink. At each month end Capxul reads Chainlink's last price before midnight, marks
every holding to it, and puts the difference into profit and loss. If Chainlink has no fresh price, the month end
stops until someone types one in, and the books say it was typed.

Every coin that comes in is kept as a lot, with its date and cost. When coins go out, the oldest go first. The books
show the gain against cost on each sale, and the month-end mark carries the rest. The accountant gets every lot, so
they can use whatever method they choose when they file.

It's all core, no optional piece. Nothing is left for Aaron to decide.

## 1. The design

### (a) Prices: Chainlink

1. **The source.** Every price comes from a Chainlink price feed (USDC/USD, ETH/USD, BTC/USD), read on chain through
   `chain-evm` (Aaron: "chainlink decided"). There is no principal-market setting: the feed is the price. The feeds are a
   build-time list of proxy addresses, read on Ethereum mainnet by default (section 6 lists them).
2. **Which round.** At the month-end cut-off, midnight at the end of the month's last day in the company's zone, the
   books take the last round whose `updatedAt` is at or before the cut-off. They read `latestRoundData` and, if a round
   landed after the cut-off, walk back with `getRoundData`. The price row records the feed address, the round id, the
   answer with its decimals, and `updatedAt`.
3. **Stale or missing.** If the round is older than the feed's heartbeat, or the read fails, the mark stops for that
   asset. A person types a price, and the row is recorded as *typed*, with who typed it.
4. **Movements.** A movement with a dollar side, such as a customer paying a $100,000 invoice in USDC, books at its own
   realised rate, as CX-money-global-payroll says. A movement with no dollar side, such as a swap or a receipt from
   another wallet, books at the last Chainlink round before its block's time.
5. **What a feed is.** A feed updates when the price moves by more than its deviation threshold, or when its heartbeat
   passes. On Ethereum mainnet USDC/USD's threshold is 0.25%, so a dip to 0.9985 (0.15%) may not show until the next
   heartbeat, up to 23 hours. The books take what the feed says; the error is bounded by the threshold.

### (b) What is held, and how it is measured

- **USDC** in the company's Safe. With no direct redemption right (Circle's terms: a holder with no Circle Mint account
  "may not redeem USDC with Circle"; Aaron: "it cant", "cant be done"), it is not a financial asset (KPMG Q8.4.10;
  PwC 2.1.2), so not cash. Bridge never holds it: Bridge moves money in and out, and the USDC lands in the Safe (Aaron:
  "its never in bridge its in the safe which is self custodial").
- **Ether**, native, in the Safe.
- **Bitcoin**, as a wrapped token in the Safe (cbBTC or WBTC), priced at BTC/USD. Native bitcoin needs a bitcoin wallet
  outside the Safe, which is "super complicated" in Aaron's words, so it is out.
- **Measurement:** each is a crypto asset at fair value, with the change in net income (ASC 350-60, from ASU 2023-08,
  for fiscal years beginning after 15 December 2024). The accountant's review confirms the classification of USDC and
  of a wrapped token (FASB's transfers project, expected as a proposal in early 2027, would revise the scope test for
  wrapped tokens).
- **Presentation:** one balance-sheet line per asset, "Digital assets: USDC", "... ether", "... bitcoin", apart from cash
  and other intangibles; the gains and losses on their own lines in net income.

### (c) Lots and the books

1. **Every acquisition is a lot**: asset, Safe, date, units, cost in dollars (fees included). This holds for USDC too.
2. **Disposals go first in, first out, per Safe.** That is the IRS default for self-custody (Treas. Reg. 1.1012-1(j)),
   and it is what the books show. Each disposal records its lots, units, dollar proceeds and *Realised gain or loss on
   digital assets*, which is proceeds less the lots' cost. Paying a contractor's $1,000 bill with 1,000 USDC bought at a
   dollar realises nothing.
3. **Two accounts per asset.** *Digital assets: <asset> (Safe)* holds the units at lot cost. *<asset> fair-value
   adjustment* is a dollar-only account that holds the mark. Together they are the balance-sheet line.
4. **The month-end mark.** The adjustment's target is units times the Chainlink price, less the remaining lots' cost. The
   mark posts the change in that target to *Gain or loss on remeasurement of digital assets*. It is never reversed: next
   month starts from this one. The adjustment is also exactly the difference between book value and tax cost, which is
   what the accountant needs for deferred tax.
5. **The accountant's file.** Capxul prepares the books and doesn't file them (Aaron: "these are going to go to a real
   accountant before filing anyway"). With every lot and every disposal in hand, the accountant can apply specific
   identification, or anything else, at filing.
6. **Reports**, from ASC 350-60's disclosures: holdings per asset (units, cost, fair value); each year's roll-forward
   (additions, dispositions, gains, losses); cumulative realised gains and losses; the cost method (FIFO); and the lot
   export.

**Worked example 1: USDC.** All prices are Chainlink rounds.

| Date | Event | Entry | After |
|---|---|---|---|
| 2 Nov | A customer pays a $100,000 invoice with 100,000 USDC | Debit *USDC (Safe)* 100,000 USDC, $100,000; credit *Receivable* $100,000 | Lot U1: 100,000 at $1.00 |
| 30 Nov | Round: 0.9985 | Target 99,850 − 100,000 = −$150. Debit *Remeasurement* $150; credit *USDC adjustment* $150 | Balance sheet $99,850 |
| 10 Dec | Pay a contractor's $1,000 bill with 1,000 USDC | Debit *Payable* $1,000; credit *USDC (Safe)* 1,000 USDC, $1,000 (lot U1) | Realised nil; U1: 99,000 |
| 31 Dec | Round: 1.0000 | Target 99,000 − 99,000 = $0; change +$150. Debit *USDC adjustment* $150; credit *Remeasurement* $150 | Balance sheet $99,000 |

**Worked example 2: ether.**

| Date | Event | Entry | After |
|---|---|---|---|
| 3 Nov | Buy 1 ETH for 3,005 USDC (price 3,000 plus a 5 USDC fee) | Debit *ETH (Safe)* 1 ETH, $3,005; credit *USDC (Safe)* 3,005 USDC, $3,005 (USDC lots at $1.00, realised nil) | Lot E1: 1 ETH at $3,005 |
| 30 Nov | Round: 3,400 | Target 3,400 − 3,005 = $395. Debit *ETH adjustment* $395; credit *Remeasurement* $395 | Balance sheet $3,400 |
| 15 Dec | Sell 0.4 ETH for 1,397 USDC (after a 3 USDC fee) | Debit *USDC (Safe)* 1,397 USDC, $1,397; credit *ETH (Safe)* 0.4 ETH, $1,202 (E1); credit *Realised gain* $195 | E1: 0.6 ETH, cost $1,803; new USDC lot at $1.00 |
| 31 Dec | Round: 3,300 | Target 1,980 − 1,803 = $177; change −$218. Debit *Remeasurement* $218; credit *ETH adjustment* $218 | Balance sheet $1,980 |

For the year, the book gain is $395 + $195 − $218 = **$372**. The realised gain against cost is **$195**, which is the
FIFO tax gain. The adjustment of **$177** is book value less tax cost: about $37 of deferred tax at 21%, for the
accountant to book. The roll-forward: additions $3,005, dispositions $1,397, gains $590, losses $218, closing $1,980.

### (d) Where it sits

All in core, as on-chain and off-chain money (Aaron: "its part of the thing, this is onchain offchain solution"):

- **`company`** owns the asset files: USDC, ETH, and wrapped BTC.
- **`rates`** gains a source on every row: *realised*, *chainlink* (with feed, round id and `updatedAt`), or *typed*
  (with who typed it). It also gains the read of the Chainlink feeds.
- **`ledger`** gains a measurement on each account whose asset is not the company's. *Exchange* is ERPNext's
  revaluation, for pounds and euros; *fair value* is for digital assets. It also gains the lots, FIFO disposals, the
  adjustment and remeasurement accounts, the month-end mark and the reports.

There is no `treasury` piece. Both measurements live in `ledger`, so the open value sets of CX-composable-pieces gap 2
(#1132) aren't needed for this.

### (e) What the framework lacks

1. **A native coin.** `Blueprint.asset.token({ symbol, decimals })` is read as a token contract whose `decimals()` the
   host checks. Native ether has no contract. It needs an asset kind for a chain's own coin, for instance
   `Blueprint.asset.native({ symbol: "ETH", decimals: 18 })`. USDC and wrapped bitcoin are tokens and need nothing new.
2. **A Chainlink adapter.** The repository has none. Reading `AggregatorV3Interface` (`decimals`, `latestRoundData`,
   `getRoundData`) from its ABI is a view call on someone else's contract. Adapters from an ABI are ST2.02 (`erc20`
   first, provisional); a read-only call from an operation, outside a transaction, needs confirming in it. A stand-in
   feed, whose rounds a journey sets, is needed for the checks.
3. **Exact conversion across decimals.** CX-money-global-payroll's helper (gap 6, #882) must convert 18-place ether and
   an 8-place feed answer to cents exactly. Nothing else is new. The month-end trigger already exists:
   `Blueprint.time.every("1 month", { on: { day: "last" }, zone })`.

### (f) Slices

They come after CX-money-global-payroll's currency slice (accounts in several assets, both amounts on every line).
USDC needs P1 to P4 and P6; ether needs P5 as well.

| # | Slice | Done when |
|---|---|---|
| P1 | `rates`: a source on every row | A journey records a *chainlink* USDC/USD row (feed, round id, `updatedAt`, 0.99850000 at 8 decimals) and a *typed* row; both read back with their source |
| P2 | `rates`: the Chainlink read, against a stand-in feed | With rounds at 23:10 on 30 November and 00:20 on 1 December, and a cut-off of midnight, the 23:10 round is taken. With the last round 30 hours old against a 23-hour heartbeat, the mark is refused as stale, and a typed price is then accepted and recorded as typed |
| P3 | `ledger`: lots and FIFO disposals | Example 2: after 15 December, lot E1 holds 0.6 ETH at cost $1,803 and the sale realised $195. Example 1: the 10 December payment realises nil |
| P4 | `ledger`: *fair value* and the month-end mark | Examples 1 and 2 post −$150 and +$150, then +$395 and −$218. After every step, each adjustment equals units times the latest price less the lots' cost |
| P5 | Framework: the native coin | ETH declared with 18 decimals compiles; 1 ETH round-trips as 10¹⁸ base units; a money field of it converts to $3,400.00 at an answer of 340000000000 (8 decimals) |
| P6 | `ledger`: reports and the lot export | Example 2: roll-forward 3,005 / 1,397 / 590 / 218 / 1,980; cumulative realised gain $195; the export lists E1 (3 November, 1 ETH, $3,005) and its disposal (15 December, 0.4 ETH, $1,397) |

### (g) Decided, nothing open

- **The accountant's review** comes before Capxul onboards real money; the building goes ahead now (Aaron: "we will do
  before onboarding real money but we are building none the less"). The review covers the classifications in 1(b), the
  presentation, and the deferred tax.
- **The tax method** is the accountant's at filing. The books keep lots and show FIFO.

## 2. USDC under US GAAP: the research

The first draft offered a second path for a company with a direct redemption right (a Circle Mint account): USDC as a
receivable at one dollar, with a depeg check. Aaron ruled it out (section 8). The research behind it stays below.

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

## 3. Crypto assets under ASU 2023-08: the research

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
  1 January 2025; Notice 2025-7 gave 2025 relief. So the books keep lots per Safe, and the lot method (FIFO) is written
  down, as section 1(c) does.
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

## 6. Chainlink's feeds: the research

Taken from Chainlink's published feed directory (`reference-data-directory.vercel.app/feeds-<network>.json`, the data
behind docs.chain.link's address pages) on 26 November 2026. The standard feeds (path `usdc-usd`, `eth-usd`, `btc-usd`):

| Network | Feed | Proxy | Heartbeat | Deviation | Decimals |
|---|---|---|---|---|---|
| Ethereum | USDC / USD | `0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6` | 82,800 s (23 h) | 0.25% | 8 |
| Ethereum | ETH / USD | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` | 3,600 s | 0.5% | 8 |
| Ethereum | BTC / USD | `0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c` | 3,600 s | 0.5% | 8 |
| Base | USDC / USD | `0x7e860098F58bBFC8648a4311b374B1D669a2bc6B` | 86,400 s | 0.3% | 8 |
| Base | cbBTC / USD | `0x07DA0E54543a844a80ABE69c8A12F22B3aA59f9D` | 1,200 s | 0.3% | 8 |
| Arbitrum | USDC / USD | `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3` | 255 s | 0.1% | 8 |
| Arbitrum | ETH / USD | `0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612` | 1,755 s | 0.05% | 8 |
| Arbitrum | BTC / USD | `0x6ce185860a4963106506C203335A2910413708e9` | 1,755 s | 0.05% | 8 |
| OP Mainnet | USDC / USD | `0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3` | 86,400 s | 0.1% | 8 |
| OP Mainnet | ETH / USD | `0x13e3Ee699D1909E989722E753853AE30b17e08c5` | 1,200 s | 0.15% | 8 |
| OP Mainnet | BTC / USD | `0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593` | 1,200 s | 0.1% | 8 |

On Base the directory lists ETH/USD and BTC/USD only as "SVR" variants (paths `eth-usd-svr`, `btc-usd-svr` and shared
ones), which is why Ethereum mainnet is the default; P2 confirms which proxies a build lists. The directory carries
several proxies per pair (SVR, shared and backup variants); the books take the standard one.

- **How feeds update.** "Deviation Threshold: ... The deviation of the real-world data beyond a certain interval
  triggers all the nodes to update. Heartbeat Threshold: If the data values stay within the deviation parameters, it
  will only trigger an update every X minutes / hours" (docs.chain.link, historical data).
- **Rounds.** "Rounds are identified by their `roundId`, which increases with each new round. This increase may not
  be monotonic." The proxy's id is the phase shifted left 64 bits, combined with the aggregator's round id, and the
  phase increments "each time the underlying aggregator implementation is updated". So the walk back from the latest
  round stays within a phase, and crosses into the previous phase if it must.
- **Reading.** `getRoundData(_roundId)` returns `roundId, answer, startedAt, updatedAt, answeredInRound`; `updatedAt`
  is "the timestamp when the answer was computed" (API reference).
- **Responsibility.** Chainlink leaves "data quality checks, circuit breakers, and appropriate contingency logic" to the
  user (developer responsibilities), which is what the stale-price stop is. On a rollup, Chainlink also publishes a
  sequencer-uptime feed; reading on Ethereum mainnet avoids needing it.

## 7. ERPNext's own handling, and where it falls short (`a6f54f9c`)

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
     income. Fix: the digital assets' own remeasurement account
     (section 1(c)).
  2. *No lots.* An account's carrying rate is its average (booked base over units). A sale books the received amount
     against that average, which is neither FIFO nor specific identification, so neither the realised gain against
     cost nor the tax basis can be read back. ERPNext's FIFO lives only in its stock ledger, and revaluation skips Stock
     accounts, so modelling ETH as a stock item gives lots but no fair value. Fix: lots and FIFO in
     `ledger` (section 1(c)).
  3. *Revalue-and-reverse.* Built for foreign currency, where the next period starts from the booked rate. Here the
     mark sits in its own adjustment account and moves from month to month, so cost stays readable. Fix: no
     reversal for *fair value*.
  4. *No price provenance.* A Currency Exchange row doesn't say where a rate came from. Fix: P1's source.
  5. *Precision.* Frappe's currency precision tops out at 9 places, short of ether's 18; Orthograph's base-unit
     money avoids this.

## 8. Aaron's answers

Aaron answered on 26 November 2026, in writing, as replies to the lead's questions on each draft. His words, exactly,
and how they are read.

On the first draft:

- On "If it can't [redeem directly]: USDC is probably carried at its market price": "it cant". So USDC is at fair
  value.
- On guiding customers to a direct redemption right: "cant be done". So there is no Circle Mint path and no depeg stop.
- On USDC at Bridge: "its never in bridge its in the safe which is self custodial". So the Safe holds the USDC, and
  Bridge only moves money in and out.
- On `treasury` as an optional piece: "its part of the thing, this is onchain offchain solution". So it is core, with
  no separate piece.
- On the defaults (FIFO, principal market, cut-off, depeg threshold, typed prices): "too complicated should jusolding
  usdct be h", read as "should just be holding USDC".

On the second draft:

- On prices typed by hand until a feed is decided: "chainlink decided". So prices come from Chainlink.
- On just USDC, with bitcoin, ether, tax lots and the other settings out: "these are in unless super complicated". So
  ether, wrapped bitcoin and lots are in; native bitcoin, a principal-market setting and a depeg threshold are out.
- On an accountant's review: "we will do before onboarding real money but we are building none the less".
- On the USDC tax basis: "what does that look like to let the accountant decide? remember we are just preping books its
  not like we are submiting the actual books ourselves. these are going to go to a real accountant before filing
  anyway". So the books keep every lot and show FIFO, and the accountant chooses the method at filing.

## 9. What it changes

Applied in this pull request:

- **CX-bridge**, a decided record, keeps its words and gains a superseded note. It said Bridge "lands a deposit as USDC
  in Capxul's custody and sends a transfer from it"; the USDC lands in the company's Safe. Its Bank Transaction, which
  holds USDC amounts, is unaffected. The Bridge checks author should confirm whether the Bridge checks (#769) assume
  custody.
- **Three live comments** that repeated CX-bridge are rewritten:
  - `examples/capxul/blueprint/things/bank-account/verbs/open.ts`
  - `examples/capxul/blueprint/things/bank-transaction/verbs/land.ts`
  - `examples/capxul/plugins/bridge/src/stand-in/webhooks.ts`

Not applied here, because the files aren't on `goal/capxul` yet or another pull request owns them:

- **CX-money-global-payroll** (#1121) gains the superseded note beside item 5, "USDC to US dollars is a standing row of
  one (ERPNext's Pegged Currencies) until a rate says otherwise", and beside item 9's Bridge custody reading, once it
  lands. Its own open question on how to classify USDC is answered here.
- **`examples/capxul/blueprint/assets/usdc.ts`**: #1121 already rewrites its comment. The ETH and wrapped-BTC asset files
  come with P5 and P3.
- **CX-composable-pieces** needs no change of words. Its `rates` and `ledger` rows gain what section 1(d) lists when
  those slices build.

## Supersedes

- design/decisions/CX-bridge.md: "Bridge lands a deposit as USDC in Capxul's custody and sends a transfer from it" → "Bridge lands a deposit as USDC in the company's Safe, and a transfer is paid from the Safe"
- examples/capxul/blueprint/things/bank-account/verbs/open.ts: "landing as USDC in Capxul's custody" → "landing as USDC in the company's Safe"
- examples/capxul/blueprint/things/bank-transaction/verbs/land.ts: "reached Capxul's custody as USDC" → "reached the company's Safe as USDC"
- examples/capxul/plugins/bridge/src/stand-in/webhooks.ts: "to Capxul's custody as USDC" → "to the company's Safe as USDC"
- design/decisions/CX-money-global-payroll.md: "USDC to US dollars is a standing row of one (ERPNext's Pegged Currencies) until a rate says otherwise" → "USDC to US dollars is marked each month end at Chainlink's USDC/USD price (CX-crypto-accounting)"

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

**Chainlink**
- Feed directory, Ethereum: https://reference-data-directory.vercel.app/feeds-mainnet.json; Base:
  https://reference-data-directory.vercel.app/feeds-ethereum-mainnet-base-1.json; Arbitrum:
  https://reference-data-directory.vercel.app/feeds-ethereum-mainnet-arbitrum-1.json; OP Mainnet:
  https://reference-data-directory.vercel.app/feeds-ethereum-mainnet-optimism-1.json
- Addresses page: https://docs.chain.link/data-feeds/price-feeds/addresses
- Historical data (heartbeat, deviation, rounds): https://docs.chain.link/data-feeds/historical-data
- API reference (`getRoundData`, `latestRoundData`): https://docs.chain.link/data-feeds/api-reference
- Developer responsibilities: https://docs.chain.link/data-feeds/developer-responsibilities
- L2 sequencer uptime feeds: https://docs.chain.link/data-feeds/l2-sequencer-feeds (not fetched)

**Not verified**
- The AICPA practice aid's stablecoin section (members only) and Deloitte's roadmap text (not fetchable).
- The ASC 350-60-50 paragraph number of each disclosure other than 50-2 and 50-6.
- Whether costs to sell are excluded at remeasurement, stated in those words by any guide (our reading of ASC 820).
- That the wash-sale rule doesn't reach digital assets (no IRS statement found).
- Any state's corporate income tax treatment of digital assets.
- Whether FASB has redeliberated the cash-equivalents proposal since comments closed on 19 November 2026.
- Which network Capxul's Safes live on (CX-onchain-safe doesn't say); prices are read on Ethereum mainnet regardless.
- Whether ST2.02's adapters can make a read-only view call outside a transaction.
- How the accountant classifies a wrapped bitcoin token (FASB's transfers project is open).
