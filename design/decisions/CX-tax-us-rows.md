# CX-tax-us-rows: US payroll tax's published figures ship as generated dated rows, and how they round

**Decided 26 November 2026** by Goal 16's 📐 designer for the US payroll tax lane (session_01S8RF7DUPsuCAygXRCpaop8),
under the standing authority in `AGENTS.md` ("Who decides"), after the 🔍 review of #1131 at `b53cfd06`. It is the
building agent's architecture call. It applies CX-payroll-tax point 3 to the `payroll-tax-us` piece (Superseded by CX-features, 26 November 2026: "the `payroll-tax-us` feature"; every "piece" and "pieces" in this sense below reads "feature" and "features")
(`design/goals/16-lane-payroll-tax.md`) and changes none of CX-payroll-tax's words.

## The question

CX-payroll-tax point 3: "Rates are dated data, never code. Brackets, rates, wage bases, thresholds and allowances are
rows with the period they apply to and the official publication they are read from. ERPNext's Income Tax Slab is the
shape they generalise. A new tax year is new rows." Where do those rows live: in each Capxul's database, as things, or
in the piece itself, as files?

## The call

1. **The published figures are generated data modules inside the piece,** `examples/capxul/plugins/payroll-tax-us/data/
   <year>/<jurisdiction>.ts`. Each file opens `// Generated from open-withholding data/us/<state>/<year>/ at <commit>. Do
   not edit.`. It exports rows in Income Tax Slab's shape, each with:
   - its jurisdiction and tax;
   - `effectiveFrom` and `effectiveTo`;
   - its brackets (from, to, percent) and its other charges, which are Income Tax Slab's two child tables;
   - its parameters: wage bases, thresholds and allowances;
   - its citation (document, URL, retrieval date, sha256);
   - the upstream commit.
2. **This is point 3, not a change to it.** The rows are data, never code: no figure is written in a method, and a
   method reads only rows. They carry the period they apply to and their publication, and they take Income Tax Slab's
   shape. A new tax year is new rows: a new `data/<year>/` folder. The rows are not stored in the database because:
   - every company in a jurisdiction pays the same published figures;
   - they change only when a publication changes;
   - each change has to be reviewed in a pull request, as a diff a person can read against its document.
   A stored table would make every company hold its own copy of a national figure, and it would make a refresh a data
   migration in every deployed Capxul rather than a code change.
3. **What a company owns is a thing.** Its state unemployment (SUTA) rate per state and year, its state registrations,
   and each employee's withholding certificates (Form W-4 and the states' own) are things, with their own checks.
4. **The importer runs on a machine, never in CI or at run time.** CI reads the committed rows, and a manifest
   (`data/manifest.json`, generated) holds each upstream file's sha256 and each generated file's own. A hand edit to a
   row then fails the piece's check. A build-time import of CC0 data is not the outside payroll-tax provider
   CX-payroll-tax point 7 rules out. Aaron said yes to all of CX-money-global-payroll on 26 November 2026, and its
   section 2 point 6 names the US tax piece "on the open-withholding dataset imported at a pinned commit".
5. **Figures neither source carries are typed by hand** into `data/<year>/hand/`, one row each, with its citation and
   the document's sha256. The pull request that adds one says who typed it from which page.
6. **The second source never ships.** us-payroll-tax-tables (CC BY 4.0) is fetched at import into a scratch folder
   outside the repository and compared there. The list of settled disagreements keeps each one's ruling, its evidence
   (the publication's page) and the sha256 of the second source's figures it rules on, never the figures themselves. A
   changed figure is then a changed hash, which stops the importer.

## Rounding

Each tax line is rounded **half up, as the publications do**, at the step and to the unit the publication says:

- Pub 15-T's percentage method: worked to the cent. The employer may round to the dollar, as Pub 15-T allows; Capxul
  doesn't.
- The wage-bracket tables: to the dollar, and the daily tables to the dime. They are used only as a bulk check of the
  percentage method, at each row's middle, as the spike did.
- A state's method: its own rule, cited in its row.

The result is then held in USDC base units. This is not the ledger's conversion helper, which rounds half to even
(CX-money-global-payroll). The tax piece never calls it for a tax line.

## What it changes in the catalogue

`examples/capxul/doctypes.md` is unchanged. Its Income Tax Slab rows say "a progressive tax table; check against each
country payroll supports", which this record follows, and the India exemption types stay "not taken until a
jurisdiction needs it" (CX-payroll-tax).

CX-composable-pieces, a dated record, keeps its words and gains "Superseded by CX-tax-us-rows" beside the two below:

- Section 1, item 16 (`payroll-tax-us`): its record types become 3 (2), Income Tax Slab and its two lines, taken as the
  rows' shape. India's four exemption types and their two lines are listed and not taken.
- Section 1's total: 28 pieces take 479 of the 485 record types, and the other 6 stay listed and not taken.

## Supersedes

CX-payroll-tax point 3's words hold; this record says where its rows live. In CX-composable-pieces (decided the same
day, #1123):

- `design/decisions/CX-composable-pieces.md`: "payroll tax as dated rows (CX-payroll-tax). 9 (4): Income Tax Slab (and Other Charges, Taxable Salary Slab)," → "payroll tax (CX-payroll-tax). Its published figures are generated dated rows in Income Tax Slab's shape, shipped in the piece and not stored (CX-tax-us-rows); a company's SUTA rates and each employee's withholding certificates are its things. 3 (2): Income Tax Slab (and Other Charges, Taxable Salary Slab), taken as the rows' shape."
- `design/decisions/CX-composable-pieces.md`: "Employee Tax Exemption Category, Sub Category, Declaration and Proof Submission, with their lines." → "India's four exemption record types and their two lines stay listed and are not taken (CX-payroll-tax, 'What this changes in the catalogue')."
- `design/decisions/CX-composable-pieces.md`: "28 pieces take all 485 record types" → "28 pieces take 479 of the 485 record types, and the other 6, India's income-tax exemption types and their lines, stay listed and are not taken (CX-payroll-tax)"
