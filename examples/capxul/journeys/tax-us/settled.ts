// Journey-author file: the US payroll tax importer's list of settled disagreements (slice 1,
// design/goals/16-lane-payroll-tax.md; design/decisions/CX-tax-us-rows.md, call 6). The importer compares every figure
// open-withholding and us-payroll-tax-tables share, and stops on a disagreement not listed here, or on a listed one
// whose figures' sha256 has changed. Builders never edit this file (tools/ci/builder-paths.sh).
//
// The second source's figures are never written here, only where they are and their hash:
// - `secondSource.file` is a path inside us-payroll-tax-tables' checkout at `SECOND_SOURCE.commit`;
// - `secondSource.figures` are RFC 6901 JSON pointers into that file, in order;
// - `secondSource.sha256` is the hex sha256 of the UTF-8 bytes of JSON.stringify of the array of the values at those
//   pointers, with every object's keys sorted at every depth, and no spaces. A pointer that resolves to nothing stops
//   the importer, as a changed hash does.
//
// `open` entries are disagreements no person has settled from the agency's own text yet. The importer lets them pass
// as listed, and the rows they touch say so for the payroll professional's review (CX-payroll-tax point 8).

export interface Evidence {
  readonly document: string;
  readonly url: string;
  /** The page, section or heading the ruling reads, as the document prints it. */
  readonly at: string;
  /** The document's sha256 where it is a fixed file; an HTML page read on a day has none. */
  readonly sha256?: string;
  readonly read: string;
}

export interface Settled {
  readonly id: string;
  readonly status: "settled" | "open";
  /** Which source is right, and what the rows do about it. */
  readonly ruling: string;
  readonly evidence: ReadonlyArray<Evidence>;
  readonly secondSource: { readonly file: string; readonly figures: ReadonlyArray<string>; readonly sha256: string };
  /** On the payroll professional's list (CX-payroll-tax point 8). */
  readonly review: boolean;
}

export const FIRST_SOURCE = {
  repository: "https://github.com/open-withholding/open-withholding",
  commit: "4a0e67e9976384bbea712673b93f464dfcca5542",
} as const;

export const SECOND_SOURCE = {
  repository: "https://github.com/Nyaksik/us-payroll-tax-tables",
  commit: "ab663307bbc38f5c133b8dc725928445fcf4a0aa",
} as const;

const income = "data/tax/2026/state-income-tax.json";
const other = "data/tax/2026/state-other-withholding.json";

export const settled: ReadonlyArray<Settled> = [
  {
    id: "ny-method-iii-top-rates",
    status: "settled",
    ruling:
      "open-withholding is right: Method III has three top rates, 10.45%, 11.10% from $5,000,000 and 11.70% from $25,000,000. The second source keeps 10.45% only and under-withholds above $5,000,000. The rows keep all three.",
    evidence: [
      { document: "NYS-50-T-NYS (1/26), New York State Withholding Tax Tables and Methods", url: "https://www.tax.ny.gov/pdf/publications/withholding/nys50_t_nys.pdf", at: "page 22, Method III", sha256: "e1c2b3440572a10019efe8d8e4d727474c55afb37dd5d18a6a73b94463baf3e8", read: "2026-11-26" },
    ],
    secondSource: { file: income, figures: ["/states/NY/0/flatRateAbove"], sha256: "c503ae27f05f2c189d3fdc8c9106266e1366804eef45845520fb3f969743bdef" },
    review: false,
  },
  {
    id: "il-line-2-allowance",
    status: "settled",
    ruling:
      "open-withholding is right: the automated payroll method takes off Line 1 allowances x $2,925 plus Line 2 allowances x $1,000. The second source models Line 1 only. The rows keep both.",
    evidence: [
      { document: "Booklet IL-700-T (R-12/25), Illinois Withholding Income Tax Tables", url: "https://tax.illinois.gov/content/dam/soi/en/web/tax/forms/withholding/documents/currentyear/il-700-t.pdf", at: "page 4, Automated payroll method", sha256: "f8f05eda8025bc8b80b7dee5fa9a69af04e2c32b3320386ace7027b5fc6d635e", read: "2026-11-26" },
    ],
    secondSource: { file: income, figures: ["/states/IL/0/exemptionPerAllowance"], sha256: "923d241db72f80b3cc2602e334133e8ea74cdcb8bad7b180717fd2594f36ea41" },
    review: false,
  },
  {
    id: "ca-per-period-tables",
    status: "settled",
    ruling:
      "open-withholding is right for Capxul: Method B is worked per pay period from Tables 1 to 28, with the estimated-deduction allowances of Table 2. The second source carries the annual tables only, which is lawful but cannot work Example B. The annual figures the two share agree; the rows keep the per-period tables.",
    evidence: [
      { document: "California Withholding Schedules for 2026, Method B", url: "https://edd.ca.gov/siteassets/files/pdf_pub_ctr/26methb.pdf", at: "page 1, Method B and the estimated deduction instructions; Tables 1 to 28", sha256: "145b570a333f22ff0b4c230ef8ee04bd6f5dc89f8351eb134754b4820f6c7047", read: "2026-11-26" },
    ],
    secondSource: {
      file: income,
      figures: ["/states/CA/0/brackets", "/states/CA/0/annualStandardDeduction", "/states/CA/0/creditPerAllowance", "/states/CA/0/lowIncomeExemption"],
      sha256: "0bd53d6e8e1950e1b253fe2fb9f3cf8078ed6ec97adf774022ed3692ec083d96",
    },
    review: false,
  },
  {
    id: "ma-paid-leave-share",
    status: "settled",
    ruling:
      "The second source models the law better: for 2026 the contribution is 0.88% of eligible wages, and the employer chooses how much of it to withhold, up to all of the family share (0.18%) and 40% of the medical share (0.28%); under 25 covered individuals, up to 100% of both, and no employer share. open-withholding's fixed 0.46% employee share is that maximum, not a rule. The employee's share is the company's choice, so it is a thing the company enters, checked against these maximums. From 1 January 2027 the split moves from medical to family leave (Chapter 101 of the Acts of 2026), so 2027's rows need a fresh reading.",
    evidence: [
      { document: "Paid Family and Medical Leave employer contribution rates and calculator (last updated 1 October 2026)", url: "https://www.mass.gov/info-details/paid-family-and-medical-leave-employer-contribution-rates-and-calculator", at: "2026, both employer sizes", read: "2026-11-26" },
    ],
    secondSource: {
      file: other,
      figures: ["/states/MA/0/employerElectsShare", "/states/MA/0/periods/0/maxRate", "/states/MA/0/periods/0/annualWageBase"],
      sha256: "f317e5535a81d83cda0ce00896c6dae4dfb8899bc397ec7f0f7e248d5da85d64",
    },
    review: true,
  },
  {
    id: "de-paid-leave-share",
    status: "settled",
    ruling:
      "The second source models the law better: for 2025 and 2026 the rates are medical 0.40%, family caregiving 0.08% and parental 0.32%; the employer deducts not more than 50% of each and may pay all or part of the employee's share; an employer with 10 to 24 employees is under the parental leave provisions only. open-withholding's fixed half of 0.80% is the maximum for 25 or more. The share is the company's choice, entered as a thing. Both sources and the spike cite section 3707; the contributions are section 3705, and 3701(7)a.1 is the 10-to-24 rule.",
    evidence: [
      { document: "Delaware Code, Title 19, Chapter 37, Family and Medical Leave Insurance Program", url: "https://delcode.delaware.gov/title19/c037/index.html", at: "section 3705(b)(1) to (3) and (d) to (g); section 3701(7)a.1", read: "2026-11-26" },
    ],
    secondSource: {
      file: other,
      figures: ["/states/DE/0/employerElectsShare", "/states/DE/0/periods/0/employerSizeTiers", "/states/DE/0/periods/0/annualWageBase"],
      sha256: "aebba28abe7ba76b09df1deb6f494b9bbdc0118cee0d9b1ae65d767ffebae1d2",
    },
    review: true,
  },
  {
    id: "ga-citation",
    status: "settled",
    ruling:
      "Both are right in substance and both citations are stale. Georgia withholds 5.19% to 10 May 2026 and 4.99% from 11 May; the September 2026 revision is current and its examples give the same $27.03 and $0.00. The rows cite the September revision by its sha256 for the window from 11 May, and the January edition through the Wayback Machine, as open-withholding does, for the window before.",
    evidence: [
      { document: "Georgia Employer's Tax Guide, updated September 2026", url: "https://dor.georgia.gov/document/document/2026-employers-tax-guide-updated-september-2026/download", at: "page 51, the worked examples", sha256: "d63c2828c91a0aaa0d3c80e9e97b13f173aee00573d77c2e3cb54895c481ea58", read: "2026-11-26" },
    ],
    secondSource: {
      file: income,
      figures: ["/states/GA/0/effectiveFrom", "/states/GA/0/sourceUrl", "/states/GA/1/effectiveFrom", "/states/GA/1/sourceUrl"],
      sha256: "a42c1e0dbb2f063368930855b664786b14fed51c7ad27989fa2bcf35e5657315",
    },
    review: false,
  },
  {
    id: "wa-cares",
    status: "settled",
    ruling:
      "The second source is right and open-withholding has no file: the premium is 0.58% of an employee's gross wages, not capped at the Social Security wage base, the employee's alone (the employer may choose to pay some or all of it), and not withheld from an employee who shows an approved exemption. Since only the second source carries it, its row is typed into data/2026/hand/ from the agency's page, not from the second source. The agency page does not say whether tips are charged, which the second source says they are not: that point is for the payroll professional.",
    evidence: [
      { document: "WA Cares Fund, for employers", url: "https://wacaresfund.wa.gov/employers", at: "Collecting premiums; Calculating premiums; Tracking employee exemptions", read: "2026-11-26" },
    ],
    secondSource: {
      file: other,
      figures: ["/states/WA/1/key", "/states/WA/1/periods/0/rate", "/states/WA/1/periods/0/effectiveFrom"],
      sha256: "51974eff3fb4427b7dce217dd1151f946514dffaa15a9a792a22d511149e7511",
    },
    review: true,
  },
  {
    id: "ma-weekly-exemption",
    status: "open",
    ruling:
      "Unsettled: open-withholding works the exemption per period ($85 for the first weekly), the second source annually ($4,400 / 52). The weekly $150 to $160 cell both cite ($2.93) comes out $2.91 from open-withholding. Circular M must be read by a person; mass.gov refuses automated reads.",
    evidence: [
      { document: "Circular M, Massachusetts Income Tax Withholding Tables (effective 1 January 2026)", url: "https://www.mass.gov/doc/massachusetts-circular-m-income-tax-withholding-tables-at-50-effective-january-1-2026/download", at: "the percentage method and the weekly wage-bracket table", read: "not read" },
    ],
    secondSource: {
      file: income,
      figures: ["/states/MA/0/exemptionPerAllowance", "/states/MA/0/firstAllowanceAmount", "/states/MA/0/firstAllowanceCount"],
      sha256: "0fcd441de13eabdab977f3f7fe4ac5641d159fc7a4ab2de31364e39999d2abf4",
    },
    review: true,
  },
  {
    id: "ma-blind-exemption",
    status: "open",
    ruling:
      "Unsettled: open-withholding applies a blind exemption, the second source says its blindness credit is not applied. Circular M must be read by a person.",
    evidence: [
      { document: "Circular M, Massachusetts Income Tax Withholding Tables (effective 1 January 2026)", url: "https://www.mass.gov/doc/massachusetts-circular-m-income-tax-withholding-tables-at-50-effective-january-1-2026/download", at: "exemptions", read: "not read" },
    ],
    secondSource: { file: income, figures: ["/states/MA/0/note"], sha256: "1733e4ab121e0b4f152cc21a0425dfd982eaa5141aa2c9af60e29b2a66840aa6" },
    review: true,
  },
];
