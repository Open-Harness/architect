// Check 36 (snag S-29, `design/goals/03-snags.md`): `ortho prove` fails fast, and says why, when a handler imports a rule its `invariants.ts` does not
// export. With `oneHolderPerName` gone from Plugged In's `blueprint/things/handle/invariants.ts` while `src/handle/resolve.ts` still imports it, wrangler cannot
// build the worker, the world never comes up, and prove waits for ever with nothing said (seen on stand-ins by the checks author and the 🔍 of #241; check 34 stops its own
// prove at 240 s so it fails rather than hangs). Its sibling is check 33, a missing handler file, which this file reads the same way. Written by the checks author; a
// builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. On a copy of `examples/plugged-in` with that export removed, `ortho prove` (the whole run, and `--only` one journey) exits non-zero within 60 s,
// and some line of its output (colour codes stripped) is a CLAIM LINE for the missing rule: it holds the rule as a whole identifier, a file (any path ending in
// `handle/invariants.ts`, or a handler that imports the rule), and a cue that something is absent ("not exported", "no matching export", "lacks", "missing", ...).
// No line claims the other rule, and no generic timeout line stands in for the answer. There is no grammar here: no nearness, no negation, no question or object rules.
// A line is read for its facts, and the first rule named on it is the one it claims.
//
// WHAT PINS THE BEHAVIOUR IS THE CONTRAST, NOT THE MATCHER. A prove that only guesses, lists both rules, or always names the first prints the same words in
// both copies, so it fails one of them. The red copies (`oneHolderPerName` removed, whole and `--only`; `oneNamePerPerson` removed) are judged by the same `problems`,
// and prove passes only by naming the rule that is actually gone. The controls plant each hollow strategy and assert that one copy refuses it.
//
// THE BOUND, 60 s, as check 33's: above a healthy world's slowest start, far below a hang. A prove still running at 60 s fails the check, but is left running until 90 s,
// the hard stop, so a slow exit (say at 75 s) is read for what it is, "too late", rather than as a hang. Prove runs in a process group of its own; whether it exits or hangs, that
// group and every descendant seen while it ran are stopped afterwards, and the check asserts that nothing of the copy is left running.
//
// Red today on one reason: prove does not exit within the bound. Controls, true today: the matcher knows a good message from each wrong one; an intact copy proves a journey
// green inside the bound. No Docker. Prove's own world uses port 0.
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as L from "./loop.ts";
import { cli } from "../layer1/support.ts";
import { nothingRunning, repo } from "./support.ts";
import { worldProcesses } from "./prove-speed.ts";

const BOUND_SECONDS = 60;
const HARD_STOP_SECONDS = 90;
const EXPORT = "oneHolderPerName";
const INVARIANTS = "blueprint/things/handle/invariants.ts";
const example = join(repo, "examples/plugged-in");

const copies: Array<ReturnType<typeof L.freshProject>> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });
const intact = () => { const copy = L.freshProject(example); copies.push(copy); return copy.root; };
/** The two rules a handler imports from `handle/invariants.ts`, the comment that opens each declaration, and the handlers that import it. */
const RULES = {
  oneHolderPerName: { opens: "// A name has one holder", importers: ["src/handle/resolve.ts", "src/profile/get.ts"], other: "oneNamePerPerson" },
  oneNamePerPerson: { opens: "// A person holds one claimed name", importers: ["src/link/add.ts"], other: "oneHolderPerName" },
} as const;
type Rule = keyof typeof RULES;
/** A copy whose `invariants.ts` no longer declares `rule`, while a handler still imports it: the situation S-29 is about. */
const broken = (rule: Rule) => {
  const root = intact();
  const file = join(root, INVARIANTS);
  const text = readFileSync(file, "utf8");
  const stripped = text.replace(new RegExp(`${RULES[rule].opens}[\\s\\S]*?\\}\\);\\n+`), "");
  if (stripped === text || stripped.includes(`export const ${rule}`) || !stripped.includes(`export const ${RULES[rule].other}`)) throw new Error(`the stand-in could not remove only ${rule} from ${INVARIANTS}`);
  for (const importer of RULES[rule].importers) if (!readFileSync(join(root, importer), "utf8").includes(rule)) throw new Error(`${importer} no longer imports ${rule}: the stand-in is no longer the S-29 case`);
  writeFileSync(file, stripped);
  return root;
};

/** Every process below this pid, whatever its name, as of now. */
const descendants = (top: number): ReadonlyArray<number> => {
  const table = spawnSync("ps", ["-axo", "pid=,ppid="], { encoding: "utf8" }).stdout.split("\n")
    .flatMap((line) => { const m = line.trim().match(/^(\d+)\s+(\d+)$/); return m ? [{ pid: Number(m[1]), ppid: Number(m[2]) }] : []; });
  const below = new Set([top]);
  for (let grew = true; grew;) { grew = false; for (const p of table) if (below.has(p.ppid) && !below.has(p.pid)) { below.add(p.pid); grew = true; } }
  return [...below];
};
const signal = (pids: ReadonlyArray<number>, name: NodeJS.Signals) => { for (const pid of pids) { try { process.kill(pid, name); } catch { /* gone */ } } };

interface Ended { readonly status: number | null; readonly out: string; readonly seconds: number; readonly hung: boolean }
/**
 * `ortho prove <args>` as a user runs it, in a process group of its own. Whether it exits or hangs, its group and every descendant seen while it ran are stopped
 * afterwards (a wrangler or workerd that outlives prove is left behind on a shared Mac); the tests then assert nothing of the copy is left.
 */
const proveOnce = async (root: string, ...args: ReadonlyArray<string>): Promise<Ended> => {
  const child = spawn(process.execPath, [cli, "prove", ...args, "--root", root], { cwd: root, detached: true });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const seen = new Set<number>();
  const watch = () => { for (const pid of descendants(child.pid!)) seen.add(pid); };
  const watcher = setInterval(watch, 1000);
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  const status = await new Promise<number | null | "hung">((resolve) => {
    child.once("close", (code) => resolve(code));
    timer = setTimeout(() => resolve("hung"), HARD_STOP_SECONDS * 1000);
  });
  clearTimeout(timer);
  clearInterval(watcher);
  const seconds = (Date.now() - started) / 1000;
  watch();
  const stop = (name: NodeJS.Signals) => { try { process.kill(-child.pid!, name); } catch { /* gone */ } signal([...seen].filter((pid) => pid !== process.pid), name); };
  stop("SIGTERM");
  await new Promise((r) => setTimeout(r, 2000));
  stop("SIGKILL");
  return status === "hung" ? { status: null, out, seconds, hung: true } : { status, out, seconds, hung: false };
};
const leftRunning = async (root: string) => {
  for (let i = 0; i < 20; i++) { if (worldProcesses(root).length === 0 && spawnSync("pgrep", ["-f", root], { encoding: "utf8" }).stdout.trim() === "") return []; await new Promise((r) => setTimeout(r, 250)); }
  return [...worldProcesses(root), spawnSync("pgrep", ["-fl", root], { encoding: "utf8" }).stdout.trim()];
};

/** Colour codes off: wrangler paints esbuild's error even into a file, and `\x1b[1m` glued to `No` leaves no word boundary there. */
const plain = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, "");
/** Where `rule` occurs in the line as a whole identifier (`oneHolderPerNameV2` is not `oneHolderPerName`). */
const wordAt = (line: string, rule: string) => [...line.matchAll(new RegExp(`(?<![\\w$])${rule}(?![\\w$])`, "g"))].map((m) => m.index!);
/** Any phrase that says something is absent. Bare "not" or "no" are not here: they sit in "(not yet checked)" and "no journeys ran". */
const CUE = new RegExp([
  "no matching export", "(?:not|(?:is|was|are|does|do)n't) export(?:ed)?", "no exported member", "does not provide an export", "no (?:rule|export)s? named", "missing", "lacks?", "absent",
  "not found", "unresolved", "cannot find", "could not (?:find|resolve)", "undefined",
].map((phrase) => `(?<![\\w-])(?:${phrase})(?![\\w-])`).join("|"), "i");
/** The invariants file at a path boundary, however much of the path is written (`handle/invariants.ts`, the full path, backslashes too); not `link/invariants.ts`, nor `xhandle/invariants.ts`. */
const FILE = /(?<![\w.-])handle[\\/]invariants\.ts(?![\w-])/;
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const fileOn = (line: string, rule: Rule) => FILE.test(line) || new RegExp(`(^|[^\\w.-])(${RULES[rule].importers.map(escaped).join("|")})(?![\\w-])`).test(line);
/** The rule a line claims is missing: the first of the two rules it names, when the line also holds a file for that rule and a cue of absence; otherwise none. */
const claimedBy = (line: string): Rule | undefined => {
  const first = (Object.keys(RULES) as Rule[]).map((rule) => ({ rule, at: wordAt(line, rule)[0] })).filter((r) => r.at !== undefined).sort((a, b) => a.at! - b.at!)[0];
  return first && CUE.test(line) && fileOn(line, first.rule) ? first.rule : undefined;
};
/** Every line of `out` that claims `rule` is missing. */
const claims = (out: string, rule: Rule) => plain(out).split("\n").filter((line) => claimedBy(line) === rule);
/** Any line that blames a timeout or a wait: the generic message S-29 asks not to be the whole answer. */
const sayTimeout = (out: string) => /time[ds]?[ -]?out|timing out|gave up|never became ready|deadline|waiting for|did not (come up|start|finish|become ready) (in|within)/i.test(out);
/** What is wrong with how a prove of the copy that lost `rule` ended: empty when it exited non-zero inside the bound, a line claims that rule, and no line claims the other. */
const problems = (ended: Ended, rule: Rule = EXPORT): ReadonlyArray<string> => [
  ...(ended.hung ? [`still running after ${HARD_STOP_SECONDS} s`] : []),
  ...(ended.seconds >= BOUND_SECONDS ? [`took ${ended.seconds} s, not under ${BOUND_SECONDS}`] : []),
  ...(ended.status === null || ended.status === 0 || ended.status >= 126 ? [`exit status is ${ended.status}, not a deliberate failure`] : []),
  ...(claims(ended.out, rule).length > 0 ? [] : [`no line says ${rule} is missing, with a file`]),
  ...(claims(ended.out, RULES[rule].other).length > 0 ? [`a line says ${RULES[rule].other} is missing, and it is not`] : []),
  ...(sayTimeout(ended.out) ? ["a generic timeout line"] : []),
];
/** What wrangler writes for the S-29 copy: esbuild's error, coloured even in a file, with a path relative to the worker (from a real `.ortho/prove/wrangler.log`). */
const WRANGLER_LINE = `  \u001b[31m✘ \u001b[41;31m[\u001b[41;97mERROR\u001b[41;31m]\u001b[0m \u001b[1mNo matching export in "../../blueprint/things/handle/invariants.ts" for import "${EXPORT}"\u001b[0m`;
const WRANGLER_LOG = [
  " ⛅️ wrangler 4.156.1 (update available 4.166.0)",
  "Your Worker has access to the following bindings:",
  "env.WORLD (World)                       Durable Object            local",
  "env.DB (plugged-in)                     D1 Database               local",
  "\u001b[31m✘ \u001b[41;31m[\u001b[41;97mERROR\u001b[41;31m]\u001b[0m \u001b[1mBuild failed with 2 errors:\u001b[0m",
  "",
  WRANGLER_LINE,
  "  ",
  "      ../../src/handle/resolve.ts:6:9:",
  "  \u001b[37m      6 │ import { \u001b[32moneHolderPerName\u001b[37m } from \"../../blueprint/things/handle/inv...",
  "          ╵          \u001b[32m~~~~~~~~~~~~~~~~\u001b[0m",
  WRANGLER_LINE,
  "      ../../src/profile/get.ts:7:9:",
].join("\n");
const said = `src/handle/resolve.ts imports ${EXPORT}, which ${INVARIANTS} does not export`;
const endedWith = (out: string, status = 1): Ended => ({ status, out, seconds: 5, hung: false });
/** True when a prove that printed `out` and exited 1 passes for the copy that lost `rule`. */
const passes = (out: string, rule: Rule = EXPORT) => problems(endedWith(out), rule).length === 0;

describe("36 controls: the verdict, the hollow strategies, and an intact copy", () => {
  it("a claim line is read for its facts, in any phrasing", () => {
    const TS = `Module '"../../${INVARIANTS}"' has no exported member '${EXPORT}'.`;
    const real: ReadonlyArray<readonly [string, string]> = [
      ["the real wrangler coloured line", WRANGLER_LINE],
      ["the real wrangler.log", WRANGLER_LOG],
      ["esbuild, a 200-character absolute path", `No matching export in "${"/var/folders/".padEnd(200, "x")}/${INVARIANTS}" for import "${EXPORT}"`],
      ["node", `SyntaxError: The requested module 'file:///${"x".repeat(200)}/${INVARIANTS}' does not provide an export named '${EXPORT}'`],
      ["ortho check's TS2305", `  src/handle/resolve.ts:6  TS2305: ${TS}`],
      ["raw tsc's TS2305", `src/handle/resolve.ts(6,10): error TS2305: ${TS}`],
      ["tsc's TS2724", `src/handle/resolve.ts(6,10): error TS2724: '"../../${INVARIANTS}"' has no exported member named '${EXPORT}'. Did you mean 'oneNamePerPerson'?`],
      ["rollup", `"${EXPORT}" is not exported by "${INVARIANTS}", imported by "src/handle/resolve.ts".`],
      ["a short path", `handle/invariants.ts does not export ${EXPORT}`],
      ["a path from things", `things/handle/invariants.ts does not export ${EXPORT}`],
      ["backslashes", `blueprint\\things\\handle\\invariants.ts does not export ${EXPORT}`],
      ["the import and the file that lacks it", `src/handle/resolve.ts imports ${EXPORT}, which ${INVARIANTS} lacks`],
      ["a colon list", `${INVARIANTS}: missing: ${EXPORT}`],
      ["no rule named", `${INVARIANTS} has no rule named ${EXPORT}`],
      ["could not resolve", `Could not resolve ${EXPORT} from ${INVARIANTS}`],
      ["isn't exported", `src/handle/resolve.ts: ${EXPORT} isn't exported from ${INVARIANTS}`],
      ["a handler as the file", `${EXPORT} is missing (imported by src/handle/resolve.ts)`],
      ["among other lines", `${WRANGLER_LINE}\n\u001b[31mX\u001b[0m something else`],
    ];
    for (const [name, out] of real) expect(passes(out), name).toBe(true);
    expect(passes(`src/link/add.ts imports oneNamePerPerson, which ${INVARIANTS} does not export`, "oneNamePerPerson")).toBe(true);
    expect(passes(`src/link/add.ts(6,10): error TS2724: '"${INVARIANTS}"' has no exported member named 'oneNamePerPerson'. Did you mean '${EXPORT}'?`, "oneNamePerPerson")).toBe(true);
    const hollow: ReadonlyArray<readonly [string, string]> = [
      ["empty output", ""],
      ["prove couldn't run", "prove couldn't run"],
      ["a file with no rule", `prove couldn't run: ${INVARIANTS} could not be loaded`],
      ["a rule with no file", `prove couldn't run: ${EXPORT} is missing`],
      ["a wrong file, link", `${EXPORT} missing in blueprint/things/link/invariants.ts`],
      ["a wrong file, node_modules", `node_modules/foo/invariants.ts does not export ${EXPORT}`],
      ["a wrong file, xhandle", `${EXPORT} missing in blueprint/things/xhandle/invariants.ts`],
      ["a handler that does not import it", `${EXPORT} missing, imported by src/link/add.ts`],
      ["a longer identifier", `${EXPORT}V2 not found in ${INVARIANTS}`],
      ["an echo of the import, no cue", `src/handle/resolve.ts:3: import { ${EXPORT} } from "../../blueprint/things/handle/invariants.ts"`],
      ["a loaded-rules log, no cue", `loaded rules from ${INVARIANTS}: ${EXPORT}`],
      ["it says the rule is there", `${EXPORT} is exported from ${INVARIANTS}`],
      ["a timeout line", `timed out waiting for the world: ${EXPORT} missing in ${INVARIANTS}`],
      ["the other rule is the one named", `src/handle/resolve.ts imports oneNamePerPerson, which ${INVARIANTS} does not export`],
    ];
    for (const [name, out] of hollow) expect(passes(out), name).toBe(false);
    expect(claims(`${INVARIANTS}: ${EXPORT}, oneNamePerPerson missing`, "oneNamePerPerson"), "the first rule on the line is the one claimed").toEqual([]);
  });

  it("the verdict passes a prove that fails fast and says why, and refuses each other way", () => {
    const ok = endedWith(said);
    expect(problems(ok)).toEqual([]);
    expect(problems({ ...ok, status: 0 }), "exits 0").toHaveLength(1);
    expect(problems({ ...ok, status: null, hung: true, seconds: 90 }).length).toBeGreaterThan(1);
    expect(problems({ ...ok, seconds: 75 }), "exits too late").toHaveLength(1);
    expect(problems({ ...ok, out: "" }), "exits 1 with no message").toHaveLength(1);
    expect(problems({ ...ok, out: `timed out: ${said}` }), "a timeout line").toHaveLength(1);
    expect(problems({ ...ok, status: 2, out: "prove couldn't run" }), "a generic failure").toHaveLength(1);
    expect(problems({ ...ok, status: 139 }), "a crash").toHaveLength(1);
    expect(problems(ok, "oneNamePerPerson"), "names the other rule").toHaveLength(2);
    expect(problems({ ...ok, out: `${said}\n${INVARIANTS} lacks oneNamePerPerson` }), "also claims the rule that is there").toHaveLength(1);
  });

  it("each hollow strategy fails at least one of the two copies, and a correct one passes both", () => {
    const rules = Object.keys(RULES) as Rule[];
    const strategies: Readonly<Record<string, (removed: Rule) => string>> = {
      "one constant line naming both": () => `missing rule oneHolderPerName or oneNamePerPerson in ${INVARIANTS}`,
      "one constant line, a list": () => `a rule is missing from ${INVARIANTS} (oneHolderPerName, oneNamePerPerson)`,
      "one claim line per rule": () => rules.map((r) => `${INVARIANTS} lacks ${r}`).join("\n"),
      "always the first rule": () => `${INVARIANTS} lacks oneHolderPerName`,
      "always the second rule (the reverse order)": () => `${INVARIANTS} lacks oneNamePerPerson`,
      "a constant TS2724 line": () => `src/handle/resolve.ts(6,10): error TS2724: '"${INVARIANTS}"' has no exported member named 'oneHolderPerName'. Did you mean 'oneNamePerPerson'?`,
    };
    for (const [name, strategy] of Object.entries(strategies)) {
      const verdicts = rules.map((removed) => problems(endedWith(strategy(removed)), removed));
      expect(verdicts.some((v) => v.length > 0), `a prove that does this passes both copies: ${name}`).toBe(true);
    }
    const correct = (removed: Rule) => `${RULES[removed].importers[0]} imports ${removed}, which ${INVARIANTS} does not export`;
    for (const removed of rules) expect(problems(endedWith(correct(removed)), removed), `naming the removed rule: ${removed}`).toEqual([]);
  });

  it("an intact copy of Plugged In proves green inside the bound, with `claim a handle` passing, and nothing is left running", async () => {
    const root = intact();
    const done = await proveOnce(root);
    expect(done.hung, done.out.slice(-300)).toBe(false);
    expect(done.status, done.out.slice(-300)).toBe(0);
    expect(claims(done.out, "oneHolderPerName"), "a healthy prove says a rule is missing").toEqual([]);
    expect(claims(done.out, "oneNamePerPerson"), "a healthy prove says a rule is missing").toEqual([]);
    expect(done.out).toMatch(/^journey claim a handle ✔ \d+\/\d+ steps$/m);
    expect(done.seconds).toBeLessThan(BOUND_SECONDS);
    expect(await leftRunning(root), "prove left processes of this copy running").toEqual([]);
    nothingRunning(root);
  });
});

describe("36: a handler importing a rule its invariants.ts does not export fails fast and says which", () => {
  const judge = async (root: string, ended: Ended, rule: Rule = EXPORT) => {
    expect(await leftRunning(root), "prove left processes of this copy running").toEqual([]);
    expect(problems(ended, rule), `prove did not fail fast and say why; it printed ${JSON.stringify(ended.out.slice(-500))}`).toEqual([]);
  };

  it("a whole prove with oneHolderPerName removed exits non-zero within 60 s and names the export and a file", async () => {
    const root = broken("oneHolderPerName");
    await judge(root, await proveOnce(root));
  });

  it("the same with `--only 'claim a handle'`: the world cannot start either", async () => {
    const root = broken("oneHolderPerName");
    await judge(root, await proveOnce(root, "--only", "claim a handle"));
  });

  it("a whole prove with oneNamePerPerson removed (a rule only link.add imports): the same, naming that export, not the first", async () => {
    const root = broken("oneNamePerPerson");
    await judge(root, await proveOnce(root), "oneNamePerPerson");
  });
});
