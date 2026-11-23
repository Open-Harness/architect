// The ratchet's entry: node e2e/ratchet/check.ts <report.json> <expected-failing folder or file> [<errors.json>]
// RATCHET_ROOT=<package folder> keys the files of a package test run (G11); without it, keys are relative to the e2e folder.
// errors.json is reporter.ts's file (hooks that threw, unhandled errors); when given it must exist, or the run did not finish.
// Exit 0 when every failing test is on the list; 1 when one is not, or when there is no usable report (a crashed run).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { compare, ok, parseFolder, parseList, type Report } from "./ratchet.ts";

const [reportPath, listPath, errorsPath] = process.argv.slice(2);
const github = process.env["GITHUB_ACTIONS"] === "true";
// File keys are relative to this folder: the e2e folder for `e2e/m1`, or the package named by RATCHET_ROOT (G11).
const e2eRoot = process.env["RATCHET_ROOT"] === undefined ? resolve(import.meta.dirname, "..") : resolve(process.env["RATCHET_ROOT"]);

const annotate = (level: "error" | "warning", message: string): void => {
  console.log(github ? `::${level}::${message}` : `${level.toUpperCase()}: ${message}`);
};

const fail = (message: string): never => {
  annotate("error", message);
  process.exit(1);
};

const readReport = (path: string): Report | undefined => {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    return typeof value === "object" && value !== null && Array.isArray((value as Report).testResults) ? (value as Report) : undefined;
  } catch {
    return undefined;
  }
};

const readReport2 = (path: string): Pick<Report, "suiteErrors" | "unhandled"> => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Pick<Report, "suiteErrors" | "unhandled">;
  } catch {
    return fail(`${path} is not the reporter's hook-error file`);
  }
};

if (reportPath === undefined || listPath === undefined) fail("usage: check.ts <report.json> <expected-failing folder> [<errors.json>]");
if (!existsSync(String(reportPath))) fail(`no vitest report at ${reportPath}: the run crashed before it wrote one`);
const report = readReport(String(reportPath));
if (report === undefined) fail(`${reportPath} is not a vitest JSON report`);
if (report!.testResults.length === 0) fail("the vitest report has no test files: nothing ran");

let merged: Report = report!;
if (errorsPath !== undefined) {
  if (!existsSync(errorsPath)) fail(`no hook-error file at ${errorsPath}: the reporter did not finish, so hook failures are unknown`);
  const extra = readReport2(errorsPath);
  merged = { ...merged, suiteErrors: extra.suiteErrors ?? [], unhandled: extra.unhandled ?? [] };
}

// The list is a folder, one `<check>.txt` per check file; a single file still reads as one list.
// A missing path is an empty list: git drops the folder when a builder deletes its last file.
const list = !existsSync(String(listPath))
  ? { keys: [] as string[], misfiled: [] as string[] }
  : statSync(String(listPath)).isDirectory()
  ? parseFolder(readdirSync(String(listPath)).filter((n) => n.endsWith(".txt")).sort().map((name) => ({ name, text: readFileSync(join(String(listPath), name), "utf8") })))
  : { keys: parseList(readFileSync(String(listPath), "utf8")), misfiled: [] };
for (const entry of list.misfiled) annotate("error", `filed under another check's name: ${entry}`);
const verdict = compare(merged, list.keys, e2eRoot);

for (const key of verdict.nowPassing) annotate("warning", `newly passing, take it off the list: ${key}`);
for (const key of verdict.missing) annotate("warning", `on the list but not in the report (renamed or deleted?): ${key}`);
for (const key of verdict.notRun) annotate("warning", `on the list but skipped this run: ${key}`);
for (const key of verdict.unexpected) annotate("error", `failing and not on the expected-failing list: ${key}`);

// Backstop: vitest failed, and no test in the report did. Something the report does not carry (a crash, a late throw) must not come out green.
const vitestExit = process.env["RATCHET_VITEST_EXIT"];
if (vitestExit !== undefined && vitestExit !== "0" && verdict.failing === 0) annotate("error", `vitest exited ${vitestExit}, and no test in the report failed`);

console.log(
  `ratchet: ${verdict.failing} failing, ${verdict.failing - verdict.unexpected.length} expected, ${verdict.unexpected.length} unexpected, ${verdict.nowPassing.length} newly passing, ${verdict.missing.length} missing`,
);
process.exit(ok(verdict) && list.misfiled.length === 0 && !(vitestExit !== undefined && vitestExit !== "0" && verdict.failing === 0) ? 0 : 1);
