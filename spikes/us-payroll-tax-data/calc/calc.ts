// Throwaway spike code. A minimal calculator over open-withholding's data (converted to one JSON by fetch.sh).
// It implements only the methods the 11 jurisdictions of this spike use. Not Effect, not production.
import { readFileSync } from "node:fs";

export type Freq = "weekly" | "biweekly" | "semimonthly" | "monthly" | "daily" | "annually";
export const PERIODS: Record<Freq, number> = {
  weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, daily: 260, annually: 1,
};

type Row = { over: string; rate: string; base?: string };
type Files = Record<string, any>;

export const cents = (x: number) => Math.sign(x) * Math.round(Math.abs(x) * 100 + 1e-7) / 100;
export const dollars = (x: number) => Math.sign(x) * Math.round(Math.abs(x) + 1e-7);
const n = (s: string | number | null | undefined) => (s == null ? 0 : Number(s));

// The bracket rule of open-withholding's methods/annualized_percentage.md step 4: the printed base is used.
export const bracket = (rows: Row[], x: number) => {
  let row = rows[0];
  for (const r of rows) if (n(r.over) <= x) row = r;
  let base = n(row.base);
  if (row.base == null) {
    // no printed base: cumulative over completed brackets
    base = 0;
    for (let i = 0; i < rows.length && rows[i] !== row; i++) {
      base += (n(rows[i + 1].over) - n(rows[i].over)) * n(rows[i].rate);
    }
  }
  return base + (x - n(row.over)) * n(row.rate);
};

export class Data {
  files: Files;
  constructor(path: string) { this.files = JSON.parse(readFileSync(path, "utf8")); }
  /** The parameter file for a jurisdiction and tax in force on a date (latest effective_from not after it). */
  pick(dir: string, tax: string, asOf: string) {
    const c = Object.entries(this.files)
      .filter(([p, f]) => p.startsWith(dir + "/") && f.tax === tax && String(f.effective_from) <= asOf &&
        (f.effective_to == null || String(f.effective_to) >= asOf))
      .sort((a, b) => String(a[1].effective_from).localeCompare(String(b[1].effective_from)));
    if (!c.length) return undefined;
    const [path, f] = c[c.length - 1];
    return { path, ...f };
  }
  taxes(dir: string) {
    return [...new Set(Object.entries(this.files).filter(([p]) => p.startsWith(dir + "/")).map(([, f]) => f.tax))];
  }
}

// Federal: Pub 15-T Worksheet 1A, W-4 2020 or later.
export type W4 = { status: "single" | "married_joint" | "head_of_household"; step2?: boolean; step3?: number;
  step4a?: number; step4b?: number; step4c?: number };
export function federalTentativeAnnual(d: Data, asOf: string, annualWages: number, w: W4) {
  const p = d.pick("federal", "federal_income_withholding", asOf)!.params;
  const adj = w.step2 ? 0 : n(p.wage_adjustment[w.status]);
  const aawa = Math.max(0, annualWages + (w.step4a ?? 0) - (w.step4b ?? 0) - adj);
  const table = w.step2 ? p.brackets.step2_checkbox[w.status] : p.brackets.standard[w.status];
  return bracket(table, aawa);
}
export function federal(d: Data, asOf: string, freq: Freq, gross: number, w: W4) {
  const P = PERIODS[freq];
  const tentative = federalTentativeAnnual(d, asOf, gross * P, w) / P;
  return cents(Math.max(0, tentative - (w.step3 ?? 0) / P)) + (w.step4c ?? 0);
}

// FICA for one year's wages paid at once (employee side), and FUTA (employer side).
export function fica(d: Data, asOf: string, annualWages: number) {
  const p = d.pick("federal", "fica", asOf)!.params;
  const ss = cents(Math.min(annualWages, n(p.social_security.wage_base)) * n(p.social_security.employee_rate));
  const medicare = cents(annualWages * n(p.medicare.employee_rate));
  const additional = cents(Math.max(0, annualWages - n(p.medicare.additional_threshold)) *
    n(p.medicare.additional_employee_rate));
  return { ss, medicare, additional };
}
export function futa(d: Data, asOf: string, annualWages: number, creditReduction = 0) {
  const p = d.pick("federal", "futa", asOf)!.params;
  return cents(Math.min(annualWages, n(p.wage_base)) * (n(p.rate) - n(p.max_credit) + creditReduction));
}

// State income tax. One entry point; the method named in the file picks the arithmetic.
export type StateInput = { freq: Freq; gross: number; status: string; allowances: number; secondary?: number;
  fica?: number; ytdRetirementUsed?: number };
export function state(d: Data, st: string, asOf: string, i: StateInput): number | "no income tax" {
  const f = d.pick(st, "state_income_withholding", asOf);
  if (!f) return "no income tax";
  const p = f.params, P = PERIODS[i.freq], A = i.allowances;
  switch (f.method) {
    case "annualized_percentage": {
      const sd = p.standard_deduction ? n(p.standard_deduction[i.status]) : 0;
      const taxable = Math.max(0, i.gross * P - sd - A * n(p.allowance_amount) - (i.secondary ?? 0) *
        n(p.secondary_allowance_amount));
      const rows = p.brackets.all ?? p.brackets[i.status];
      let tax = bracket(rows, taxable);
      if (p.credit_per_allowance) tax = Math.max(0, tax - A * n(p.credit_per_allowance));
      return cents(tax / P);
    }
    case "per_period_percentage": { // NJ: the letter of the NJ-W4 is the status (rate_a … rate_e)
      const net = Math.max(0, i.gross - A * n(p.allowance_amounts_per_period[i.freq]));
      return cents(bracket(p.brackets[i.freq][i.status], net));
    }
    case "custom":
      if (st === "ca") return california(p, i);
      if (st === "ny") return newYork(p, i);
      if (st === "ma") return massachusetts(p, i);
  }
  throw new Error(`${st}: method ${f.method} not in this spike`);
}

function california(p: any, i: StateInput) { // methods/custom/us_ca.md, DE 44 Method B
  const col = i.status === "single" ? "single" : i.status === "head_of_household" ? "head_of_household"
    : i.allowances >= 2 ? "married_allowances_2_plus" : "married_allowances_0_1";
  if (i.gross <= n(p.low_income_exemption[i.freq][col])) return 0;
  const est = i.secondary ? n(p.estimated_deduction[i.freq][i.secondary - 1]) : 0;
  const taxable = Math.max(0, i.gross - est - n(p.standard_deduction[i.freq][col]));
  const bstatus = i.status === "single" ? "single" : i.status === "head_of_household" ? "head_of_household" : "married";
  const tax = cents(bracket(p.brackets[i.freq][bstatus], taxable));
  const credit = i.allowances ? n(p.exemption_allowance[i.freq][i.allowances - 1]) : 0;
  return cents(Math.max(0, tax - credit));
}

function newYork(p: any, i: StateInput) { // methods/custom/us_ny.md, NYS-50-T-NYS Methods II and III
  const s = i.status === "single" ? "single" : "married";
  const net = Math.max(0, i.gross - n(p.deduction[i.freq][s]) - i.allowances * n(p.exemption_value[i.freq]));
  const P = PERIODS[i.freq];
  if (net >= n(p.method_iii_cutover[i.freq][s])) {
    const annual = net * P;
    let rate = n(p.method_iii[s][0].rate);
    for (const b of p.method_iii[s]) if (n(b.over) <= annual) rate = n(b.rate);
    return cents(annual * rate / P);
  }
  return cents(bracket(p.brackets[i.freq][s], net));
}

function massachusetts(p: any, i: StateInput) { // methods/custom/us_ma.md, Circular M
  const P = PERIODS[i.freq], f = p.exemption_factors[i.freq];
  if (i.allowances >= 1 && i.gross < n(p.low_income_floor[i.freq])) return 0;
  const remaining = Math.max(0, n(p.retirement_deduction_cap) - (i.ytdRetirementUsed ?? 0));
  let w = i.gross - Math.min(i.fica ?? 0, remaining);
  if (i.allowances === 1) w -= n(f.claiming_one);
  if (i.allowances > 1) w -= n(f.per_exemption) * i.allowances + n(f.plus);
  w = Math.max(0, w);
  let period = bracket(p.brackets, w * P) / P;
  if (i.status === "head_of_household") period -= n(p.hoh_tax_value[i.freq]);
  return cents(Math.max(0, period));
}
