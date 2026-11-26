# CX-money-global-payroll: who Capxul's customers pay, and money in several currencies

**Proposed 26 November 2026** by Goal 16's 📐 designer thread (session_01S8RF7CZNk1PRTUe3WhRq8s), started by Goal 16's
lead (session_01S8RF7ASqmdxbN37WdpZMcB). **A draft until Aaron answers section 7.** Nothing here is applied to other
documents until he does; section 8 lists what changes then.

Aaron reopened two things on 26 November 2026. Capxul's customers are mostly companies registered in the United States,
often in Delaware, whose people are mostly outside it, so a US payroll tax engine may not be the centre of Capxul's
payroll. And a company holds money in several currencies at once (a bank account in pounds, a Bridge account in
dollars, dollars in its Safe as a buffer for payroll and payments), so the books can't stay in one dollar asset
(CX-grill section 3, Aaron's call of 24 November; CX-payroll-tax, "the United States only, in dollars").

Outside sources are data, read on 26 November 2026, cited by link and not copied. **This is not legal or tax advice.**
Each point marked *unsure* is one the sources didn't settle; section 6 words them for a professional.

## 1. Who Capxul's customers pay

Registering in Delaware creates Delaware corporate duties and no payroll duty by itself. Payroll duties follow where
each person works and who they are. Five cases cover a Delaware company's people.

**Delaware itself.** Every Delaware corporation files an annual report and pays franchise tax by 1 March (minimum $175
by the authorized-shares method, $400 by the assumed-par-value method; report fee $50), and keeps a registered agent
with a Delaware street address ([corp.delaware.gov/paytaxes](https://corp.delaware.gov/paytaxes/),
[registered agents](https://corp.delaware.gov/faqs-regarding-registered-agents/)). Delaware withholding applies to
pay for "personal services performed in the State of Delaware"
([revenue.delaware.gov](https://revenue.delaware.gov/employers-guide-withholding-regulations-employers-duties/)), and
its unemployment insurance to work "localized" there
([Del. Code title 19 ch. 33](https://delcode.delaware.gov/title19/c033/sc01/index.shtml)). No source says in so many
words that incorporation alone creates no payroll duty; it follows from those tests (*unsure*, question 1).
**Capxul:** records the deadline and the franchise tax as a payable; nothing to calculate.

### (a) Employees in the United States

**The company must:** collect Form W-4 and Form I-9; withhold federal income tax by Publication 15-T; withhold and match
Social Security (6.2% each, on wages up to $184,500 in 2026) and Medicare (1.45% each, no cap, plus 0.9% withheld above
$200,000); pay federal unemployment tax (6.0% on the first $7,000, less up to 5.4% state credit) on Form 940; file Form
941 quarterly; deposit by electronic funds transfer (EFTPS); give W-2s and file them with the W-3 by 31 January; report
each new hire to the state; and register for withholding and unemployment tax in the state where the person works
([Publication 15, 2026](https://www.irs.gov/publications/p15)). State unemployment follows where work is "localized"
in Delaware's code; that every state words it the same is *unsure*.

**Capxul:** calculates (a US tax module on payroll's core, CX-payroll-tax's shape), records, collects the W-4. Filing,
deposits and state registration go to an outside service (section 4). The data for the calculation exists openly: the
spike thread (session_01S8RF7BjFY75HH4qYmgBWAR, draft #1119) found
[open-withholding](https://github.com/open-withholding/open-withholding) (data CC0, federal and all 41 income-taxing
states plus DC for 2026, each figure cited to its publication with a hash, reproducing all 4,794 Publication 15-T
wage-bracket cells; of the income-taxing states, only 7 were checked against their own published examples, and 34 plus
DC are unchecked) and a second dataset to check it against. Neither covers a company's own state unemployment rate,
local taxes or reciprocity.

### (b) Contractors in the United States

**The company must:** collect Form W-9 (name and taxpayer number); withhold 24% backup withholding if no number is
given ([W-9 instructions](https://www.irs.gov/instructions/iw9)); and file Form 1099-NEC, to the IRS and the
contractor, by 31 January for anyone paid **$2,000 or more** in a year, raised from $600 for payments after 2025 by
Public Law 119-21 ([IRS: am I required to file a 1099](https://www.irs.gov/businesses/small-businesses-self-employed/am-i-required-to-file-a-form-1099-or-other-information-return),
[1099-NEC instructions](https://www.irs.gov/instructions/i1099mec)). Filing is electronic at 10 or more returns of all
kinds together, through the IRS's free IRIS portal (CSV upload) or its IRIS application-to-application API, each needing
a transmitter control code that can take 45 days ([Publication 1099](https://www.irs.gov/publications/p1099),
[IRIS](https://www.irs.gov/filing/e-file-information-returns-with-iris)).

**Capxul:** collects and stores the W-9; pays; totals each contractor's year; produces the 1099-NEC figures and the
IRIS upload file. The company files it in IRIS, or a filing service does (section 4).

### (c) Contractors outside the United States

The likely largest case for Capxul's customers. **The company must:** collect Form W-8BEN from a person, or W-8BEN-E
from a business, as proof of foreign status ([W-8BEN instructions](https://www.irs.gov/pub/irs-pdf/iw8ben.pdf)). Pay
to a non-resident for services performed outside the United States "is not considered wages and is not subject to
withholding" ([Publication 515](https://www.irs.gov/publications/p515)). No 1099 goes to a foreign person. Whether a
1042-S is needed for foreign-source fees is *unsure*: its instructions cover "amounts from U.S. sources"
([1042-S instructions](https://www.irs.gov/instructions/i1042s)), while the IRS's contractor page names 1042-S without
the distinction. Whether the person is really a contractor, not an employee, is decided by the law of the country they
work in (*unsure* per country, question 4).

**Capxul:** collects and stores the W-8BEN (it expires; the form's own rules), pays in what the contractor chooses:
USDC from the Safe, or local money through Bridge where Bridge reaches (US dollars, euros by SEPA, pounds by Faster
Payments, Mexican pesos, Brazilian reals, Colombian pesos:
[Bridge payment routes](https://apidocs.bridge.xyz/get-started/introduction/what-we-support/payment-routes.md)).
Elsewhere, USDC or a US dollar wire. Nothing is withheld and nothing is filed.

### (d) US citizens working abroad

**The company must:** treat them as US taxpayers. Income tax withholding isn't required where it is reasonable to
believe the person will exclude the pay under the foreign earned income exclusion ($132,900 for 2026, Form 2555), for
example on their Form 673 ([Publication 54](https://www.irs.gov/publications/p54),
[Form 673](https://www.irs.gov/pub/irs-pdf/f673.pdf), [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf)).
Social Security and Medicare *do* apply to a US citizen employed abroad by an "American employer", which includes a
corporation organized under a US state's law, so a Delaware company
([IRS](https://www.irs.gov/individuals/international-taxpayers/social-security-and-medicare-tax-for-us-citizens-and-residents-employed-abroad-by-american-employers)).
Where the country has a totalization agreement with the US, a certificate of coverage from the SSA keeps the person in
one system ([totalization](https://www.irs.gov/individuals/international-taxpayers/totalization-agreements)). The other
country's own tax and social charges may apply too (*unsure* per country).

**Capxul:** the US tax module with two switches (income tax withheld or not, on a Form 673 on file; Social Security
and Medicare always), and a record of any certificate of coverage. Or, if they are contractors, case (b). Later than
(a); question 3.

### (e) Employees outside the United States

**The company must:** follow the country's rules, which almost always means a local entity, its own registration as an
employer there, or an employer of record. Examples: the UK requires registering with HMRC before the first payday, and
a foreign employer with no UK presence has an "NI only" scheme for National Insurance
([register](https://www.gov.uk/register-employer), [PAYE20090](https://www.gov.uk/hmrc-internal-manuals/paye-manual/paye20090));
the UAE has no personal income tax but Emirati staff are registered with the GPSSA pension (26% for those joining from
31 October 2023) and wages go through the Wage Protection System ([u.ae](https://u.ae/en/information-and-services/finance-and-investment/taxation),
[MOHRE WPS](https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system)); India's salary tax
deduction moves to section 392 of the Income Tax Act 2025 from April 2026
([incometax.gov.in](https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tds-compliance));
Pakistan (section 149), the Philippines (Form 1601-C monthly), Mexico (LISR article 96) and Nigeria all make the payer
withhold monthly. An employee who habitually concludes contracts for the company can also create a permanent
establishment, a taxable presence for the company itself ([OECD Model, article 5](https://www.oecd.org/content/dam/oecd/en/publications/reports/2019/04/model-tax-convention-on-income-and-on-capital-2017-full-version_g1g972ee/g2g972ee-en.pdf)).

**Capxul:** doesn't calculate these. It hands the person to an employer of record and books the employer of record's
invoice as a bill from a supplier, in that invoice's currency. Integrating one by API comes later (section 4).

## 2. What Capxul builds, in order

Each step is small and composes with what's built. Payroll's core (9a, built: components, structures, assignments,
payroll entries, slips) stays as it is and holds no tax rule (CX-payroll-tax point 1).

1. **Money in several currencies** (section 3). First, because every later step pays across currencies.
2. **Contractors, worldwide.** A contractor is ERPNext's **Supplier** (#1116), with two more things: a **tax form**
   on file (W-9, W-8BEN or W-8BEN-E: kind, received day, the form's file, its expiry) and a **payout method** (a wallet
   address for USDC, or a Bridge external account in the contractor's currency). Paying one is a **Payment Entry** of
   type Pay to the supplier (#1116's shape, which needs no invoice), from the Safe's USDC account or from Bridge. Paying
   many at once is one operation making one Payment Entry each; batching on chain comes with the Safe (slice 2).
   Contractor invoices (Purchase Invoice) come when invoices do (#742 item 4).
3. **The year-end for US contractors:** a read totalling each W-9 contractor's payments in a calendar year, and the
   1099-NEC figures and IRIS upload file for those at $2,000 or more. The company files.
4. **Employer of record, recorded:** the employer of record is a supplier; its monthly invoice is a bill in its
   currency, paid like a contractor. No integration; the company enters it.
5. **Later, each its own module, when a customer needs it:** the US tax module (case a, with case d's switches), built
   on open-withholding's data imported at a pinned commit, with filing and deposits through an outside service; an
   employer-of-record integration by API; 1099 filing by API; other countries' modules, CX-payroll-tax's shape.

## 3. Money in several currencies

Taken from ERPNext's own shape at `a6f54f9c` (the commit `examples/capxul/doctypes.md` names), in Orthograph's money
(`M6-money.md`: an integer in base units that names its asset).

1. **Assets.** Every currency and token a company holds is an asset file: `usd`, `gbp`, `eur`, `aed` as
   `Blueprint.asset.currency(…)` (2 places), `usdc` as `Blueprint.asset.token(…)` (6 places). **USDC and US dollars are
   two assets.** USDC is redeemable one for one ([Circle](https://www.circle.com/transparency)), but it is not treated
   as cash under US accounting today: redeemable stablecoins fall outside ASU 2023-08, and FASB's proposal to call some
   of them cash equivalents (approved for comment 15 April 2026) has no final standard yet
   ([Deloitte DART](https://dart.deloitte.com/USDART/home/codification/assets/asc350-60/roadmap-digital-assets/chapter-2-classification/2-3-crypto-assets-within-scope)).
   Keeping them apart costs nothing when the rate is 1 and is right when it isn't (*unsure* how to classify it,
   question 6).
2. **An account has one currency** (ERPNext's `account_currency`): the Safe's account is USDC, the Bridge account is
   whatever Bridge holds for the company, the UK bank account is pounds. It is set when the account is made and can't
   change once it has lines.
3. **A company has one reporting currency** (ERPNext's `default_currency`): any asset, US dollars by default. Every
   report (trial balance, profit and loss, balance sheet) is in it. Today's companies, in USDC, stay valid as companies
   whose reporting currency is USDC.
4. **Every ledger line carries two amounts** (ERPNext's GL Entry): `debit` and `credit` in the company's currency, and
   `debitInAccountCurrency` and `creditInAccountCurrency` in the account's, beside `accountCurrency`. Lines balance in
   the company's currency. An account's balance is read in its own currency; a report reads the company's. ERPNext's
   third pair (transaction currency) is left out until an invoice in a third currency needs it.
5. **Rates are rows, never fetched by the ledger.** ERPNext's **Currency Exchange**: day, from, to, rate (a
   `Blueprint.decimal`, not money), and here also its source (typed by hand, read off a receipt, or a feed). A rate
   comes from, in order:
   - **the movement itself.** A payment between currencies knows both sides: Bridge's transfer receipt gives what left
     and what arrived. That realised rate books the payment, so a payment needs no outside rate at all;
   - **a row typed by the company**, for invoices and period-end;
   - **a feed, later.** ERPNext's default is Frankfurter (free, keyless, from central banks' reference rates,
     [frankfurter.dev](https://frankfurter.dev/)); Bridge also publishes mid-market rates for its own currencies
     ([exchange rates](https://apidocs.bridge.xyz/api-reference/exchange-rates/get-current-exchange-rate-between-two-currencies.md)).
     Either is a new outside dependency, Aaron's call (section 4).
   - **USDC to US dollars** is a standing row of 1, ERPNext's **Pegged Currencies**, until a rate says otherwise.
6. **A payment between currencies** is one **Payment Entry** (ERPNext's shape): `paidFrom` in its account's currency
   with `paidAmount`, `paidTo` in its own with `receivedAmount`, and each converted to the company's currency
   (`basePaidAmount`, `baseReceivedAmount`). Where the two company-currency amounts differ, the difference goes to the
   company's **exchange gain or loss** account (ERPNext's `exchange_gain_loss_account`); Bridge's fees go to a bank
   charges account as a deduction line. Example: a company in US dollars pays a UK contractor's £1,000 bill, booked at
   1.27 ($1,270), from the Safe; Bridge takes 1,275.00 USDC and delivers £1,000. Lines: Safe credit 1,275.00 USDC
   ($1,275.00 at the peg); the contractor's payable debit £1,000 ($1,270.00, its booked value); exchange loss debit
   $5.00. With no bill (an advance, as #1116 allows), the payable takes the realised value and no gain or loss arises.
7. **Rounding.** A company-currency amount is the account-currency amount times the rate, rounded to the company
   currency's places, half away from zero (*a choice*, which ERPNext's own `flt` rounding resembles); whatever is left
   after rounding a whole entry goes to exchange gain or loss, so every entry balances exactly.
8. **Period end.** ERPNext's **Exchange Rate Revaluation**: for each account not in the company's currency, its balance
   at the period's closing rate against its booked value; the difference is posted as a journal entry to the
   company's **unrealised** exchange gain or loss account, and reversed the next day. It is an operation a person or
   agent calls, like a pay run.
9. **The Safe and Bridge.** The Safe holds USDC on chain: one USDC account per Safe, its lines from on-chain transfers
   (slice 2). Bridge, by CX-bridge's reading, lands deposits as USDC in custody and sends from it, so the company's
   Bridge account is a USDC account too and its euro or pound side is the customer's or payee's (*unsure*: whether
   Bridge holds dollars or USDC for a customer depends on its product; question 7). A pound account at a bank outside
   Bridge is a pound account, fed by statements.
10. **What of ERPNext's shape is taken:** Account's currency, Company's currency and its two gain-or-loss accounts, GL
    Entry's account-currency pair, Journal Entry Account's rate and account-currency amounts, Payment Entry's two sides
    and base amounts, Currency Exchange, Pegged Currencies, Exchange Rate Revaluation. **Not yet:** the transaction
    currency pair, Currency Exchange Settings' feed (with the feed), buying and selling rates, and the `FX` fields of
    record types not yet built, which each slice takes as it builds them.

**The framework gap.** `M6-money.md` lets a row's asset come only from an `account()` field (a token) and leaves "a
per-row currency" for later. Items 2 to 6 need it: `money.of(a field naming an asset)`. That is Company currency
(#882), parked by Aaron's call; this record unparks it. Converting with a rate and its rounding rule is a helper in the
same values module, so every app rounds alike.

## 4. Outside services

Each is a new outside dependency, so each is Aaron's call. None is needed for steps 1 to 4 of section 2.

| For | Candidates | When |
|---|---|---|
| Paying contractors in local money | **Bridge**, already chosen (CX-grill section 4) | Step 2, through slice 10's adapter |
| Exchange-rate feed | Frankfurter (free, central-bank rates) or Bridge's rates endpoint | When revaluation runs often enough that typing rates hurts |
| Employer of record | Deel (public API; its contractor stablecoin wallet is built on Bridge), Remote (public API, an embedded partner programme), Oyster (partners only), Rise (stablecoin payroll API) | Once a customer has employees abroad; recorded by hand until then |
| W-9 and W-8 collection, 1099 filing | IRS IRIS directly (free; a transmitter code), TaxBandits, Abound, Stripe Connect | When a customer has many US contractors |
| US payroll tax filing and deposits | Check (calculation, deposits, filings, W-2), Zeal, Gusto Embedded; Symmetry calculates only | With the US tax module |

Sources: [Deel embedded](https://developer.deel.com/api/embedded/ic-worker-onboarding),
[Deel and Stripe](https://stripe.com/newsroom/news/deel-and-stripe), [Remote API](https://remote.com/resources/api/reference),
[Oyster](https://docs.oysterhr.com/), [Rise](https://v2-docs.riseworks.io/quickstart),
[Check](https://docs.checkhq.com/docs/tax-deposits), [Zeal](https://docs.zeal.com),
[Gusto Embedded](https://docs.gusto.com/embedded-payroll/v2024-04-01/docs/contractors-intro),
[Symmetry](https://docs.symmetry.com/ste/overview/what-is-the-ste.md),
[TaxBandits](https://developer.taxbandits.com/docs/FormW9W8/w9w8overview), [Stripe tax forms](https://docs.stripe.com/connect/w8-w9-tax-forms).
None of the US filing services calculates or files outside the US (Symmetry adds Canada). Pricing is unpublished for
most; Rise's per-contractor price is from a third party only (*unsure*).

## 5. What it changes in the plan

1. **Pause the US tax module.** CX-payroll-tax's shape stands (a module per jurisdiction, rates as dated data), but the
   US module moves from next to later (section 2, step 5). The spike (#1119) lands as a record; its recommendation
   (import open-withholding at a pinned commit, checked against the second dataset) is how the module starts when it
   does. Payroll's 9a core stays built; its 9b and 9c (payment days, the rest of the slip) go on, as they are
   jurisdiction-free.
2. **Add, in slice 7: money in several currencies** (section 3), after #1116 and the move of `company` and `ledger`
   into pieces (CX-composable-pieces), and before invoices. It unparks
   Company currency (#882) as a framework gap Goal 16 claims, and its checks (#923, a draft) are rewritten to this
   record by an author.
3. **#1116 (parties and payments) lands as it is.** Its amounts in USDC are right for a company whose reporting
   currency is USDC, so its journeys stay valid. The currency slice adds to Payment Entry what it left out (`receivedAmount`,
   the base amounts, the account currencies) and to GL Entry the account-currency pair, as new journeys; #1116's
   "Not done" already lists "the received amount and exchange rates".
4. **Add to slice 9: contractors** (section 2, steps 2 and 3): the tax form and payout method on a supplier, paying
   many contractors at once, and the 1099 figures. Before the US tax module.
5. **Slice 10 (Bridge)** adds external accounts in a contractor's currency and books a transfer's receipt as a
   payment between currencies. CX-bridge's Bank Transaction, which holds USDC even on a euro account, gains the
   account's own currency amount beside it.
6. **The catalogue's `FX` rows** stop being deferred: each is taken with its exchange-rate and `base_*` fields as its
   slice builds it.

## 6. Questions for a professional

For an accountant or lawyer who knows US companies with people abroad.

1. Does a Delaware corporation whose people all work outside Delaware have any Delaware payroll withholding or
   unemployment duty? (We read none, from Delaware's own "performed in the State" and "localized" tests.)
2. For a foreign contractor working entirely outside the US, is a Form 1042-S ever required, or is a W-8BEN on file
   enough? Does a missing W-8BEN change that?
3. For a US citizen employed abroad by a Delaware company: must the company withhold Social Security and Medicare in
   every case, and when may it rely on Form 673 to skip income tax withholding?
4. In the countries our customers' people are most often in (to be listed from real customers), when is a "contractor"
   likely to be treated as an employee, and what does the US company then owe there?
5. Can a single foreign employee, hired without an employer of record, create a taxable presence for the US company
   in that country? Which roles carry that risk?
6. How should a small US company classify USDC it holds: cash, cash equivalent, or another financial asset? Does
   FASB's pending stablecoin guidance change that for 2026 or 2027?
7. When Capxul serves Bridge to customers, whose asset is the balance at Bridge (the customer's or Capxul's), and is it
   dollars or USDC for the customer's books?
8. For a company whose reporting currency is US dollars, which exchange rate source is acceptable for period-end
   revaluation and for a payment booked without a receipt?
9. Paying contractors in USDC: does it change any US or local reporting, compared with paying in money?

## 7. Decisions for Aaron

Each with the recommendation first.

1. **Payroll's first cut is contractors worldwide.** Recommended: yes. Contractors abroad get a W-8BEN on file and are
   paid in USDC or local money through Bridge; US contractors get a W-9 and their 1099 figures. The US tax engine
   becomes a later module. The other choice: keep US payroll tax next.
2. **Several currencies now.** Recommended: yes, ERPNext's shape (section 3), next in the books, with US dollars as a
   company's default reporting currency and USDC kept as its own asset at a standing rate of one. The other choices:
   USDC as everyone's reporting currency (simpler now, wrong for a pound bank account); or stay dollars-only until a
   customer needs more.
3. **Exchange rates.** Recommended: from the payment itself and typed by hand now; a free central-bank feed later, as
   its own call. The other choice: a feed now.
4. **Employees abroad.** Recommended: through an employer of record, its invoice recorded by hand for now; which one to
   integrate, later, once a customer needs it. The other choice: pick and integrate one now (Deel's contractor wallet
   runs on Bridge; Remote has an embedded programme).
5. **Who answers section 6, and when.** Recommended: before the first real contractor is paid through Capxul. It is
   production and likely money.

## 8. Supersedes

**Applied only once Aaron agrees to decisions 1 and 2.** Then the same change rewrites the live docs and marks the dated
records, as `AGENTS.md` says:

- `design/decisions/CX-grill.md`: "For now every Capxul company keeps its books in one dollar asset." → "A company keeps its books in its own reporting currency, with accounts in any currency (CX-money-global-payroll)"
- `design/decisions/CX-payroll-tax.md`: "Capxul's payroll is built for the United States alone, in USDC" → "Capxul's payroll pays contractors worldwide first; the United States tax module comes later (CX-money-global-payroll)"
- `design/goals/16-capxul.md`: "tax from a module per jurisdiction, the United States only, in dollars (CX-payroll-tax)" → "contractors worldwide first, then tax from a module per jurisdiction (CX-money-global-payroll)"
- `design/goals/16-capxul.md`: "the one dollar asset every Capxul company uses for now" → "in the company's currency (CX-money-global-payroll)"
- `examples/capxul/doctypes.md`: "These are deferred by Aaron's call of 24 November 2026" → "Each is taken with its rate and base fields as its slice builds it (CX-money-global-payroll)"
- `docs/canon/status.md`, the `gap-company-currency` row: "deferred by Aaron's call of 24 November 2026" → "unparked by CX-money-global-payroll; Goal 16 claims it"
- The CX-ledger, CX-payroll, CX-bridge and CX-parties-payments lines "Every amount is USDC in base units" are dated records and gain "Superseded by CX-money-global-payroll" beside them.

## The pieces, agreed with the composable-pieces thread

The composable-pieces record (#1123, `CX-composable-pieces.md`, session_01S8RF7CccTeLkaVUQpKSExm) splits Capxul into
pieces chosen when its app is built. This record's work lands inside those pieces. Proposed to that thread on
26 November 2026; its answer is recorded here when it comes.

- **`company`:** the asset files, a company's reporting currency, Currency Exchange and Pegged Currencies (that record
  already puts the currency records here).
- **`ledger`:** an account's currency, the account-currency pair on every line, the two gain-or-loss accounts, rounding
  remainders and revaluation. `ledger.post` takes lines that carry both amounts.
- **`invoicing`:** Payment Entry between currencies (#1116's Payment Entry is born here).
- **`contractors`, a new core piece:** a supplier from `parties` with a tax form and a payout method; paying many; the
  1099 year-end. It pays through `invoicing`'s Payment Entry. Payroll stays employees only.
- **`bridge`:** external accounts in a payee's currency and transfers out; their receipts go to `banking` and are
  booked as a Payment Entry at the realised rate.
- **`payroll-tax-us`:** optional, as that record says, and later by decision 1.
- **An employer of record** is no piece: it is a supplier.

**Order.** That record's move of `company` and `ledger` into pieces comes first, then the currency slice inside them,
then invoices (slice 7b). The rest of the move runs alongside. Contractors come once `invoicing` holds Payment Entry, and
before `payroll-tax-us`.
