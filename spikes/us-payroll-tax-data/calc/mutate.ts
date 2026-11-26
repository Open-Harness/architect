// Throwaway break test: plant one small error at a time in a copy of the data and count the cases that catch it.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const dir = process.argv[2];
const orig = JSON.parse(readFileSync(`${dir}/ow.json`, "utf8"));
const plants: [string, (f: any) => void][] = [
  ["federal single 12% bracket base 1240 -> 1241", (f) => { f["federal/2026/withholding.yaml"].params.brackets.standard.single[2].base = "1241.00"; }],
  ["federal MFJ wage adjustment 12900 -> 12800", (f) => { f["federal/2026/withholding.yaml"].params.wage_adjustment.married_joint = "12800"; }],
  ["CA weekly standard deduction single +1", (f) => { const s = f["ca/2026/withholding.yaml"].params.standard_deduction.weekly; s.head_of_household = String(Number(s.head_of_household) + 1); }],
  ["NY monthly single top bracket rate 0.0735 -> 0.0736", (f) => { f["ny/2026/withholding.yaml"].params.brackets.monthly.single[9].rate = "0.0736"; }],
  ["IL Line 2 allowance 1000 -> 1100", (f) => { f["il/2026/withholding.yaml"].params.secondary_allowance_amount = "1100"; }],
  ["GA dependent allowance 5000 -> 4000", (f) => { f["ga/2026/withholding.yaml"].params.allowance_amount = "4000"; }],
  ["DE credit per allowance 110 -> 100", (f) => { f["de/2025/withholding.yaml"].params.credit_per_allowance = "100"; }],
];
const m = `${dir}/mutant`; mkdirSync(`${m}/pubs`, { recursive: true });
copyFileSync(`${dir}/pubs/p15t.txt`, `${m}/pubs/p15t.txt`);
for (const [name, plant] of plants) {
  const f = structuredClone(orig); plant(f);
  writeFileSync(`${m}/ow.json`, JSON.stringify(f));
  const out = execFileSync("node", [new URL("./run.ts", import.meta.url).pathname, m], { encoding: "utf8" }).split("\n");
  console.log(`${name}:\n  ${out[0]}\n  ${out[2]}`);
}
