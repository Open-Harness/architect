// The published answers each check reproduces, transcribed from the official 2026 publications that fetch.sh
// downloads. `official: true` means the spike read the figure in the agency's own document; false means the agency's
// site refused automated reading and the figure is the one both outside sources cite (counted apart).
import type { Freq, W4 } from "./calc.ts";

export type Case = {
  id: string; juris: string; asOf: string; official: boolean; cite: string; expect: number | "no income tax";
  kind: "state" | "federal" | "fica-ss" | "fica-medicare" | "fica-additional" | "futa";
  freq?: Freq; gross?: number; status?: string; allowances?: number; secondary?: number; fica?: number;
  ytdRetirementUsed?: number; w4?: W4; annual?: number;
  /** Not a printed worked example: a check built from the published rates (FICA, FUTA, no-income-tax states). */
  fromRates?: true;
  /** The publication's own arithmetic disagrees with its own tables; the expected figure is printed as is. */
  printedInconsistent?: string;
};

const CA = "California EDD, 2026 Withholding Schedules, Method B (26methb.pdf, sha256 145b570a…)";
const NY = "NYS-50-T-NYS (1/26), Method II examples (nys50_t_nys.pdf, sha256 e1c2b344…)";
const DE = "Delaware Employer's Guide, Section 17, Examples A to C (tax computation table effective 1 Jan 2025)";
const NJ = "NJ-WT (September 2025) page 25, Examples of Percentage Method Calculations (njwt.pdf, sha256 0fbd45b2…)";
const IL = "Booklet IL-700-T (R-12/25) (il-700-t.pdf, sha256 f8f05eda…)";
const GA = "Georgia Employer's Withholding Tax Guide 2026, revised September 2026, pages 51 and 52";
const MA = "Circular M (Rev. 12/25), as both outside sources cite it; mass.gov refused every automated read";
const P15 = "IRS Publication 15 (2026) (p15.pdf, sha256 b46c3622…): SS 6.2% to $184,500, Medicare 1.45%, additional 0.9% over $200,000, FUTA 6.0% on $7,000 less the 5.4% credit";

const st = (c: Omit<Case, "kind" | "official"> & { official?: boolean }): Case => ({ kind: "state", official: true, ...c });

export const cases: Case[] = [
  // California: Method B examples A to F. E and F are computed on the annual tables, as the schedule allows.
  st({ id: "CA-A", juris: "ca", asOf: "2026-06-15", cite: `${CA} p.2 Example A`, freq: "weekly", gross: 210, status: "single", allowances: 1, expect: 0 }),
  st({ id: "CA-B", juris: "ca", asOf: "2026-06-15", cite: `${CA} p.2 Example B`, freq: "biweekly", gross: 1600, status: "married", allowances: 2, secondary: 1, expect: 2.38 }),
  st({ id: "CA-C", juris: "ca", asOf: "2026-06-15", cite: `${CA} p.3 Example C`, freq: "monthly", gross: 5100, status: "married", allowances: 5, expect: 0.82 }),
  st({ id: "CA-D", juris: "ca", asOf: "2026-06-15", cite: `${CA} p.3 Example D`, freq: "weekly", gross: 950, status: "head_of_household", allowances: 3, expect: 1.69 }),
  st({ id: "CA-E", juris: "ca", asOf: "2026-06-15", cite: `${CA} p.4 Example E (annual tax before ÷24)`, freq: "annually", gross: 57600, status: "married", allowances: 4, expect: 99.2 }),
  st({ id: "CA-F", juris: "ca", asOf: "2026-06-15", cite: `${CA} p.4 Example F (annual tax before ÷12)`, freq: "annually", gross: 57000, status: "married", allowances: 4, expect: 86 }),
  // New York: Method II, single (p.16) and married (p.18). Each Example 2 rounds a product the other way.
  st({ id: "NY-S1", juris: "ny", asOf: "2026-06-15", cite: `${NY} single Example 1`, freq: "weekly", gross: 400, status: "single", allowances: 3, expect: 8.01 }),
  st({ id: "NY-S2", juris: "ny", asOf: "2026-06-15", cite: `${NY} single Example 2`, freq: "semimonthly", gross: 5000, status: "single", allowances: 1, expect: 258.51, printedInconsistent: "prints 165.00 × 0.0753 = 12.43; it is 12.4245, so 258.50" }),
  st({ id: "NY-S3", juris: "ny", asOf: "2026-06-15", cite: `${NY} single Example 3`, freq: "monthly", gross: 50000, status: "single", allowances: 3, expect: 3576.63 }),
  st({ id: "NY-S4", juris: "ny", asOf: "2026-06-15", cite: `${NY} single Example 4`, freq: "daily", gross: 750, status: "single", allowances: 2, expect: 44.1 }),
  st({ id: "NY-M1", juris: "ny", asOf: "2026-06-15", cite: `${NY} married Example 1`, freq: "weekly", gross: 400, status: "married", allowances: 4, expect: 6.69 }),
  st({ id: "NY-M2", juris: "ny", asOf: "2026-06-15", cite: `${NY} married Example 2`, freq: "semimonthly", gross: 5000, status: "married", allowances: 3, expect: 248.11, printedInconsistent: "prints 58.80 × 0.070 = 4.15; the table's rate is 0.0707 and 58.80 × 0.0707 = 4.157, so 248.12" }),
  st({ id: "NY-M3", juris: "ny", asOf: "2026-06-15", cite: `${NY} married Example 3`, freq: "monthly", gross: 50000, status: "married", allowances: 3, expect: 3622.09 }),
  st({ id: "NY-M4", juris: "ny", asOf: "2026-06-15", cite: `${NY} married Example 4`, freq: "daily", gross: 750, status: "married", allowances: 2, expect: 44.58 }),
  // Delaware: Section 17, $25,000 a year, each example's annual liability and its four per-period amounts.
  ...([
    ["A", "single", 1, 722, [13.88, 27.77, 30.08, 60.17]],
    ["B", "married_joint", 3, 339, [6.52, 13.04, 14.13, 28.25]],
    ["C", "married_filing_separately", 2, 612, [11.77, 23.54, 25.5, 51]],
  ] as const).flatMap(([ex, status, a, annual, per]) => [
    st({ id: `DE-${ex}-annual`, juris: "de", asOf: "2026-06-15", cite: `${DE}, Example ${ex}, line 6`, freq: "annually", gross: 25000, status, allowances: a, expect: annual }),
    ...(["weekly", "biweekly", "semimonthly", "monthly"] as const).map((freq, k) =>
      st({ id: `DE-${ex}-${freq}`, juris: "de", asOf: "2026-06-15", cite: `${DE}, Example ${ex}, line 7`, freq, gross: Math.round(25000 / { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 }[freq] * 100) / 100, status, allowances: a, expect: per[k] })),
  ]),
  // New Jersey: page 25. A3, B2 and B3 use weekly constants truncated from the annual table (384, 961, 5.76,
  // 15.28, 17.30) where the Rate Tables the same booklet sends employers to print 385, 962, 5.77, 15.29, 17.31.
  st({ id: "NJ-A1", juris: "nj", asOf: "2026-06-15", cite: `${NJ}, Rate Table A Example 1`, freq: "weekly", gross: 300, status: "rate_a", allowances: 1, expect: 4.21 }),
  st({ id: "NJ-A2", juris: "nj", asOf: "2026-06-15", cite: `${NJ}, Rate Table A Example 2`, freq: "weekly", gross: 700, status: "rate_a", allowances: 1, expect: 11.84 }),
  st({ id: "NJ-A3", juris: "nj", asOf: "2026-06-15", cite: `${NJ}, Rate Table A Example 3`, freq: "weekly", gross: 1200, status: "rate_a", allowances: 1, expect: 40.4, printedInconsistent: "uses $15.28 over $769; the Rate Table prints $15.29, so 40.41" }),
  st({ id: "NJ-B1", juris: "nj", asOf: "2026-06-15", cite: `${NJ}, Rate Table B Example 1`, freq: "weekly", gross: 375, status: "rate_b", allowances: 3, expect: 4.76 }),
  st({ id: "NJ-B2", juris: "nj", asOf: "2026-06-15", cite: `${NJ}, Rate Table B Example 2`, freq: "weekly", gross: 950, status: "rate_b", allowances: 3, expect: 15.93, printedInconsistent: "uses $5.76 over $384; the Rate Table prints $5.77 over $385, so 15.92" }),
  st({ id: "NJ-B3", juris: "nj", asOf: "2026-06-15", cite: `${NJ}, Rate Table B Example 3`, freq: "weekly", gross: 1400, status: "rate_b", allowances: 3, expect: 27.6, printedInconsistent: "uses $17.30 over $961; the Rate Table prints $17.31 over $962, so 27.58" }),
  // Illinois: the automated payroll example, and the wage-bracket example read at its row's middle.
  st({ id: "IL-Alice", juris: "il", asOf: "2026-06-15", cite: `${IL} p.3, automated payroll method example (Alice)`, freq: "weekly", gross: 800, status: "all", allowances: 2, secondary: 2, expect: 32.13 }),
  st({ id: "IL-Mary", juris: "il", asOf: "2026-06-15", cite: `${IL} p.2, wage bracket example (Mary), weekly row $300 to $302 read at $301`, freq: "weekly", gross: 301, status: "all", allowances: 2, secondary: 1, expect: 8.38 }),
  // Georgia: the September 2026 revision (4.99% from 11 May 2026).
  st({ id: "GA-E1", juris: "ga", asOf: "2026-06-15", cite: `${GA}, Table E example`, freq: "semimonthly", gross: 2000, status: "married_joint", allowances: 1, expect: 27.03 }),
  st({ id: "GA-F2", juris: "ga", asOf: "2026-06-15", cite: `${GA}, Table F example`, freq: "biweekly", gross: 935, status: "head_of_household", allowances: 2, expect: 0 }),
  // Georgia before 11 May (5.19%): the January edition is no longer served; figures as both sources cite it.
  st({ id: "GA-Jan-E1", juris: "ga", asOf: "2026-03-15", official: false, cite: "Georgia guide, January 2026 edition, Table E example ($1,470.83 semi-monthly, one dependent), as both sources cite it", freq: "semimonthly", gross: 1470.83, status: "married_joint", allowances: 1, expect: 15.79 }),
  // Massachusetts: not readable from here; the figures both sources cite.
  st({ id: "MA-floor", juris: "ma", asOf: "2026-06-15", official: false, cite: `${MA}: no withholding below $154 a week for one or more exemptions`, freq: "weekly", gross: 153.9, status: "single", allowances: 1, expect: 0 }),
  st({ id: "MA-HoH", juris: "ma", asOf: "2026-06-15", official: false, cite: `${MA}: 60,000 less 2,000 FICA less 5,400 exemptions at 5%, less $120 head of household (the other source's arithmetic)`, freq: "annually", gross: 60000, fica: 2000, status: "head_of_household", allowances: 2, expect: 2510 }),
  st({ id: "MA-wk-cell", juris: "ma", asOf: "2026-06-15", official: false, cite: `${MA}: weekly table, wages $150 to $160, one exemption, $2.93 (read at $155 with FICA at 7.65%)`, freq: "weekly", gross: 155, fica: 11.86, status: "single", allowances: 1, expect: 2.93 }),
  // States with no wage income tax.
  ...["tx", "fl", "wa"].map((j) => st({ id: `${j.toUpperCase()}-none`, juris: j, asOf: "2026-06-15", fromRates: true, cite: "no state income tax on wages (both sources agree)", freq: "weekly", gross: 1000, status: "single", allowances: 0, expect: "no income tax" })),
  // FICA and FUTA: Pub 15 prints the rates and bases, not worked figures; these apply them to one employee.
  { id: "FICA-SS", kind: "fica-ss", juris: "federal", asOf: "2026-06-15", official: true, fromRates: true, cite: P15, annual: 250000, expect: 11439 },
  { id: "FICA-Med", kind: "fica-medicare", juris: "federal", asOf: "2026-06-15", official: true, fromRates: true, cite: P15, annual: 250000, expect: 3625 },
  { id: "FICA-Addl", kind: "fica-additional", juris: "federal", asOf: "2026-06-15", official: true, fromRates: true, cite: P15, annual: 250000, expect: 450 },
  { id: "FUTA", kind: "futa", juris: "federal", asOf: "2026-06-15", official: true, fromRates: true, cite: P15, annual: 50000, expect: 42 },
];
