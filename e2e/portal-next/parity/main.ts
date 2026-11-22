// The parity ratchet's entry: node e2e/portal-next/parity/main.ts <report.json> <expected-failing.txt> [<errors.json>]
// It is e2e/ratchet/check.ts, which fails on a red check that is not on the list, with one more rule: it also fails on a listed
// check that passes. The parity list only shrinks, and it shrinks in the pull request that makes the check pass, so a pass that
// leaves its line behind is an error, not a warning (Goal 6, `design/goals/06-portal.md`, "The parity list").
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const check = join(import.meta.dirname, "../../ratchet/check.ts");
const run = spawnSync(process.execPath, [check, ...process.argv.slice(2)], { encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024 });
const out = `${run.stdout}${run.stderr}`;
process.stdout.write(out);
const passing = out.split("\n").filter((line) => line.includes("newly passing, take it off the list:"));
for (const line of passing) console.log(line.replace(/^(::warning::|WARNING: )/, process.env["GITHUB_ACTIONS"] === "true" ? "::error::" : "ERROR: "));
process.exit(run.status === 0 && passing.length === 0 ? 0 : 1);
