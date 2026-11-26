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
// - `covers` names each disagreement the entry settles: the second source's pointer, and open-withholding's figure there
//   as its decimal string. A disagreement at a pointer no entry covers, or where open-withholding's figure is no longer
//   the one written here, stops the importer. Most entries cover nothing: the second source leaves a figure out (New
//   York's top rates, Illinois' Line 2) or models it differently, so no shared figure differs, and the hash alone
//   stops the import when the second source changes what the ruling read.
//
// `open` entries record a question the agency's text has not settled, or one only a decision can, with the evidence read
// so far. They cover nothing, so the importer keeps stopping on the disagreements they describe until a person settles
// them; their hash still pins the second source's figures they were written against.

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
  readonly covers: ReadonlyArray<{ readonly pointer: string; readonly first: string }>;
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
    covers: [],
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
    covers: [],
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
    covers: [],
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
    covers: [],
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
    covers: [],
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
    covers: [],
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
    covers: [],
    review: true,
  },
  {
    id: "ma-weekly-exemption",
    status: "settled",
    ruling:
      "open-withholding is right for the percentage method, and both figures are the circular's own. Page 12's percentage method subtracts each period's printed exemption factor: weekly $85 for one exemption, or $19 times the number claimed plus $66 (annually $4,400, or $1,000 each plus $3,400). The wage-bracket tables (page 2 on, weekly) are built from the annual factors divided by the periods, at each row's middle, after 7.65% FICA: the weekly $150 to $160 cell with one exemption is (155 - 11.86 - 4,400/52) x 5% = $2.93, where page 12's $85 gives $2.91; four exemptions at $280 to $290 print $6.04, where page 12 gives $6.06. Capxul works page 12, so its rows keep the per-period factors, and Massachusetts' wage-bracket cells are not a bulk check of the percentage method (unlike Pub 15-T's). The mass.gov URL refuses automated reads; the archived copy has the sha256 open-withholding recorded from mass.gov.",
    evidence: [
      { document: "Circular M, Massachusetts Income Tax Withholding Tables at 5.0% (Rev. 12/25), effective 1 January 2026", url: "https://web.archive.org/web/20260312193631/https://www.mass.gov/doc/massachusetts-circular-m-income-tax-withholding-tables-at-50-effective-january-1-2026/download", at: "page 12, Percentage Methods, step 2 and Exemption Factors", sha256: "d3f12716311bb9977c9597de25c89a79523d50a5bdc293ab7e68368a453f79a8", read: "2026-11-26" },
      { document: "Circular M, Massachusetts Income Tax Withholding Tables at 5.0% (Rev. 12/25), effective 1 January 2026", url: "https://web.archive.org/web/20260312193631/https://www.mass.gov/doc/massachusetts-circular-m-income-tax-withholding-tables-at-50-effective-january-1-2026/download", at: "page 2, Weekly Income Tax Withholding Table", sha256: "d3f12716311bb9977c9597de25c89a79523d50a5bdc293ab7e68368a453f79a8", read: "2026-11-26" },
    ],
    secondSource: {
      file: income,
      figures: ["/states/MA/0/exemptionPerAllowance", "/states/MA/0/firstAllowanceAmount", "/states/MA/0/firstAllowanceCount"],
      sha256: "0fcd441de13eabdab977f3f7fe4ac5641d159fc7a4ab2de31364e39999d2abf4",
    },
    covers: [],
    review: true,
  },
  {
    id: "ma-blind-exemption",
    status: "settled",
    ruling:
      "open-withholding is right: page 12's step 7 subtracts a blindness tax value from the period's tax for the employee and for a spouse who is blind (weekly $2.12, biweekly $4.23, semimonthly $4.58, monthly $9.17, daily $0.30, annually $110.00), and each wage-bracket table says the same. The second source leaves it out. The rows keep it, with the blind count taken from Form M-4.",
    evidence: [
      { document: "Circular M, Massachusetts Income Tax Withholding Tables at 5.0% (Rev. 12/25), effective 1 January 2026", url: "https://web.archive.org/web/20260312193631/https://www.mass.gov/doc/massachusetts-circular-m-income-tax-withholding-tables-at-50-effective-january-1-2026/download", at: "page 12, Percentage Methods, step 7", sha256: "d3f12716311bb9977c9597de25c89a79523d50a5bdc293ab7e68368a453f79a8", read: "2026-11-26" },
    ],
    secondSource: { file: income, figures: ["/states/MA/0/note"], sha256: "1733e4ab121e0b4f152cc21a0425dfd982eaa5141aa2c9af60e29b2a66840aa6" },
    covers: [],
    review: false,
  },
  {
    id: "oh-2025-top-base",
    status: "settled",
    ruling:
      "open-withholding is right: Ohio's Optional Computer Formula (Rev. 09/25, effective 1 October 2025) prints the top bracket as (TW - 100,000) x 0.03640 + $2673.50. The base is the sum below it, 462.39 + 0.02990 x 73,950 = 2,673.495, which the formula prints rounded half up; the second source's 2673.49 rounds it down. Ohio's 2026 tables replace these only for payrolls that end on or after 1 August 2026 (see oh-august-2026-window), so this window is January to July.",
    evidence: [
      { document: "Employer Withholding Taxes: Optional Computer Formula (Effective October 1, 2025), Rev. 09/25", url: "https://dam.assets.ohio.gov/image/upload/tax.ohio.gov/employer_withholding/2025%20Withholding%20Tables/WHT_OptionalComputerFormula_2025.pdf", at: "page 1, the table's third row", sha256: "25fbf2b0905f52025f3306a1a4dcad3d2bf515a33afa110368533ed05910d405", read: "2026-11-26" },
      { document: "Employer Withholding Taxes - Percentage Method (Effective October 1, 2025)", url: "https://dam.assets.ohio.gov/image/upload/tax.ohio.gov/employer_withholding/2025%20Withholding%20Tables/WHT_PercentageMethod_2025.pdf", at: "page 1, Tables 1 to 5", sha256: "b726a7db435a59f5f9239059840b478d32ea8666b9e7813bb7b342b44099e2e1", read: "2026-11-26" },
    ],
    secondSource: { file: income, figures: ["/states/OH/0/effectiveFrom", "/states/OH/0/brackets"], sha256: "4c86b3a16d2e0a38e5692b40f5b66f5a984484473a0854490085878d65565fe9" },
    covers: [
      { pointer: "/states/OH/0/brackets/single/2/1", first: "2673.50" },
      { pointer: "/states/OH/0/brackets/married_jointly/2/1", first: "2673.50" },
      { pointer: "/states/OH/0/brackets/head_of_household/2/1", first: "2673.50" },
    ],
    review: false,
  },
  {
    id: "oh-august-2026-window",
    status: "open",
    ruling:
      "The second source is right and open-withholding is missing a window: Ohio issued new tables, under House Bill 96, for payrolls that end on or after 1 August 2026: 1.600% to $26,050, then $416.80 plus 2.990% to $100,000, then $2,627.91 plus 3.400% (Optional Computer Formula Rev. 07/26; 416.80 + 0.0299 x 73,950 = 2,627.905, printed half up). open-withholding's oh/2025 file has no end date, so at the pinned commit (its newest, 3 November 2026) its 2025 rates run on past August. Settling it needs a decision, not a reading: a hand row typed from the formula below, from 1 August 2026, which call 5 of CX-tax-us-rows allows only for figures neither source carries; a rule for how that row ends the generated oh/2025 row; and Ohio's date is the payroll period's end, where us-withholding.compute takes the pay date.",
    evidence: [
      { document: "Employer Withholding Taxes: Optional Computer Formula (Effective August 1, 2026), Rev. 07/26", url: "https://dam.assets.ohio.gov/image/upload/tax.ohio.gov/employer_withholding/2026%20Withholding%20Tables/WHT_OptionalComputerFormula_2026.pdf", at: "page 1, the table (its formulas are images of text; read from the rendered page)", sha256: "c958b7cce47094d2f9e1a349ac2c070b0d3ef9eeba6d18f7f90654d42505c946", read: "2026-11-26" },
      { document: "Employer Withholding Taxes - Percentage Method (Effective August 1, 2026)", url: "https://dam.assets.ohio.gov/image/upload/tax.ohio.gov/employer_withholding/2026%20Withholding%20Tables/WHT_PercentageMethod_2026.pdf", at: "page 1, Tables 1 to 5", sha256: "e258bb3a32c8f41ce71b03fe1ae652a34a43347918c7fd37b640d8c149d447c2", read: "2026-11-26" },
      { document: "Ohio Department of Taxation bulletin, New Ohio Withholding Rates Effective August 1, 2026 (15 July 2026)", url: "https://content.govdelivery.com/accounts/OHTAX/bulletins/420a1ea", at: "\"for payrolls that end on or after August 1, 2026\"", read: "2026-11-26" },
    ],
    secondSource: { file: income, figures: ["/states/OH/1/effectiveFrom", "/states/OH/1/effectiveBy", "/states/OH/1/brackets"], sha256: "db3e9b563fb3390b175fb6ba6404e9d2865c11bc4576d86ca5211b45167b292a" },
    covers: [],
    review: true,
  },
  {
    id: "id-2026-revision",
    status: "open",
    ruling:
      "Two things differ. First, the shape: open-withholding writes Idaho's exemption as a zero-rate band (0% to $16,100 single, $32,200 married, then 5.3%), the second source as a deduction and one 5.3% bracket; the same tax either way. Second, the date: the second source puts $16,100 and $32,200 in force from 1 January 2026, open-withholding from 23 July 2026, the date in EPB00744's footer, with $15,000, $30,000 and a $3,868 allowance before it. The Tax Commission prints no effective date: its press release of 31 July 2026 and its Computing Withholding page say not to adjust back to the beginning of the year and to use the revised tables going forward. So 1 January is wrong, and neither 23 July (the footer) nor 31 July (the announcement) is a date the Commission set. Covering the shape would ship open-withholding's footer date, so this stays open, and the import stops, until the Commission or the payroll professional names the first day: questions.md, Idaho.",
    evidence: [
      { document: "EPB00744, Table for Percentage Computation Method of Withholding (07-23-2026)", url: "https://tax.idaho.gov/wp-content/uploads/pubs/EPB00744/EPB00744_07-23-2026.pdf", at: "pages 1 to 3; no effective date printed", sha256: "c52b383684af433b12eb3b712fbb0de6b61326b5061562440b43464b332cb3d8", read: "2026-11-26" },
      { document: "Idaho State Tax Commission press release, Withholding tables updated for 2026 (31 July 2026)", url: "https://tax.idaho.gov/pressrelease/withholding-tables-updated-for-2026", at: "\"You don't need to adjust withholding back to the beginning of the year, but you should use the revised tables going forward.\"", read: "2026-11-26" },
      { document: "Idaho State Tax Commission, Computing Withholding", url: "https://tax.idaho.gov/taxes/income-tax/withholding/computing/", at: "Effective date of withholding tables", read: "2026-11-26" },
    ],
    secondSource: { file: income, figures: ["/states/ID/0/effectiveFrom", "/states/ID/0/annualStandardDeduction", "/states/ID/0/brackets"], sha256: "ccc0a8ce1b290e207a90c1a6d80b042bf389bdb05085990f75f555bd0c2c35d3" },
    covers: [],
    review: true,
  },
];
