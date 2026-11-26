# US payroll tax: open questions the sources don't answer

Journey-author file (tax-us slice 1). Each question here stops the importer through an `open` entry in `settled.ts`,
and stays open until a person with standing answers it: the payroll professional (CX-payroll-tax point 8) or the
agency itself. Nothing here is a ruling.

## Idaho: from which day do the 2026 withholding tables apply?

**`settled.ts` entry:** `id-2026-revision` (status `open`). **Who can answer:** the Idaho State Tax Commission
(withholding), or the payroll professional reviewing Idaho.

**Question for the Commission:** EPB00744 (footer 07-23-2026) and EPB00745 remove the Idaho Child Tax Credit
allowance and set the zero-tax band at $16,100 (single, head of household) and $32,200 (married). The press release of
31 July 2026 says to "use the revised tables going forward" and not to adjust back to the beginning of the year.
For which payments must an employer use the revised tables: wages paid on or after a particular date (which one), pay
periods ending on or after it, or the first payroll the employer runs after it learns of the revision? And may an
employer that had not yet changed by a later date keep the earlier table for wages already paid?

**What the sources say:**

| Source | Date it gives | Status |
|---|---|---|
| EPB00744, Table for Percentage Computation Method of Withholding, sha256 `c52b383684af433b12eb3b712fbb0de6b61326b5061562440b43464b332cb3d8`, https://tax.idaho.gov/wp-content/uploads/pubs/EPB00744/EPB00744_07-23-2026.pdf | "07-23-2026" in the footer of each page; no effective date printed | official; a revision date, not an effective date |
| Press release, Withholding tables updated for 2026 (Friday 31 July 2026), https://tax.idaho.gov/pressrelease/withholding-tables-updated-for-2026, page sha256 `8c0b8cc4b426f31f55aa13d3791c356ad0bdc066fed4f548381adca4232cca16` on 26 November 2026 | "going forward"; no adjustment back to 1 January | official; no date |
| Computing Withholding, https://tax.idaho.gov/taxes/income-tax/withholding/computing/, "Effective date of withholding tables" | "When we issue a new table, you don't need to adjust withholding back to the beginning of the year. Just use the new table going forward." | official; no date |
| open-withholding `data/us/id/2026/withholding.yaml` at `4a0e67e9` | `effective_from: 2026-07-23` | taken from the footer |
| us-payroll-tax-tables `/states/ID/0` at `ab663307` | `effectiveFrom: 2026-01-01` | contradicted by the press release |
| Ernst & Young, Tax News Update 2026-1829 (26 August 2026) | "apply these changes immediately" | secondary |
| USDA National Finance Center bulletin NFC-26-1786997961 | its own pay period 17, 2026 | secondary; one employer's choice |

**What stays true while it is open:** the import stops on Idaho, and no Idaho row ships. The two sources also write the
same tax in two shapes (open-withholding: a zero-rate band to $16,100 or $32,200; the second source: a deduction of
that size and one 5.3% bracket). That is not the question: it would be settled the moment the window's first day is.

**What the answer changes:** one dated window. If the Commission names a date, it becomes the first day of the 2026
row, cited to the Commission's answer; if it says "the first payroll after you learned of it", that is not a date a row
can carry, and the lane needs a decision on how Capxul represents it.
