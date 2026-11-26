// Prints the totals of an e2e suite from facts, so no pull request keeps a count by hand and none can conflict with another over one (G9).
//   node e2e/totals/totals.mjs                 every suite that has an expected-failing/ folder, as markdown on stdout
//   node e2e/totals/totals.mjs --suite <name>  that suite (repeatable), with or without a list
//   --root <dir>                               the folder that holds the suites (default: e2e/)
// Tests are counted by `vitest list --json` (nothing runs) with e2e/vitest.<suite>.config.ts, else e2e/vitest.config.ts.
// Reds are the lines of the files in e2e/<suite>/expected-failing/ (one `<check>.txt` per check file). CI appends the output to the
// e2e-totals job's step summary; nothing is written to a README.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");

/** The expected-failing keys of a list file: `m1/14-x.test.ts > describe > test`, one per line, `#` lines and blanks skipped. */
export const parseList = (text) => text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

/** Every key of every `*.txt` file in a suite's expected-failing/ folder, or undefined when the suite has none. */
export const readKeys = (dir) =>
  existsSync(dir) && statSync(dir).isDirectory()
    ? readdirSync(dir).filter((n) => n.endsWith(".txt")).sort().flatMap((n) => parseList(readFileSync(join(dir, n), "utf8")))
    : undefined;

/** An entry for a hook or a file that errored is not a test, so it is never counted as one. */
const isErrorKey = (key, file) => key === file || /\[[a-zA-Z ]* error\]$/.test(key);

/**
 * The facts: `tests` is vitest's list as [{ file, name }] (file relative to the e2e folder), `keys` the expected-failing
 * lines (or undefined when the suite has no list).
 */
export const facts = (suite, tests, keys) => {
  const files = new Map();
  for (const t of tests) files.set(t.file, [...(files.get(t.file) ?? []), `${t.file} > ${t.name}`]);
  const listed = new Set(keys ?? []);
  const rows = [...files].sort(([a], [b]) => (a < b ? -1 : 1)).map(([file, all]) => ({
    file: file.slice(suite.length + 1), tests: all.length, red: keys ? all.filter((k) => listed.has(k)).length : undefined,
  }));
  const known = new Set(tests.map((t) => `${t.file} > ${t.name}`));
  const stale = keys ? keys.filter((k) => !known.has(k) && !isErrorKey(k, k.split(" > ")[0])).length : 0;
  return { rows, stale, hasList: keys !== undefined };
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The suite's totals as markdown: a heading, a sentence and a table. */
export const render = (suite, { rows, stale, hasList }) => {
  const total = rows.reduce((n, r) => n + r.tests, 0);
  const red = rows.reduce((n, r) => n + (r.red ?? 0), 0);
  const sentence = hasList
    ? `${plural(total, "test", "tests")} in all; ${total - red} pass; ${red} expected to fail, listed in \`expected-failing/\`.${stale ? ` ${plural(stale, "listed line matches", "listed lines match")} no test: take ${stale === 1 ? "it" : "them"} off the list.` : ""}`
    : `${plural(total, "test", "tests")} in all; all pass.`;
  const head = hasList ? ["| File | Tests | Expected to fail |", "|---|---|---|"] : ["| File | Tests |", "|---|---|"];
  const line = (name, r) => `| ${name} | ${r.tests} |${hasList ? ` ${r.red} |` : ""}`;
  return [`### e2e/${suite}`, "", sentence, "", ...head, ...rows.map((r) => line(`\`${r.file}\``, r)), line("**All**", { tests: total, red }), ""].join("\n");
};

const listTests = (root, suite) => {
  const config = ["vitest.config.ts", `vitest.${suite}.config.ts`].filter((c) => existsSync(join(root, c))).at(-1);
  if (!config) throw new Error(`no ${join(root, "vitest.config.ts")}`);
  const out = execFileSync(join(repo, "node_modules/.bin/vitest"), ["list", "--json", "--root", root, "--config", join(root, config), `${suite}/`], {
    cwd: root, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("["))).map((t) => ({ file: relative(root, t.file), name: t.name })).filter((t) => t.file.startsWith(`${suite}/`));
};

export const run = (argv) => {
  const root = resolve(argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : join(repo, "e2e"));
  const named = argv.flatMap((a, i) => (a === "--suite" ? [argv[i + 1]] : []));
  const suites = named.length > 0 ? named : readdirSync(root).filter((n) => statSync(join(root, n)).isDirectory() && existsSync(join(root, n, "expected-failing"))).sort();
  if (suites.length === 0) { console.log(`no suite under ${relative(process.cwd(), root) || "."} has an expected-failing/ folder`); return 0; }
  for (const suite of suites) console.log(render(suite, facts(suite, listTests(root, suite), readKeys(join(root, suite, "expected-failing")))));
  return 0;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run(process.argv.slice(2)));
