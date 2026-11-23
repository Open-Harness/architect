// The presence step of `nx run e2e:on-chain` (Goal 4's done check): every slice's check must exist, so the done check cannot pass by there being
// none. `slices.json` names, for each of slices 3 to 12, the number prefix of the check file it adds; this fails while one is missing, or
// has no test in it, or while slices.json no longer names every slice. Written by the checks author; a builder never edits this file.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const REQUIRED_SLICES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** What is wrong with the presence of the slices' checks in `dir`, given the parsed slices.json; empty when every one is there. */
export const presenceProblems = (dir, list) => {
  const slices = Array.isArray(list?.slices) ? list.slices : [];
  const prefixes = slices.map((s) => s.prefix);
  const files = existsSync(dir) ? readdirSync(dir) : [];
  return [
    ...REQUIRED_SLICES.filter((n) => !slices.some((s) => s.slice === n)).map((n) => `slices.json names no check for slice ${n}`),
    ...slices.filter((s) => typeof s.prefix !== "string" || !/^\d{2}$/.test(s.prefix) || ["01", "02", "03"].includes(s.prefix)).map((s) => `slices.json: slice ${s.slice} has the prefix ${JSON.stringify(s.prefix)}, which is not a free two-digit number`),
    ...prefixes.filter((p, i) => prefixes.indexOf(p) !== i).map((p) => `slices.json gives the prefix ${p} twice`),
    ...slices.flatMap((s) => {
      const found = files.filter((f) => f.startsWith(`${s.prefix}-`) && f.endsWith(".test.ts"));
      const label = `slice ${s.slice} (${s.milestone}, ${s.what}): ${s.prefix}-<name>.test.ts`;
      if (found.length === 0) return [`${label} is missing`];
      return found.some((f) => /\b(?:it|test)\s*\(/.test(readFileSync(join(dir, f), "utf8"))) ? [] : [`${label} has no test in it`];
    }),
  ];
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = import.meta.dirname;
  const problems = presenceProblems(dir, JSON.parse(readFileSync(join(dir, "slices.json"), "utf8")));
  if (problems.length > 0) {
    console.error(`e2e:on-chain is not done: ${problems.length} slice check(s) are not there:\n${problems.map((p) => `  ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log("e2e:on-chain: every slice's check is there");
}
