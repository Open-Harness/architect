# CX-money-global-payroll: who Capxul's customers pay, and money in several currencies

**Proposed 26 November 2026** by Goal 16's 📐 designer thread (session_01S8RF7CZNk1PRTUe3WhRq8s), started by Goal 16's
lead (session_01S8RF7ASqmdxbN37WdpZMcB). **A draft until Aaron answers section 7.** Nothing here is applied to other
documents until he does; section 8 lists what changes then.

## In short

Capxul's customers are mostly American companies, often in Delaware, whose people work abroad. Their common case is
paying contractors abroad: one form on file (the W-8BEN), nothing withheld, nothing filed in the US. American
contractors need a W-9 and a yearly 1099. Only American employees need a US payroll tax engine. Employees abroad go
through an employer of record, which employs them locally for the customer.

Aaron decides seven things (section 7): start payroll with contractors and move the US tax engine later, reversing
this morning's call; let the books hold several currencies, reopening "assume dollars"; pick the default reporting
currency, dollars or USDC; take exchange rates from each payment for now; record employers of record by hand for now;
decide whether Capxul pays contractors itself before Bridge's slice; and have a professional answer section 6 before
real money moves.

Outside sources are data, read on 26 November 2026 and cited by link; the detail is in the appendix. **This is not
legal or tax advice.** Each point marked *unsure* is one the sources didn't settle; section 6 words them for a
professional.

## 1. Who Capxul's customers pay

Registering in Delaware creates a yearly franchise tax and annual report, due 1 March, and the need for a registered
agent. It creates no payroll duty by itself: Delaware's withholding and unemployment tests look at where the work is
done (*unsure* that nothing else applies, question 1). Payroll duties follow where each person works and who they are.

| Case | What the company must do | What Capxul does |
|---|---|---|
| (a) Employees in the US | Collect a W-4 and I-9; withhold federal and state income tax, Social Security and Medicare; pay federal and state unemployment tax; file quarterly and yearly returns; deposit electronically; give W-2s | Calculates (a US tax piece, later), records, collects the W-4; filing and deposits go to an outside service |
| (b) Contractors in the US | Collect a W-9; withhold 24% if no taxpayer number is given; file a 1099-NEC by 31 January for each contractor paid at least the year's threshold ($2,000 for 2026), or from whom anything was withheld | Collects the W-9, pays, totals the year, produces the 1099 figures and the upload file; the company files |
| (c) Contractors abroad | Collect a W-8BEN (a person) or W-8BEN-E (a business); pay for work done abroad is not wages and is not withheld; no 1099. Whether they are truly contractors is the local country's law (*unsure*, question 4) | Collects the form, pays in the contractor's choice; nothing withheld or filed |
| (d) US citizens abroad | Social Security and Medicare still apply when the employer is American, which a Delaware company is; income tax withholding often doesn't, on the employee's Form 673 | The US tax piece with two switches, later (question 3) |
| (e) Employees abroad | The local country's rules: a local company, the employer's own registration there, or an employer of record. A local employee can also create a taxable presence for the company (question 5) | Records the employer of record's invoice as a bill from a supplier |

## 2. What Capxul builds, in order

Each step is small and composes with what's built. Payroll's core (9a, built) stays as it is and holds no tax rule
(CX-payroll-tax point 1).

1. **Money in several currencies** (section 3). First, because every later step pays across currencies.
2. **Contractors, worldwide, recorded.** A contractor is ERPNext's Supplier (#1116), with a **tax form** on file (W-9,
   W-8BEN or W-8BEN-E: kind, received day, the file, its expiry) and a **payout method** (a wallet address, or a bank
   account in the contractor's currency). Paying one is a Payment Entry of type Pay to the supplier, which #1116's
   shape allows with no invoice; paying many is one operation making one Payment Entry each. **The money moves outside
   Capxul at this step:** the company pays from its own wallet or bank and Capxul records the payment, with both
   amounts when currencies differ. This keeps K44's order (25 November), which puts Bridge at slice 10 and the Safe at
   slice 2, last.
3. **The year-end for US contractors:** each W-9 contractor's total for the calendar year, and the 1099-NEC figures and
   upload file for those at or above the year's threshold, or with anything withheld. The threshold is a dated row,
   because it is indexed for inflation after 2026. The company files.
4. **Employer of record, recorded:** a supplier whose monthly invoice is a bill in its own currency, paid like a
   contractor.
5. **Paying through the rails.** When Bridge (slice 10) and the Safe (slice 2) are built, they become rails: pieces
   that move the money and then record it, and Bridge's receipt books the payment at its realised rate. Whether this moves earlier is
   decision 6.
6. **Later, each a piece of its own, when a customer needs it:** the US tax piece (case a, with case d's switches), on
   the open-withholding dataset imported at a pinned commit, with filing and deposits through an outside service; an
   employer-of-record integration; 1099 filing by API; other countries' tax pieces, CX-payroll-tax's shape.

## 3. Money in several currencies

Taken from ERPNext's own shape at `a6f54f9c` (the commit `examples/capxul/doctypes.md` names), in Orthograph's money
(`M6-money.md`: an integer in base units that names its asset).

1. **Assets.** Every currency and token a company holds is an asset file: `usd`, `gbp`, `eur`, `aed` as currencies (2
   places), `usdc` as a token (6 places). **USDC and US dollars are two assets.** USDC is redeemable one for one, but
   US accounting doesn't treat it as cash today: the crypto-asset standard of 2023 (ASU 2023-08) leaves redeemable
   stablecoins out, and the accounting standards board's proposal to call some of them cash equivalents has no final
   standard yet (*unsure* how to classify it, question 6). Keeping them apart costs nothing at a rate of one.
2. **An account has one currency** (ERPNext's `account_currency`), set when it is made and fixed once it has lines: the
   Safe's account is USDC, the Bridge account is what Bridge holds, a UK bank account is pounds.
3. **A company has one reporting currency** (ERPNext's `default_currency`), any asset. Every report is in it. Which
   asset is the default is decision 3. Today's companies, in USDC, stay valid as companies reporting in USDC.
4. **Every ledger line carries two amounts** (ERPNext's GL Entry): `debit` and `credit` in the company's currency, and
   `debitInAccountCurrency` and `creditInAccountCurrency` in the account's. Lines balance in the company's currency. An
   account's balance is read in its own currency, a report in the company's. ERPNext's third pair (transaction
   currency) waits until an invoice in a third currency needs it.
5. **Rates are rows, never fetched by the ledger.** ERPNext's Currency Exchange: day, from, to, rate (a decimal, not
   money), and here its source. A rate comes, in order, from the movement itself (a receipt shows what left and what
   arrived, so a payment needs no outside rate); from a row typed by the company, for invoices and period end; and
   later from a feed, a new outside dependency (section 4). USDC to US dollars is a standing row of one (ERPNext's
   Pegged Currencies) until a rate says otherwise.
6. **A payment between currencies** is one Payment Entry (ERPNext's shape): `paidAmount` in the paying account's
   currency, `receivedAmount` in the receiving account's, and each in the company's currency (`basePaidAmount`,
   `baseReceivedAmount`). A difference goes to the company's exchange gain or loss account
   (`exchange_gain_loss_account`); fees go to a bank charges account as a deduction line. Example: a company in US
   dollars pays a UK contractor's £1,000 bill, booked at 1.27 ($1,270). 1,275.00 USDC leaves and £1,000 arrives. Lines:
   the USDC account credit 1,275.00 USDC ($1,275.00 at the peg); the contractor's payable debit £1,000 ($1,270.00, its
   booked value); exchange loss debit $5.00. With no bill (an advance, as #1116 allows), the payable takes the realised
   value and no gain or loss arises.
7. **Rounding.** A company-currency amount is the account amount times the rate, rounded to the company currency's
   places. Frappe's `rounding_method` defaults to "Banker's Rounding (legacy)", which rounds half to even; its
   "Commercial Rounding" rounds half away from zero. This record picks half to even, Frappe's default (*a choice*).
   What is left after rounding a whole entry goes to exchange gain or loss, so every entry balances exactly.
8. **Period end.** ERPNext's Exchange Rate Revaluation: for each account not in the company's currency, its balance at
   the closing rate against its booked value, the difference posted as a journal entry to the company's unrealised
   exchange gain or loss account. Reversing it next period is a separate journal entry (ERPNext's `reversal_of`); this
   record reverses on the first day of the next period (*a choice*). It is an operation a person or agent calls.
9. **The Safe and Bridge.** The Safe holds USDC on chain: one USDC account per Safe (slice 2). By CX-bridge's reading,
   Bridge lands deposits as USDC in custody and sends from it, so the company's Bridge account is a USDC account too
   (*unsure*, question 7). A pound account at a bank outside Bridge is a pound account, fed by statements.
10. **What of ERPNext's shape is taken:** Account's currency, Company's currency and its two gain-or-loss accounts, GL
    Entry's account-currency pair, Journal Entry Account's rate and account-currency amounts, Payment Entry's two sides
    and base amounts, Currency Exchange, Pegged Currencies, Exchange Rate Revaluation. **Not yet:** the transaction
    currency pair, the feed, buying and selling rates, and the `FX` fields of record types not yet built, which each
    slice takes as it builds them.

**The framework gap** (CX-composable-pieces' gap 6, owned here). `M6-money.md` lets a row's asset come only from an
`account()` field and leaves a per-row currency for later. Items 2 to 6 need `money.of` a field naming an asset. That is
Company currency (#882), parked by Aaron's call; this record unparks it. Converting with a rate, and its rounding, is a
helper in the same values module, so every app rounds alike.

## 4. Outside services

Each is a new outside dependency, so each is Aaron's call. None is needed for steps 1 to 4 of section 2.

1. **Bridge**, already chosen (CX-grill section 4), for paying contractors in local money: dollars, euros, pounds,
   Mexican pesos, Brazilian reals and Colombian pesos. Elsewhere, USDC or a dollar wire. At slice 10, unless decision 6
   moves it.
2. **An exchange-rate feed:** Frankfurter (free, central banks' rates; ERPNext's default) or Bridge's own rates. When
   typing rates by hand starts to hurt.
3. **An employer of record:** Deel (a public API; its contractor stablecoin wallet runs on Bridge), Remote (a public API
   and an embedded partner programme), Oyster (partners only) or Rise (a stablecoin payroll API). Once a customer has
   employees abroad.
4. **Tax forms and 1099 filing:** the IRS's own e-filing system (IRIS, the Information Returns Intake System: free,
   needs a transmitter code that can take 45 days), or TaxBandits, Abound or Stripe. When a customer has many US
   contractors.
5. **US payroll tax filing and deposits:** Check, Zeal or Gusto Embedded; Symmetry calculates only. With the US tax
   piece. None of them works outside the US (Symmetry adds Canada).

## 5. What it changes in the plan

1. **Pause the US tax module.** CX-payroll-tax's shape stands (a piece per jurisdiction, rates as dated data); the US
   piece moves from next to later. The spike (#1119) lands as a record, and its import plan is how the piece starts.
   Payroll's 9b and 9c go on: they are jurisdiction-free. A Capxul with payroll and no tax piece is valid; slips then
   carry no tax lines (agreed with CX-composable-pieces).
2. **Add, in slice 7: money in several currencies.** The currency slice comes after the `company` and `ledger` pieces
   have moved (CX-composable-pieces, moves 1 and 2), works inside `company`, `rates`, `ledger` and `payments`, and comes
   before slice 7b's invoices; the rest of the move runs in parallel with currency. It unparks Company currency (#882) as a framework gap Goal 16 claims; its
   checks (#923, a draft) are rewritten to this record by an author.
3. **#1116 (parties and payments) lands as it is.** Its USDC amounts are right for a company reporting in USDC, so its
   journeys stay valid. It lands in `blueprint/things/`, and the move then takes its customer and supplier things and
   their groups to `parties`, and Payment Entry to `payments` (CX-composable-pieces, section 6). Its decision already leaves "the received amount and exchange rates" for later
   (`CX-parties-payments.md`, "Also later"); the currency slice adds them to Payment Entry, and the account-currency
   pair to GL Entry, as new journeys.
4. **Add the `contractors` piece** (section 2, steps 2 and 3), once `payments` holds Payment Entry and before the US tax
   piece.
5. **Slice 10 (Bridge)** adds external accounts in a payee's currency and books a transfer's receipt as a payment
   between currencies. CX-bridge's Bank Transaction, which holds USDC even on a euro account, gains the account's own
   amount beside it.
6. **The catalogue's `FX` rows** stop being deferred: each is taken with its rate and `base_*` fields as its slice
   builds it.

**The pieces**, agreed with the composable-pieces thread (#1123, session_01S8RF7CccTeLkaVUQpKSExm) on 26 November 2026:

- Money is Orthograph's value, not a piece. `company` holds the asset files and the reporting currency.
- `rates` (core) holds Currency Exchange, its settings and Pegged Currencies; `ledger` reads it and never fetches.
- `ledger` holds an account's currency, both amounts on every line, the gain-or-loss accounts, rounding, revaluation,
  and each party's outstanding.
- `payments` (core, below `invoicing`) holds Payment Entry, including between currencies, and settles a party's
  outstanding. It only records money that moved, with its mode of payment and a reference, through an in-commit
  `record`. A rail is a piece that moves the money first and then records it through `payments.record`:
  `bridge-accounts` for payouts, later the Safe. Without a rail the company moves the money itself and Capxul records
  it, which is section 2's step 2.
- What is owed is the ledger's party outstanding, not a new record. In both records: payroll calculates and posts its
  accrual through `ledger.post` in its own commit; it never writes ledger lines itself and never moves money.
  A rail moves money; `payments` records it and settles outstandings. `ledger` owns the lines, both amounts and revaluation.
- `contractors` (core): a `parties` Supplier with the payer's tax form, a payout method, paying many through `payments`
  (and through `bridge-accounts` for a payout to an external account), and the 1099 year-end. The forms can't live in `payroll-tax-us`, because every US payer needs them. Payroll stays for
  employees.
- `bridge-accounts` (renamed from `bridge`, so as not to clash with the adapter `@orthograph/bridge`) holds external
  accounts and transfers out; `payroll-tax-us` is optional and later; `eor` is optional and
  later, and until then an employer of record is a supplier.

**Order:** the currency slice as in point 2, then `contractors`. Both records mark three things as resting on decision
1: `contractors` as core, no tax piece mounted for now, and this order. If Aaron says no, `payroll-tax-us` is mounted
from the start and `contractors` comes later as an optional piece. Choosing between two countries' tax pieces per
employee waits on a decision of its own (one filler per contract, CX-composable-pieces); this record needs none,
since no tax piece is mounted for now.

## 6. Questions for a professional

For an accountant or lawyer who knows US companies with people abroad.

1. Does a Delaware corporation whose people all work outside Delaware have any Delaware payroll withholding or
   unemployment duty? (We read none, from Delaware's own "performed in the State" and "localized" tests.)
2. For a foreign contractor working entirely outside the US, is a Form 1042-S ever required, or is a W-8BEN on file
   enough? Does a missing W-8BEN change that?
3. For a US citizen employed abroad by a Delaware company: must the company withhold Social Security and Medicare in
   every case, and when may it rely on Form 673 to skip income tax withholding?
4. In the countries our customers' people are most often in (to be listed from real customers), when is a contractor
   likely to be treated as an employee, and what does the US company then owe there?
5. Can a single foreign employee, hired without an employer of record, create a taxable presence for the US company in
   that country? Which roles carry that risk?
6. How should a small US company classify USDC it holds: cash, cash equivalent, or another financial asset? Does the
   pending stablecoin guidance change that for 2026 or 2027?
7. When Capxul serves Bridge to customers, whose asset is the balance at Bridge, the customer's or Capxul's, and is it
   dollars or USDC on the customer's books?
8. For a company reporting in US dollars, which exchange-rate source is acceptable for period-end revaluation and for a
   payment booked without a receipt?
9. Does paying contractors in USDC change any US or local reporting, compared with paying in money?

## 7. Decisions for Aaron

Each with the recommendation first.

1. **Payroll starts with contractors worldwide.** Recommended: yes. Contractors abroad have a W-8BEN on file; US
   contractors a W-9 and their 1099 figures. The US tax engine becomes a later piece. This reverses your call of this
   morning, 26 November, which picked US payroll tax next ("keep usa and usd"). The other choice: keep US payroll tax
   next.
2. **Several currencies in the books.** Recommended: yes, ERPNext's shape (section 3), next in the books. This
   reopens your call of 24 November: "for now, can't we just assume dollars? It's always going to be tied to some sort
   of crypto asset, because that's what the thing's in." The other choice: one asset until a customer needs more.
3. **The default reporting currency.** Recommended: US dollars, with USDC kept as its own asset at a standing rate
   of one, because a company's accounts and taxes are in dollars. The other choice: USDC, which matches your words that
   it is always tied to a crypto asset. Either way, a pound account works the same.
4. **Exchange rates.** Recommended: from each payment and typed by hand now; a feed later, as its own call. The other
   choice: a feed now.
5. **Employees abroad.** Recommended: through an employer of record, its invoice recorded by hand for now; which one to
   integrate, later. The other choice: pick and integrate one now.
6. **When Capxul itself pays contractors.** Recommended: keep K44's order, so contractors are recorded first and paid
   by the company outside Capxul until Bridge (slice 10) and the Safe (slice 2). The other choice: move Bridge's
   payouts earlier, right after contractors, because paying contractors abroad is the main thing customers need.
7. **Who answers section 6, and when.** Recommended: before the first real contractor is paid through Capxul. It is
   production and likely money.

## 8. Supersedes

**Applied only once Aaron agrees to decisions 1 and 2, on that day.** Then one change rewrites each live doc and marks
each dated record, and `git grep` finds each old phrase only in dated records and `design/process/`. Lines below are
`<file>: "<old words>" → "<new words>"`; written as if decision 3 is US dollars.

Live docs:

- `design/goals/16-capxul.md`: "tax from a module per jurisdiction, the United States only, in dollars (CX-payroll-tax)" → "tax from a piece per jurisdiction, later; contractors are their own piece (CX-money-global-payroll)"
- `design/goals/16-capxul.md`: "in USDC, the one dollar asset every Capxul company uses for now" → "in USDC, the reporting currency of today's companies (CX-money-global-payroll)"
- `design/goals/16-capxul.md`: "parked by Aaron's one-dollar-asset call and unclaimed while parked" → "unparked by CX-money-global-payroll and claimed by Goal 16"
- `design/goals/16-capxul.md`: "payslips, the pay run and taxes, each run posting" → "payslips, the pay run and later taxes, contractors beside it, each run posting"
- `examples/capxul/doctypes.md`: "These are deferred by Aaron's call of 24 November 2026" → "Each is taken with its rate and base fields as its slice builds it (CX-money-global-payroll)"
- `examples/capxul/doctypes.md`: "amount is in USDC, the one dollar asset, so an `FX` row is taken without its exchange-rate and `base_*` fields" → "company keeps its books in its own currency"
- `examples/capxul/doctypes.md`: "35 carry exchange rates (`FX`, deferred: amounts are USDC alone)" → "35 carry exchange rates (`FX`, CX-money-global-payroll)"
- `examples/capxul/doctypes.md`: "a rate between two currencies: money-units question (CX-grill §3)" → "a rate between two currencies, in `rates` (CX-money-global-payroll)"
- `examples/capxul/doctypes.md`: "exchange_rate_revaluation.json` | money-units question (CX-grill §3) |" → "exchange_rate_revaluation.json` | in `ledger` (CX-money-global-payroll) |"
- `examples/capxul/doctypes.md`: "pegged_currencies.json` | money-units question (CX-grill §3) |" → "pegged_currencies.json` | in `rates` (CX-money-global-payroll) |"
- `examples/capxul/blueprint/assets/usdc.ts`: "The one dollar asset every Capxul company keeps its books in, for now" → "USDC, held in a Safe or at Bridge, its own asset beside US dollars"
- `docs/canon/status.md`: "| books | none | `packages/orthograph/src/modules/values`" → "| books | goal-16 | `packages/orthograph/src/modules/values`"
- `docs/canon/status.md`: "deferred by Aaron's call of 24 November 2026: every Capxul amount is USDC for now (`CX-grill.md`, section 3, #926); unclaimed while parked, its checks draft #923; `M6-money.md` leaves a per-row currency for later; 35 doctypes carry exchange rates; base units stand, and a mismatch is Orthograph's money-units question (`CX-grill.md`, section 3); after M6.10" → "unparked and claimed by CX-money-global-payroll; its checks draft #923, rewritten to it; `M6-money.md`'s per-row currency is built here; 35 doctypes carry exchange rates; after M6.10"

Dated records, each gaining "(Superseded by CX-money-global-payroll, <date>)" beside the words:

- `design/decisions/CX-grill.md`: "For now every Capxul company keeps its books in one dollar asset." → "A company keeps its books in its own reporting currency, with accounts in any currency."
- `design/decisions/CX-grill.md`: "A company's own currency and exchange rates are deferred by this call." → "A company's own currency and exchange rates are built in slice 7."
- `design/decisions/CX-grill.md`: "Company currency (#882) is parked and unclaimed" → "Company currency (#882) is claimed by Goal 16"
- `design/decisions/CX-grill.md`: "The one asset is USDC" → "Today's companies report in USDC"
- `design/decisions/CX-grill.md`: "each is taken in USDC alone, and its exchange-rate and `base_*` fields are left out until a new call from Aaron" → "each is taken with its exchange-rate and `base_*` fields as its slice builds it"
- `design/decisions/CX-payroll-tax.md`: "Capxul's payroll is built for the United States alone, in USDC" → "Capxul's payroll pays contractors worldwide first; the United States tax piece comes later"
- `design/decisions/CX-payroll-tax.md`: "These are not in dollars, so their modules" → "Their pieces follow the US piece, in each country's currency, and"
- `design/decisions/CX-payroll-tax.md`: "a company's own currency stays deferred" → "a company's own currency is built in slice 7"
- `design/decisions/CX-bridge.md`: "every company uses one dollar asset, USDC" → "a company keeps its books in its own currency"
- `design/decisions/CX-bridge.md`: "Unlike ERPNext's, the two amounts are not in the row's `currency`" → "The account's own amount is added beside them"
- `design/decisions/CX-ledger.md`: "Every amount is USDC in base units" → "Every amount names its asset, in base units"
- `design/decisions/CX-payroll.md`: "USDC in base units (`Amount`, and `Balance` where a draft may go below nothing); no field holds a currency or a rate" → "in base units naming its asset"
- `design/decisions/M6-money.md`: "A per-row currency is later" → "A per-row currency is built for Capxul (#882, CX-money-global-payroll)"
- `design/decisions/CX-parties-payments.md`, once #1116 lands: "Every amount is USDC in base units" → "Every amount names its asset, in base units"

Stays as it is: `examples/capxul/journeys/keep-the-books.ts` line 4, "Every amount is USDC in base units". It describes
that journey's own company, which reports in USDC, and stays true under this record; a journal entry journey in another
currency is new, the currency slice's.

## Appendix A: the cases, with their sources

**Delaware.** Annual report and franchise tax by 1 March: minimum $175 by the authorized-shares method, $400 by the
assumed-par-value method, report fee $50 ([corp.delaware.gov](https://corp.delaware.gov/paytaxes/)); a registered agent
with a Delaware street address ([FAQ](https://corp.delaware.gov/faqs-regarding-registered-agents/)). Withholding applies
to pay for "personal services performed in the State of Delaware"
([revenue.delaware.gov](https://revenue.delaware.gov/employers-guide-withholding-regulations-employers-duties/));
unemployment insurance to work "localized" there ([Del. Code 19 ch. 33](https://delcode.delaware.gov/title19/c033/sc01/index.shtml)).

**(a)** Social Security 6.2% each side on wages up to $184,500 for 2026; Medicare 1.45% each, no cap, and 0.9% more
withheld above $200,000; federal unemployment tax 6.0% on the first $7,000, less up to 5.4% state credit, on Form 940;
Form 941 quarterly; deposits by EFTPS; W-2s and the W-3 by 31 January; new hires reported to the state
([Publication 15](https://www.irs.gov/publications/p15)). Open data: [open-withholding](https://github.com/open-withholding/open-withholding)
(data CC0, federal and all 41 income-taxing states plus DC for 2026, each figure cited to its publication with a hash).
The spike (#1119, session_01S8RF7BjFY75HH4qYmgBWAR) found it reproduces all 4,794 Publication 15-T wage-bracket cells;
of the income-taxing states, 7 were checked against their own published examples and 34 plus DC are unchecked.
Neither dataset covers a company's own state unemployment rate, local taxes or reciprocity.

**(b)** Backup withholding 24% with no taxpayer number ([W-9 instructions](https://www.irs.gov/instructions/iw9)). The
1099-NEC threshold is $2,000 for payments after 2025 (Public Law 119-21), indexed for inflation after 2026, and a
1099-NEC is due at any amount where backup withholding was taken
([IRS](https://www.irs.gov/businesses/small-businesses-self-employed/am-i-required-to-file-a-form-1099-or-other-information-return),
[instructions](https://www.irs.gov/instructions/i1099mec)). E-filing at 10 or more returns of all kinds, through
[IRIS](https://www.irs.gov/filing/e-file-information-returns-with-iris) ([Publication 1099](https://www.irs.gov/publications/p1099)).

**(c)** Pay to a non-resident for services performed outside the US "is not considered wages and is not subject to
withholding" ([Publication 515](https://www.irs.gov/publications/p515)); W-8BEN
([instructions](https://www.irs.gov/pub/irs-pdf/iw8ben.pdf)). Form 1042-S covers "amounts from U.S. sources"
([instructions](https://www.irs.gov/instructions/i1042s)) (*unsure*, question 2).

**(d)** The foreign earned income exclusion (FEIE, Form 2555) is $132,900 for 2026
([Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf)); withholding may stop where the employee is
reasonably expected to exclude the pay, for example on [Form 673](https://www.irs.gov/pub/irs-pdf/f673.pdf)
([Publication 54](https://www.irs.gov/publications/p54)). Social Security and Medicare apply to US citizens employed
abroad by an American employer, which includes a corporation organized under a state's law
([IRS](https://www.irs.gov/individuals/international-taxpayers/social-security-and-medicare-tax-for-us-citizens-and-residents-employed-abroad-by-american-employers));
a totalization agreement's certificate of coverage keeps a person in one system
([IRS](https://www.irs.gov/individuals/international-taxpayers/totalization-agreements)).

**(e)** UK: register with HMRC before the first payday ([gov.uk](https://www.gov.uk/register-employer)); an overseas
employer has an "NI only" scheme ([PAYE20090](https://www.gov.uk/hmrc-internal-manuals/paye-manual/paye20090)). UAE: no
personal income tax ([u.ae](https://u.ae/en/information-and-services/finance-and-investment/taxation)); Emirati staff
in the GPSSA pension, 26% for those joining from 31 October 2023; wages through the Wage Protection System
([MOHRE](https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system)). India: salary tax
deduction under section 392 of the Income Tax Act 2025 from April 2026
([incometax.gov.in](https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tds-compliance)).
Pakistan (section 149), the Philippines (Form 1601-C monthly), Mexico (LISR article 96) and Nigeria make the payer
withhold monthly. Permanent establishment: [OECD Model, article 5](https://www.oecd.org/content/dam/oecd/en/publications/reports/2019/04/model-tax-convention-on-income-and-on-capital-2017-full-version_g1g972ee/g2g972ee-en.pdf).

## Appendix B: outside services and accounting, sources

- Bridge: [payment routes](https://apidocs.bridge.xyz/get-started/introduction/what-we-support/payment-routes.md),
  [exchange rates](https://apidocs.bridge.xyz/api-reference/exchange-rates/get-current-exchange-rate-between-two-currencies.md).
- Rates: [Frankfurter](https://frankfurter.dev/).
- Employers of record: [Deel](https://developer.deel.com/api/embedded/ic-worker-onboarding),
  [Deel and Stripe](https://stripe.com/newsroom/news/deel-and-stripe), [Remote](https://remote.com/resources/api/reference),
  [Oyster](https://docs.oysterhr.com/), [Rise](https://v2-docs.riseworks.io/quickstart) (its pricing from a third party
  only, *unsure*).
- Forms and filing: [TaxBandits](https://developer.taxbandits.com/docs/FormW9W8/w9w8overview),
  [Stripe](https://docs.stripe.com/connect/w8-w9-tax-forms).
- US payroll: [Check](https://docs.checkhq.com/docs/tax-deposits), [Zeal](https://docs.zeal.com),
  [Gusto Embedded](https://docs.gusto.com/embedded-payroll/v2024-04-01/docs/contractors-intro),
  [Symmetry](https://docs.symmetry.com/ste/overview/what-is-the-ste.md).
- USDC: [Circle](https://www.circle.com/transparency); ASU 2023-08's scope
  ([Deloitte DART](https://dart.deloitte.com/USDART/home/codification/assets/asc350-60/roadmap-digital-assets/chapter-2-classification/2-3-crypto-assets-within-scope)).
- Rounding: Frappe `version-15`, `frappe/core/doctype/system_settings/system_settings.json`, field `rounding_method`.
