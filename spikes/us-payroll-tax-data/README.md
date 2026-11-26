# Spike: US payroll tax from open data

Goal 16, slice 9 (payroll's taxes, `design/decisions/CX-payroll-tax.md`). Run on 26 November 2026, in Claude Code.

**Question.** Can Capxul's US payroll tax be built from existing open data instead of being transcribed by hand from
every IRS and state publication, and which source is trustworthy enough?

**Answer.** Yes, from open-withholding. Its data reproduced 34 of the 39 printed worked examples I could read for the
states in scope, and in each of the other five the publication's own arithmetic disagrees with its own tables. It also reproduced all 4,794 cells of the IRS wage-bracket tables. The other source, us-payroll-tax-tables,
agrees on every figure the two share. But it leaves out three things the publications require: New York's two top
rates, Illinois' Line 2 allowance, and California's per-pay-period tables. Use open-withholding as the source and
us-payroll-tax-tables as a second opinion. Neither replaces the payroll professional's review that CX-payroll-tax
point 8 asks for.

## What was tried

- **The two sources** were cloned into a scratch folder outside the repository and read as data. Neither project's
  code was run; an attempt to run open-withholding's test suite was refused, and the spike did without it.
  - open-withholding, `https://github.com/open-withholding/open-withholding` at `4a0e67e9` (3 November 2026): data
    CC0-1.0, code MIT. It has 431 YAML parameter files, and each cites the publication with its URL, the retrieval
    date and the sha256 of the document. Its README is behind its data. The README says 141 golden fixtures and
    state unemployment insurance (SUI) for Wisconsin and Illinois only. The repository holds 766 fixtures and SUI files
    for 37 jurisdictions, all 10 in scope among them. AL, AR, AZ, DC, KS, LA, MS, NM, OK, SC and WV have no SUI file,
    and NH, NV and TN have no folder at all.
  - us-payroll-tax-tables, `https://github.com/Nyaksik/us-payroll-tax-tables` at `ab663307` (15 November 2026): data
    CC BY 4.0, code MIT. It holds annual tables in JSON, 164 control examples, and a source-check journal. It is the
    data behind a commercial pay-stub site, mirrored here.
- **The publications** were fetched fresh by `calc/fetch.sh`, which fails if any sha256 has changed: IRS Pub 15-T (2026) and Pub 15 (2026), California's 2026 Method B
  schedules, New York's NYS-50-T-NYS (1/26), New Jersey's NJ-WT (September 2025) and its rate tables, Illinois' IL-700-T
  (R-12/25), and Georgia's guide revised September 2026. Two more were read by hand and are not in the script:
  Delaware's Employer's Guide section 17 (its site rejects curl, so it was read through a web fetch tool) and NJ-WT
  page 25, an image with no text layer (rendered with pdftoppm and read by eye). Seven of the documents (Pub
  15-T, Pub 15, California's Method B, NYS-50-T-NYS, IL-700-T, NJ-WT and New Jersey's rate tables) are byte-identical
  to the documents open-withholding cites (same sha256). Massachusetts (mass.gov), SSA and Washington's paid-leave site
  answer 403 to automated reads. So Massachusetts was checked only source against source, and SSA's wage base was read
  from Pub 15 instead.
- **`calc/compare.py`** checks the figures the two sources share against each other: federal schedules and
  adjustments, California's annual tables, New York's per-period and annual tables, and New Jersey's five rate
  tables in five frequencies. It made 59 comparisons, and all 59 agreed.
- **`calc/calc.ts`** is the throwaway calculator over open-withholding's data, about 150 lines with no dependencies.
  It covers federal Worksheet 1A, FICA, FUTA, annualised percentage (Illinois, Georgia, Delaware), per-period
  percentage (New Jersey), and California, New York and Massachusetts as their own methods. **`calc/cases.ts`** holds
  each published answer with its citation, and marks apart the checks built from published rates. **`calc/run.ts`** runs them, and every Pub 15-T wage-bracket cell as well.
  **`calc/mutate.ts`** plants one error at a time in the data.

Run it: `calc/fetch.sh <scratch>` (clones both repositories at the commits above, downloads the publications, converts
the YAML to one JSON with our own script), then `node calc/run.ts <scratch>` and `node calc/mutate.ts <scratch>`
(Node 24 runs TypeScript as is).

## What was found

1. **Federal reproduces exactly.** Pub 15-T prints no percentage-method worked example. Its wage-bracket tables for
   W-4s from 2020 or later are that method worked at each row's middle, rounded to the dollar (daily tables to the
   dime). All **4,794 of 4,794** cells reproduce from open-withholding's schedules. Both sources' schedules, all six
   (standard and Step 2 for three statuses), carry the same figures, which page 12 must print for the 4,794 cells to reproduce. FICA (6.2% to $184,500, 1.45%, and 0.9% over
   $200,000 regardless of filing status) matches Pub 15 in both. FUTA (6.0% on $7,000, 5.4% credit) is only in
   open-withholding.
2. **States: 34 of 39 printed worked examples pass. The other five fail because the publications disagree with
   themselves:**
   - New York, both Example 2s. Single prints 165.00 × 0.0753 = 12.43, but the product is 12.4245, so 258.50 rather
     than 258.51. Married prints 58.80 × 0.070 = 4.15, but the table's rate is 0.0707, so 248.12 rather than 248.11.
   - New Jersey, Examples A3, B2 and B3 on page 25. They use weekly constants cut down from the annual table (384, 961,
     5.76, 15.28, 17.30). The rate tables the same booklet sends employers to print 385, 962, 5.77, 15.29 and 17.31.
     The results are off by 1 to 2 cents.
   Both sources had already caught all five. open-withholding leaves them out of its fixtures and says it reported the
   New Jersey one to the state. us-payroll-tax-tables gives New York a cent of tolerance and keeps only A1, A2 and B1
   for New Jersey. Counted against the tables each publication says to use, all 39 pass. By state: California 6 of 6
   (Method B A to F), New York 6 of 8, Delaware 15 of 15 (examples A to C, annual and four frequencies), New Jersey 3 of
   6, Illinois 2 of 2 (the automated example, and the wage-bracket example read at its row's middle), Georgia 2 of 2
   (September 2026 revision). Seven more checks are built from published rates, not printed examples, and all pass:
   FICA and FUTA applied to one employee (4), and Texas, Florida and Washington having no wage income tax (3), on
   which both sources agree.
3. **Where the two sources disagree, and which is right:**

   | Where | open-withholding | us-payroll-tax-tables | The publication says | Right |
   |---|---|---|---|---|
   | New York, Method III | 10.45% from $1,077,550 (single) or $2,155,350 (married), 11.10% from $5M, 11.70% from $25M | 10.45% only | NYS-50-T-NYS page 22: the three rates | open-withholding. us-payroll-tax-tables under-withholds $39,000 a year on $6M |
   | Illinois, Line 2 allowances | $1,000 each | not modelled | IL-700-T: Line 1 × $2,925 plus Line 2 × $1,000 | open-withholding. The Alice example gives $34.03 from us-payroll-tax-tables against the printed $32.13 |
   | California, per-period tables and estimated-deduction allowances | Tables 1 to 28 for every frequency | annual only, no estimated deductions | Method B allows either. Examples A to D are per period | open-withholding reproduces A to D. The annual method gives $0.84 and $1.67 for C and D (printed $0.82 and $1.69), which is lawful, but it cannot do Example B at all |
   | Massachusetts, weekly exemption | per-period factors ($85 for the first exemption weekly) | annual ($4,400 ÷ 52) | not readable from here | **Unsettled.** The weekly $150 to $160 cell both sources cite ($2.93) comes out at $2.91 from open-withholding. It needs Circular M read by a person |
   | Massachusetts, blind exemption | yes | no | Circular M (per open-withholding) | open-withholding, unverified |
   | Massachusetts and Delaware, paid leave | fixed employee share (MA 0.46%; DE half of 0.80%) | employer elects the share up to the maximum, and Delaware by employer size (10 to 24 employees: parental only) | DE: 19 Del. C. § 3707 (as cited) | us-payroll-tax-tables models the law better |
   | Washington Cares (long-term care), 0.58% | missing | present | WA site refused automated reads | us-payroll-tax-tables, unverified |
   | Georgia's citation | June 2026 edition (now a 404) | June 2026 edition, and the January one through the Wayback Machine | the September 2026 revision is current; its examples give the same $27.03 and $0.00 | both right in substance; both citations stale |
   | FUTA, SUI wage bases and rate ranges | FUTA, and SUI for 37 jurisdictions (all 10 in scope) | none | Pub 15 | only open-withholding |

   Delaware: both use the table "effective January 1, 2025", the latest Delaware prints. Section 17 and both sources
   agree to the cent.
4. **What the checks catch** (`calc/mutate.ts`). I planted one error at a time and every plant was caught:
   - federal MFJ adjustment off $100: 220 cells fail;
   - one federal base off $1: 4 cells fail;
   - California weekly deduction +$1, New York monthly top rate +0.0001, Illinois Line 2 +$100, Georgia dependent
     −$1,000, Delaware credit −$10: each fails 1 to 15 examples.

   What is not caught: any row or frequency no example touches. That includes New York's Method III, California's top
   brackets, and every state's quarterly and daily tables. A $1 error in a federal base is caught only by 4 cells.
5. **What neither source covers and Capxul needs:**
   - Each company's own SUTA rate. It is per company per year, so it is data the company enters; open-withholding gives
     the wage bases and the allowed range to check it against.
   - SUI wage bases and rate ranges for AL, AR, AZ, DC, KS, LA, MS, NM, OK, SC and WV (open-withholding has none yet),
     and anything at all for NH, NV and TN.
   - Local income taxes. New York City, Yonkers, Ohio and Pennsylvania municipalities, Michigan cities and Delaware's
     Wilmington are absent or partial. open-withholding has New York City and Yonkers fixtures and a method, but no
     data yet. us-payroll-tax-tables flags them with `unmodelledLocalTax`.
   - FUTA credit reduction states. Neither carries them; the Labor Department's list is published each November.
   - Supplemental (bonus) rates for the states.
   - Reciprocity between states, and multi-state work.
   - Washington's workers' compensation deduction (per hour, per risk class).
   - Massachusetts' official text, verified by anyone outside the two projects.
   - Filing and deposit rules: out of scope by CX-payroll-tax.

## Measurements

- Publications read: 9 documents. Seven of them were byte-identical to the documents open-withholding cites.
- Shared figures compared between the sources: 59 of 59 agree.
- Printed worked examples: 34 of 39 pass, and the 5 failures are the publications' own slips. Checks built from
  published rates: 7 of 7. Figures both sources cite but I could not read: 3 of 4 (the Massachusetts cell above).
- Federal wage-bracket cells: 4,794 of 4,794.
- The whole run takes under a second.

## The decision it supports

Slice 9's tax data comes from open-withholding, imported, never hand-typed. The calculation stays Capxul's own, as
CX-payroll-tax point 7 says. The spike supports this, and the lead decides it.

- **How Capxul imports it.** A build-time importer reads open-withholding's `data/us/<state>/<year>/*.yaml` at a pinned
  commit and writes Capxul's dated rate rows. Each row carries:
  - jurisdiction and tax;
  - `effective_from` and `effective_to` (Georgia's two 2026 windows included);
  - its parameters;
  - its citation (document, URL, retrieval date, sha256);
  - the upstream commit.

  The same importer checks every figure us-payroll-tax-tables also carries and stops on any disagreement, which a
  person then settles. Capxul's journeys are written by an author from the publications' own examples, as
  CX-payroll-tax point 5 says, so the imported rows are checked by the publications and not by the importer.
  open-withholding's `methods/` specs are reference only: Capxul writes each method in Effect.
- **Refresh.** When a new tax year publishes (Pub 15-T in December, most states in December and January) or mid-year
  (Georgia this year), bump the pinned commit, re-import, and let the journeys and the second-source diff gate it.
  Each year's new journeys are transcribed from the new publications' examples. This is the only hand work left.
- **Licences.**
  - open-withholding's data is CC0: no conditions. Capxul should still keep its citations, and credit the project in
    a NOTICE as a courtesy.
  - Its code is MIT. Capxul takes none of it, so nothing is owed; reading the method specs creates no obligation.
  - us-payroll-tax-tables' data is CC BY 4.0, which an AGPL-3.0 project can use. Used only as a check at import, it is
    not redistributed and nothing is owed. If any of its rows ship in Capxul (WA Cares, for instance), attribution is
    required. Capxul would put "US payroll tax tables by PayStub Desk (paystubdesk.com), licensed under CC BY 4.0;
    modified" in a NOTICE and in each such row's citation.
- **Days saved.** My estimate, not measured.
  - By hand: federal and FICA/FUTA about 2 days. California, New York, New Jersey and Massachusetts are tables per
    frequency with their own methods, about 2 days each. Delaware, Illinois and Georgia are about 1 day each. SDI and
    paid leave are about 2 days. Each day includes finding the documents, typing the tables and catching the
    publications' own slips, which this spike shows both projects already did. That is about 15 days for these 10
    states, and about 50 to 60 for all 41 states and DC.
  - With the import: an importer and the cross-source diff, about 2 to 3 days once. Each year's refresh shrinks to
    re-import plus new journeys, about 3 to 5 days in place of most of the first effort.
  - The calculation methods and the author's journeys are needed either way, so they are not counted as saved.

## Open risks

- **Both projects are new and small.** open-withholding has 0 stars and an LLM extraction pipeline with human review.
  us-payroll-tax-tables mirrors one commercial site. Either could stop. Pinning a commit and keeping the citations means
  Capxul keeps working if one does, but the refresh would fall back to hand work. A fork is cheap: the data is CC0.
- **Massachusetts is not verified against Circular M** by this spike. The weekly exemption question in finding 3 is
  open, and a person should read the circular.
- **Coverage is thin where no example reaches.** New York's top rates, California's top brackets, and quarterly and
  daily tables are checked by nothing published. Journeys should add constructed cases there, as open-withholding does
  for DC and Maryland.
- **Citations rot.** Georgia's URLs are 404s four months on. The importer should keep the sha256 and an archived copy,
  not just the URL.
- **The payroll professional's review** (CX-payroll-tax point 8) is still needed before real wages. Open data moves the
  typing, not the responsibility.
- **Scope.** This spike checked federal and 10 states. The other 31 income-taxing states and DC were not checked.
