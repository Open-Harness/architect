// Throwaway. node calc/run.ts <scratch-dir>   (after calc/fetch.sh <scratch-dir>)
// Runs every published case through the calculator, and every cell of Pub 15-T's 2026 wage-bracket tables for
// W-4s from 2020 or later (the publication prints no percentage-method worked example; its wage-bracket cells are
// the percentage method worked at each row's middle and rounded to the dollar).
import { readFileSync } from "node:fs";
import { Data, federalTentativeAnnual, fica, futa, state, dollars, PERIODS, type Freq, type W4 } from "./calc.ts";
import { cases } from "./cases.ts";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node calc/run.ts <scratch-dir>");
const d = new Data(`${dir}/ow.json`);

let pass = 0, fail = 0, passUnofficial = 0, failUnofficial = 0;
const failures: string[] = [];
for (const c of cases) {
  let got: number | string;
  if (c.kind === "state") {
    got = state(d, c.juris, c.asOf, { freq: c.freq!, gross: c.gross!, status: c.status!, allowances: c.allowances!,
      secondary: c.secondary, fica: c.fica, ytdRetirementUsed: c.ytdRetirementUsed });
  } else if (c.kind === "futa") got = futa(d, c.asOf, c.annual!);
  else {
    const f = fica(d, c.asOf, c.annual!);
    got = c.kind === "fica-ss" ? f.ss : c.kind === "fica-medicare" ? f.medicare : f.additional;
  }
  const ok = got === c.expect || (typeof got === "number" && typeof c.expect === "number" && Math.abs(got - c.expect) < 0.005);
  if (c.official) ok ? pass++ : fail++; else ok ? passUnofficial++ : failUnofficial++;
  if (!ok) failures.push(`${c.id}: expected ${c.expect}, got ${got}${c.printedInconsistent ? ` — publication: ${c.printedInconsistent}` : ""}${c.official ? "" : " [not read officially]"}`);
}

// Federal: every wage-bracket cell of section 2 (W-4 2020 or later).
const txt = readFileSync(`${dir}/pubs/p15t.txt`, "utf8").split("\n");
const cols: W4[] = [
  { status: "married_joint" }, { status: "married_joint", step2: true },
  { status: "head_of_household" }, { status: "head_of_household", step2: true },
  { status: "single" }, { status: "single", step2: true },
];
let inSection = false, freq: Freq | undefined;
let fedPass = 0, fedFail = 0;
const money = (s: string) => Number(s.replace(/[$,]/g, ""));
for (const line of txt) {
  if (/Wage Bracket Method Tables for Manual Payroll Systems with Forms W-4 From 2020 or Later/i.test(line)) { inSection = true; continue; }
  if (/Wage Bracket Method Tables for Manual Payroll Systems With Forms W-4 From 2019 or Earlier/i.test(line)) { inSection = false; continue; }
  const m = line.match(/\b(WEEKLY|BIWEEKLY|SEMIMONTHLY|MONTHLY|DAILY) Payroll Period/);
  if (m) { freq = m[1].toLowerCase() as Freq; continue; }
  if (!inSection || !freq) continue;
  const nums = line.trim().split(/\s+/).filter((t) => /^\$?[\d,]+(\.\d+)?$/.test(t));
  if (nums.length !== 8 || !line.trim().startsWith("$")) continue;
  const [lo, hi, ...vals] = nums.map(money);
  const mid = (lo + hi) / 2, P = PERIODS[freq];
  cols.forEach((w, k) => {
    const raw = federalTentativeAnnual(d, "2026-06-15", mid * P, w) / P;
    // daily cells are printed to the dime, the rest to the dollar
    const got = freq === "daily" ? Math.round(raw * 10 + 1e-7) / 10 : dollars(raw);
    if (got === vals[k]) fedPass++;
    else { fedFail++; if (fedFail <= 10) failures.push(`Pub 15-T ${freq} $${lo}-$${hi} ${w.status}${w.step2 ? " step2" : ""}: printed ${vals[k]}, got ${got}`); }
  });
}

console.log(`published worked examples read in the agencies' own documents: ${pass} pass, ${fail} fail`);
console.log(`figures as both sources cite them (agency site refused automated reading): ${passUnofficial} pass, ${failUnofficial} fail`);
console.log(`Pub 15-T 2026 wage-bracket cells (W-4 2020+), percentage method at row middle: ${fedPass} pass, ${fedFail} fail`);
for (const f of failures) console.log("  " + f);
